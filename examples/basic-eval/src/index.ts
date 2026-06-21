import type { AgentVariant } from "@ignitionai/core";
import { createDataset } from "@ignitionai/core";
import { citationPresence, containsText, costPenalty, latencyPenalty, toolCallCountPenalty } from "@ignitionai/evals";
import { createExperiment, reportToMarkdown } from "@ignitionai/experiments";
import { selectBestVariant } from "@ignitionai/trainer";

const dataset = createDataset({
  name: "contract-risk-demo",
  description: "Tiny dataset used to prove the eval loop.",
  items: [
    {
      id: "case-001",
      input: "Find the termination clause and cite the source.",
      expected: {
        contains: ["termination", "notice"],
        citations: ["contract.pdf#p12"],
      },
    },
    {
      id: "case-002",
      input: "Find the payment delay clause and cite the source.",
      expected: {
        contains: ["payment", "delay"],
        citations: ["contract.pdf#p4"],
      },
    },
  ],
});

const simpleRag: AgentVariant = {
  id: "simple-rag",
  name: "Simple RAG",
  async run(item) {
    return {
      output: item.id === "case-001" ? "The contract mentions termination." : "The contract mentions payment.",
      trace: { steps: [{ type: "tool_call", name: "search", input: { topK: 5 } }] },
      usage: { latencyMs: 800, costUsd: 0.001 },
    };
  },
};

const verifiedRag: AgentVariant = {
  id: "verified-rag",
  name: "RAG + verify",
  async run(item) {
    const isTermination = item.id === "case-001";
    return {
      output: isTermination
        ? "The termination clause requires 30 days notice. [contract.pdf#p12]"
        : "The payment delay clause applies after 45 days. [contract.pdf#p4]",
      trace: {
        steps: [
          { type: "tool_call", name: "search", input: { topK: 12 } },
          { type: "tool_call", name: "rerank" },
          { type: "tool_call", name: "verify_citations" },
        ],
      },
      usage: { latencyMs: 1800, costUsd: 0.004 },
    };
  },
};

const experiment = createExperiment({
  name: "contracts-rag-strategy-comparison",
  dataset,
  variants: [simpleRag, verifiedRag],
  rewards: [
    containsText({ weight: 0.35 }),
    citationPresence({ weight: 0.35 }),
    toolCallCountPenalty({ maxToolCalls: 4, weight: 0.1 }),
    latencyPenalty({ maxLatencyMs: 3000, weight: 0.1 }),
    costPenalty({ maxCostUsd: 0.01, weight: 0.1 }),
  ],
});

const report = await experiment.run();
console.log(reportToMarkdown(report));
console.log("Best variant:", selectBestVariant(report));
