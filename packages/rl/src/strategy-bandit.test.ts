import type { ExperimentResult, VariantSummary } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import { ExperimentalBanditStrategySelector } from "./strategy-bandit";

describe("experimental bandit strategy selector", () => {
  it("selects the highest average reward arm with deterministic tie-breaking", () => {
    const selector = new ExperimentalBanditStrategySelector(
      [
        { id: "verify", strategy: { workflow: "rag-verify" } },
        { id: "simple", strategy: { workflow: "simple-rag" } },
      ],
      { epsilon: 0 },
    );

    expect(selector.select().id).toBe("simple");

    selector.update("verify", 0.95);
    selector.update("simple", 0.8);

    expect(selector.select().id).toBe("verify");
  });

  it("supports deterministic exploration with fixed random values", () => {
    const selector = new ExperimentalBanditStrategySelector(
      [
        { id: "simple", strategy: "simple-rag" },
        { id: "rerank", strategy: "rag-rerank" },
        { id: "verify", strategy: "rag-verify" },
      ],
      {
        epsilon: 1,
        random: sequence([0, 0.75]),
      },
    );

    expect(selector.select().id).toBe("verify");
  });

  it("updates reward statistics for fixed strategy arms", () => {
    const selector = new ExperimentalBanditStrategySelector(
      [{ id: "simple", name: "Simple RAG", strategy: "simple-rag" }],
      { epsilon: 0 },
    );

    expect(selector.update("simple", 0.6)).toMatchObject({
      id: "simple",
      pulls: 1,
      totalReward: 0.6,
      averageReward: 0.6,
    });
    expect(selector.update("simple", 0.8)).toMatchObject({
      id: "simple",
      pulls: 2,
      totalReward: 1.4,
      averageReward: 0.7,
    });
  });

  it("updates matching arms from observed experiment outcomes", () => {
    const selector = new ExperimentalBanditStrategySelector(
      [
        { id: "simple", strategy: "simple-rag" },
        { id: "verify", strategy: "rag-verify" },
      ],
      { epsilon: 0 },
    );

    const updated = selector.updateFromExperimentResult(
      experimentResult([
        variant("verify", 0.92),
        variant("untracked", 0.99),
        variant("simple", 0.75),
      ]),
    );

    expect(updated.map((state) => [state.id, state.averageReward])).toEqual([
      ["verify", 0.92],
      ["simple", 0.75],
    ]);
    expect(selector.select().id).toBe("verify");
  });

  it("supports custom reward extraction from experiment outcomes", () => {
    const selector = new ExperimentalBanditStrategySelector(
      [
        { id: "expensive", strategy: "expensive-workflow" },
        { id: "cheap", strategy: "cheap-workflow" },
      ],
      { epsilon: 0 },
    );

    selector.updateFromExperimentResult(
      experimentResult([variant("expensive", 0.95), variant("cheap", 0.8)]),
      {
        rewardFromVariant: (row) => 1 - (row.totalCostUsd ?? 0),
      },
    );

    expect(selector.select().id).toBe("cheap");
  });

  it("handles empty arms and invalid updates predictably", () => {
    const selector = new ExperimentalBanditStrategySelector([], { epsilon: 0 });

    expect(() => selector.select()).toThrow("Bandit strategy selector has no arms.");
    expect(() => selector.update("missing", 1)).toThrow("Unknown bandit strategy arm: missing");
    expect(
      () =>
        new ExperimentalBanditStrategySelector([
          { id: "duplicate", strategy: "a" },
          { id: "duplicate", strategy: "b" },
        ]),
    ).toThrow("Duplicate bandit strategy arm: duplicate");
  });
});

function sequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1];
    index += 1;
    return value ?? 0;
  };
}

function experimentResult(leaderboard: VariantSummary[]): ExperimentResult {
  return {
    name: "bandit-test",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    leaderboard,
    cases: [],
    failedCases: [],
  };
}

function variant(id: string, score: number): VariantSummary {
  return {
    variantId: id,
    name: id,
    score,
    totalCases: 1,
    failedCases: 0,
    rewardAverages: { quality: score },
    totalCostUsd: id === "cheap" ? 0.05 : 0.25,
  };
}
