import { createDataset, createMockAdapter } from "@ignitionai/agent-trainer-core";
import { containsAll, costPenalty, latencyPenalty } from "@ignitionai/agent-trainer-evals";
import { createExperiment } from "@ignitionai/agent-trainer-experiments";

const dataset = createDataset([
  {
    id: "q1",
    input: "What is IgnitionRAG?",
    expected: {
      contains: ["RAG", "agents", "evaluation"],
    },
  },
]);

const experiment = createExperiment({
  name: "basic-agent-eval",
  dataset,
  variants: [
    {
      name: "agent-v1",
      adapter: createMockAdapter(() => ({
        output: "IgnitionRAG is a RAG platform for AI applications.",
        trace: {
          steps: [{ type: "message", role: "assistant", content: "Answered from memory." }],
        },
        usage: { latencyMs: 450, costUsd: 0.001 },
      })),
    },
    {
      name: "agent-v2",
      adapter: createMockAdapter(() => ({
        output:
          "IgnitionRAG combines RAG, agents and evaluation workflows so teams can improve production AI systems.",
        trace: {
          steps: [
            { type: "tool_call", name: "search_docs", input: { query: "IgnitionRAG" } },
            { type: "message", role: "assistant", content: "Answered with retrieved context." },
          ],
        },
        usage: { latencyMs: 900, costUsd: 0.003 },
      })),
    },
  ],
  rewards: [
    containsAll({ weight: 0.7 }),
    latencyPenalty({ maxLatencyMs: 1200, weight: 0.15 }),
    costPenalty({ maxCostUsd: 0.005, weight: 0.15 }),
  ],
  options: {
    concurrency: 2,
  },
});

const result = await experiment.run();

console.table(result.leaderboard);
