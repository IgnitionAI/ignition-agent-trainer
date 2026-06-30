import type { DatasetItem, RunResult } from "@ignitionai/agent-trainer-core";
import { describe, expect, it } from "vitest";
import { agenticRagPreset, citationQualityPreset, ragQualityPreset } from "./index";

const item: DatasetItem = {
  id: "rag-case",
  input: "Explain the retrieval answer.",
  expected: {
    contains: ["retrieval", "grounded"],
    citations: ["docs.md#rag"],
  },
};

const run: RunResult = {
  output: "The retrieval answer is grounded in the provided source. [docs.md#rag]",
  trace: {
    steps: [
      { type: "tool_call", name: "retrieve_context" },
      { type: "tool_call", name: "verify_grounding" },
    ],
  },
  usage: {
    latencyMs: 1200,
    costUsd: 0.004,
  },
};

describe("RAG presets", () => {
  it("composes required text and citation rewards into a citation quality reward", async () => {
    const [qualityReward] = citationQualityPreset();
    if (qualityReward === undefined) throw new Error("Expected quality reward.");

    const result = await qualityReward.evaluate(run, item, {});

    expect(qualityReward.name).toBe("citation_quality");
    expect(result.score).toBe(1);
    expect(result.metadata?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "rag_required_terms", score: 1 }),
        expect.objectContaining({ name: "rag_citations", score: 1 }),
      ]),
    );
  });

  it("returns quality, latency and cost rewards for RAG evaluation", async () => {
    const rewards = ragQualityPreset({ maxLatencyMs: 600, maxCostUsd: 0.002 });

    expect(rewards.map((reward) => reward.name)).toEqual([
      "rag_quality",
      "rag_latency",
      "rag_cost",
    ]);

    const results = await Promise.all(rewards.map((reward) => reward.evaluate(run, item, {})));
    expect(results.map((result) => result.score)).toEqual([1, 0.5, 0.5]);
  });

  it("adds tool-call efficiency for agentic RAG evaluation", async () => {
    const rewards = agenticRagPreset({ maxToolCalls: 1 });
    const toolReward = rewards.find((reward) => reward.name === "agentic_rag_tool_efficiency");
    if (toolReward === undefined) throw new Error("Expected tool efficiency reward.");

    const result = await toolReward.evaluate(run, item, {});

    expect(rewards.map((reward) => reward.name)).toEqual([
      "rag_quality",
      "rag_latency",
      "rag_cost",
      "agentic_rag_tool_efficiency",
    ]);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("2 tool calls exceeds 1");
  });
});
