/**
 * This example shows the product insight:
 * the model is unchanged; only context assembly changes.
 */
import type { AgentVariant } from "@ignitionai/core";
import { createDataset } from "@ignitionai/core";
import { citationPresence, containsText, costPenalty } from "@ignitionai/evals";
import { createExperiment, reportToMarkdown } from "@ignitionai/experiments";

const dataset = createDataset({
  name: "context-engineering-demo",
  items: [
    {
      id: "q1",
      input: "What is the refund policy?",
      expected: { contains: ["refund", "14 days"], citations: ["policy.md#refund"] },
    },
  ],
});

function ragVariant(config: { topK: number; rerank: boolean; verify: boolean }): AgentVariant {
  return {
    id: `topk-${config.topK}-rerank-${config.rerank}-verify-${config.verify}`,
    name: `topK=${config.topK}, rerank=${config.rerank}, verify=${config.verify}`,
    config,
    async run() {
      const qualityBoost = config.rerank && config.verify;
      return {
        output: qualityBoost
          ? "The refund policy allows refunds within 14 days. [policy.md#refund]"
          : "Refunds are possible according to the policy.",
        trace: {
          steps: [
            { type: "tool_call", name: "search", input: { topK: config.topK } },
            ...(config.rerank ? [{ type: "tool_call" as const, name: "rerank" }] : []),
            ...(config.verify ? [{ type: "tool_call" as const, name: "verify" }] : []),
          ],
        },
        usage: { costUsd: 0.001 + config.topK * 0.0001 + (config.rerank ? 0.001 : 0) + (config.verify ? 0.001 : 0) },
      };
    },
  };
}

const report = await createExperiment({
  name: "context-config-search",
  dataset,
  variants: [
    ragVariant({ topK: 5, rerank: false, verify: false }),
    ragVariant({ topK: 10, rerank: true, verify: false }),
    ragVariant({ topK: 15, rerank: true, verify: true }),
  ],
  rewards: [containsText({ weight: 0.4 }), citationPresence({ weight: 0.4 }), costPenalty({ maxCostUsd: 0.01, weight: 0.2 })],
}).run();

console.log(reportToMarkdown(report));
