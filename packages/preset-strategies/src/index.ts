import type {
  AgentInput,
  AgentVariant,
  Metadata,
  RunContext,
  RunResult,
  UsageMetrics,
} from "@ignitionai/core";

export interface StrategyPresetVariantOptions {
  id?: string;
  name?: string;
  description?: string;
  config?: Metadata;
  metadata?: Metadata;
}

export interface StrategyPresetConfig {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  tools?: string[];
  usage?: UsageMetrics;
  metadata?: Metadata;
  createVariant?: (options?: StrategyPresetVariantOptions) => AgentVariant;
}

export interface StrategyPreset {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  tools: string[];
  usage: UsageMetrics;
  metadata?: Metadata;
  createVariant(options?: StrategyPresetVariantOptions): AgentVariant;
}

export interface StrategyRegistry {
  get(id: string): StrategyPreset | null;
  list(): StrategyPreset[];
}

export function defineStrategyPreset(config: StrategyPresetConfig): StrategyPreset {
  validateStrategyPresetConfig(config);

  const presetBase: Omit<StrategyPreset, "createVariant"> = {
    id: config.id,
    name: config.name,
    tags: [...(config.tags ?? [])],
    tools: [...(config.tools ?? [])],
    usage: { ...(config.usage ?? {}) },
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.metadata !== undefined ? { metadata: config.metadata } : {}),
  };

  return {
    ...presetBase,
    createVariant(options = {}) {
      return config.createVariant?.(options) ?? createMockVariant(presetBase, options);
    },
  };
}

export function createStrategyRegistry(
  presets: readonly StrategyPreset[] = builtInStrategyPresets,
): StrategyRegistry {
  const byId = new Map<string, StrategyPreset>();

  for (const preset of presets) {
    if (byId.has(preset.id)) throw new Error(`Duplicate strategy preset id: ${preset.id}`);
    byId.set(preset.id, preset);
  }

  return {
    get(id: string) {
      return byId.get(id) ?? null;
    },
    list() {
      return Array.from(byId.values());
    },
  };
}

export function getStrategyPreset(
  id: string,
  registry: StrategyRegistry = defaultStrategyRegistry,
): StrategyPreset | null {
  return registry.get(id);
}

export function listStrategyPresets(
  registry: StrategyRegistry = defaultStrategyRegistry,
): StrategyPreset[] {
  return registry.list();
}

export const builtInStrategyPresets: StrategyPreset[] = [
  defineStrategyPreset({
    id: "direct-answer",
    name: "Direct answer",
    description: "Answer from the base prompt without retrieval tools.",
    tags: ["baseline", "no-retrieval"],
    tools: [],
    usage: { latencyMs: 260, costUsd: 0.0006 },
  }),
  defineStrategyPreset({
    id: "rag-basic",
    name: "Basic RAG",
    description: "Retrieve context and answer with cited source snippets.",
    tags: ["rag", "retrieval"],
    tools: ["retrieve_context"],
    usage: { latencyMs: 720, costUsd: 0.002 },
  }),
  defineStrategyPreset({
    id: "rag-rerank",
    name: "RAG with reranking",
    description: "Retrieve context, rerank candidates and answer with stronger grounding.",
    tags: ["rag", "retrieval", "rerank"],
    tools: ["retrieve_context", "rerank_context"],
    usage: { latencyMs: 980, costUsd: 0.003 },
  }),
  defineStrategyPreset({
    id: "rag-with-verification",
    name: "RAG with verification",
    description: "Retrieve context and verify grounding before returning the final answer.",
    tags: ["rag", "retrieval", "verification"],
    tools: ["retrieve_context", "verify_grounding"],
    usage: { latencyMs: 1250, costUsd: 0.004 },
  }),
];

const defaultStrategyRegistry = createStrategyRegistry(builtInStrategyPresets);

function validateStrategyPresetConfig(config: StrategyPresetConfig): void {
  if (!config.id.trim()) throw new Error("Strategy preset id is required.");
  if (!config.name.trim()) throw new Error("Strategy preset name is required.");

  for (const tool of config.tools ?? []) {
    if (!tool.trim()) throw new Error(`Strategy preset ${config.id} has an empty tool name.`);
  }
}

function createMockVariant(
  preset: Omit<StrategyPreset, "createVariant">,
  options: StrategyPresetVariantOptions,
): AgentVariant {
  const description = options.description ?? preset.description;

  return {
    id: options.id ?? preset.id,
    name: options.name ?? preset.id,
    ...(description !== undefined ? { description } : {}),
    config: {
      strategyPresetId: preset.id,
      tools: preset.tools,
      ...(preset.metadata !== undefined ? { presetMetadata: preset.metadata } : {}),
      ...(options.config !== undefined ? options.config : {}),
    },
    adapter: {
      name: preset.id,
      run(input, context) {
        return createMockRunResult(preset, input, context, options.metadata);
      },
    },
  };
}

function createMockRunResult(
  preset: Omit<StrategyPreset, "createVariant">,
  input: AgentInput,
  context: RunContext,
  metadata: Metadata | undefined,
): RunResult {
  return {
    output: mockedStrategyOutput(preset, input),
    trace: {
      steps: [
        {
          type: "message",
          role: "user",
          content: input.input,
        },
        ...preset.tools.map((tool) => ({
          type: "tool_call" as const,
          name: tool,
          input: { caseId: context.caseId ?? input.id },
        })),
        {
          type: "message",
          role: "assistant",
          content: `Final answer generated by strategy preset ${preset.id}.`,
        },
      ],
    },
    usage: { ...preset.usage },
    metadata: {
      strategyPresetId: preset.id,
      ...(metadata !== undefined ? metadata : {}),
    },
  };
}

function mockedStrategyOutput(
  preset: Omit<StrategyPreset, "createVariant">,
  input: AgentInput,
): string {
  const terms = input.expected?.contains ?? [];
  const citations = input.expected?.citations ?? [];
  const fallback = input.input;

  if (preset.id === "direct-answer") {
    return terms[0] ?? fallback;
  }

  const answerTerms = terms.length > 0 ? terms.join(", ") : fallback;
  if (preset.id === "rag-basic") {
    return formatAnswer(answerTerms, citations.slice(0, 1));
  }

  if (preset.id === "rag-rerank") {
    return formatAnswer(answerTerms, citations.slice(0, Math.max(1, citations.length)));
  }

  return `${formatAnswer(answerTerms, citations)} Verified against retrieved context.`;
}

function formatAnswer(answer: string, citations: string[]): string {
  const citationText = citations.map((citation) => `[${citation}]`).join(" ");
  return citationText.length === 0 ? answer : `${answer} ${citationText}`;
}
