import { langChainAdapter } from "@ignitionai/agent-trainer-adapter-langchain";
import { langGraphAdapter } from "@ignitionai/agent-trainer-adapter-langgraph";
import { mastraAdapter } from "@ignitionai/agent-trainer-adapter-mastra";
import { vercelAiAdapter } from "@ignitionai/agent-trainer-adapter-vercel-ai";
import {
  createDataset,
  type DatasetItem,
  type RunResult,
  type UsageMetrics,
} from "@ignitionai/agent-trainer-core";
import { containsAll, costPenalty, latencyPenalty } from "@ignitionai/agent-trainer-evals";
import { createExperiment } from "@ignitionai/agent-trainer-experiments";

type FrameworkName = "langchain" | "langgraph" | "mastra" | "vercel-ai";

interface MockFrameworkResult {
  text: string;
  retrieved: string;
  model: string;
  mode: string;
  usage: UsageMetrics;
  metadata: {
    framework: FrameworkName;
    mockProvider: true;
    model: string;
  };
}

export const dataset = createDataset({
  name: "ecosystem-adapter-observability",
  description: "Checks that ecosystem adapters preserve output, trace, usage and metadata.",
  items: [
    {
      id: "adapter-observability",
      input: "Show that adapter results keep trace, usage and metadata.",
      expected: {
        contains: ["trace", "usage", "metadata"],
      },
    },
    {
      id: "adapter-portability",
      input: "Show that a mocked provider shape can run through createExperiment.",
      expected: {
        contains: ["createExperiment", "mocked", "provider"],
      },
    },
  ],
});

export const variants = [
  langChainAdapter({
    id: "langchain-runnable",
    name: "LangChain Runnable",
    runnable: {
      invoke(input) {
        return frameworkResult("langchain", toCaseId(input), 420, 0.0014);
      },
    },
    mapInput: adapterInput,
    mapOutput: (raw, input) => mapMockFrameworkResult("langchain", raw, input.item.id),
    metadata: { adapterFamily: "langchain" },
  }),
  langGraphAdapter({
    id: "langgraph-graph",
    name: "LangGraph Graph",
    graph: {
      invoke(input) {
        return frameworkResult("langgraph", toCaseId(input), 510, 0.0018);
      },
    },
    mapInput: adapterInput,
    mapOutput: (raw, input) => mapMockFrameworkResult("langgraph", raw, input.item.id),
    metadata: { adapterFamily: "langgraph" },
  }),
  mastraAdapter({
    id: "mastra-agent",
    name: "Mastra Agent",
    agent: {
      generate(input) {
        return frameworkResult("mastra", toCaseId(input), 470, 0.0016);
      },
    },
    mapInput: adapterInput,
    mapOutput: (raw, input) => mapMockFrameworkResult("mastra", raw, input.item.id),
    metadata: { adapterFamily: "mastra" },
  }),
  vercelAiAdapter({
    id: "vercel-ai-generate",
    name: "Vercel AI Generate",
    generate(input) {
      const caseId = typeof input.caseId === "string" ? input.caseId : "adapter-observability";
      const result = frameworkResult("vercel-ai", caseId, 390, 0.0012);
      return {
        text: result.text,
        usage: result.usage,
        metadata: result.metadata,
      };
    },
    mapInput: (item) => ({
      prompt: item.input,
      caseId: item.id,
      model: "mock-vercel-ai-model",
    }),
    metadata: { adapterFamily: "vercel-ai" },
  }),
];

export function createEcosystemAdapterExperiment() {
  return createExperiment({
    name: "ecosystem-adapter-comparison",
    dataset,
    variants,
    rewards: [
      containsAll({ weight: 0.7 }),
      latencyPenalty({ maxLatencyMs: 1000, weight: 0.15 }),
      costPenalty({ maxCostUsd: 0.005, weight: 0.15 }),
    ],
    options: {
      concurrency: 4,
    },
    metadata: {
      providerCalls: "mocked",
    },
  });
}

export async function runEcosystemAdapterExperiment() {
  return createEcosystemAdapterExperiment().run();
}

function adapterInput(item: DatasetItem): { prompt: string; caseId: string } {
  return {
    prompt: item.input,
    caseId: item.id,
  };
}

function mapMockFrameworkResult(framework: FrameworkName, raw: unknown, caseId: string): RunResult {
  const result = assertMockFrameworkResult(raw, framework);
  return {
    output: result.text,
    trace: {
      steps: [
        {
          type: "tool_call",
          name: `${framework}.mock_retrieve`,
          input: { caseId },
          output: result.retrieved,
        },
        {
          type: "custom",
          name: `${framework}.mock_response`,
          payload: {
            model: result.model,
            mode: result.mode,
          },
        },
      ],
    },
    usage: result.usage,
    metadata: {
      framework,
      model: result.model,
      mode: result.mode,
    },
  };
}

function frameworkResult(
  framework: FrameworkName,
  caseId: string,
  latencyMs: number,
  costUsd: number,
): MockFrameworkResult {
  const model = `mock-${framework}-model`;
  return {
    text: frameworkAnswer(framework, caseId),
    retrieved: `${framework}-docs#${caseId}`,
    model,
    mode: "deterministic-example",
    usage: {
      inputTokens: 120,
      outputTokens: 42,
      totalTokens: 162,
      latencyMs,
      costUsd,
    },
    metadata: {
      framework,
      mockProvider: true,
      model,
    },
  };
}

function frameworkAnswer(framework: FrameworkName, caseId: string): string {
  if (caseId === "adapter-portability") {
    return `${framework} uses a mocked provider shape that plugs into createExperiment without network calls.`;
  }

  return `${framework} preserves trace, usage and metadata from the adapter result.`;
}

function toCaseId(input: unknown): string {
  if (isRecord(input) && typeof input.caseId === "string") return input.caseId;
  return "adapter-observability";
}

function assertMockFrameworkResult(raw: unknown, framework: FrameworkName): MockFrameworkResult {
  if (!isRecord(raw) || typeof raw.text !== "string" || !isRecord(raw.usage)) {
    throw new Error(`Invalid mocked ${framework} result.`);
  }

  return raw as unknown as MockFrameworkResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
