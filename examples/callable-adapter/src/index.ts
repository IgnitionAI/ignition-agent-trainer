import { recommendVariant } from "@ignitionai/agent-trainer";
import { createCallableAdapter } from "@ignitionai/agent-trainer-adapter-callable";
import { createDataset } from "@ignitionai/agent-trainer-core";
import {
  citationPresence,
  containsAll,
  costPenalty,
  latencyPenalty,
} from "@ignitionai/agent-trainer-evals";
import { createExperiment } from "@ignitionai/agent-trainer-experiments";

const dataset = createDataset([
  {
    id: "support-refund",
    input: "Can a customer get a refund after 14 days?",
    expected: {
      contains: ["refund", "14 days", "policy"],
      citations: ["support.md#refund-window"],
    },
  },
  {
    id: "support-escalation",
    input: "When should the support agent escalate an issue?",
    expected: {
      contains: ["escalate", "billing", "security"],
      citations: ["support.md#escalation"],
    },
  },
]);

const fastSupportAgent = createCallableAdapter({
  name: "fast-support-agent",
  run: async ({ input }) => ({
    output: `Quick answer for: ${input}. Check the support policy.`,
    metadata: {
      costUsd: 0.001,
    },
  }),
});

const groundedSupportAgent = createCallableAdapter({
  name: "grounded-support-agent",
  run: async ({ item }) => {
    if (item.id === "support-refund") {
      return {
        output:
          "The refund policy says customers can request a refund within 14 days. [support.md#refund-window]",
        trace: { steps: [{ type: "tool_call", name: "retrieve_support_policy" }] },
        metadata: {
          costUsd: 0.003,
        },
      };
    }

    return {
      output:
        "Escalate support issues involving billing disputes or security risk. [support.md#escalation]",
      trace: { steps: [{ type: "tool_call", name: "retrieve_support_policy" }] },
      metadata: {
        costUsd: 0.003,
      },
    };
  },
});

const result = await createExperiment({
  name: "callable-agent-test",
  dataset,
  variants: [
    {
      name: "fast-support-agent",
      adapter: fastSupportAgent,
    },
    {
      name: "grounded-support-agent",
      adapter: groundedSupportAgent,
    },
  ],
  rewards: [
    containsAll({ weight: 0.55 }),
    citationPresence({ weight: 0.25 }),
    latencyPenalty({ maxLatencyMs: 1000, weight: 0.1 }),
    costPenalty({ maxCostUsd: 0.01, weight: 0.1 }),
  ],
}).run();

const recommendation = recommendVariant(result);

console.log(`Experiment: ${result.name}`);
console.log(`Dataset items: ${dataset.items.length}`);
console.log("Leaderboard:");
for (const [index, row] of result.leaderboard.entries()) {
  console.log(`${index + 1}. ${row.name} - ${row.score.toFixed(2)}`);
}
console.log("");
console.log("Recommendation:");
if (recommendation === null) {
  console.log("No recommendation is available.");
} else {
  console.log(recommendation.summary);
  for (const reason of recommendation.reasons) {
    console.log(`- ${reason}`);
  }
}
