import type { ExperimentResult, VariantSummary } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import { explainTradeoffs, recommendVariant, selectBestVariant } from "./select-best";

describe("trainer recommendations", () => {
  it("selects the highest scoring variant", () => {
    const result = experiment([
      variant({ name: "direct-answer", score: 0.42 }),
      variant({ name: "rag-with-verification", score: 0.91 }),
      variant({ name: "rag-basic", score: 0.76 }),
    ]);

    expect(selectBestVariant(result)?.name).toBe("rag-with-verification");
  });

  it("returns null for an empty leaderboard", () => {
    const result = experiment([]);

    expect(selectBestVariant(result)).toBeNull();
    expect(recommendVariant(result)).toBeNull();
    expect(explainTradeoffs(result)).toBeNull();
  });

  it("handles tied scores deterministically", () => {
    const result = experiment([
      variant({ name: "beta", score: 0.8, averageLatencyMs: 500, totalCostUsd: 0.002 }),
      variant({ name: "alpha", score: 0.8, averageLatencyMs: 500, totalCostUsd: 0.002 }),
    ]);

    expect(selectBestVariant(result)?.name).toBe("alpha");
  });

  it("produces a recommendation with summary, reasons and tradeoffs", () => {
    const result = experiment([
      variant({
        name: "rag-with-verification",
        score: 0.92,
        averageLatencyMs: 1200,
        totalCostUsd: 0.004,
        rewardAverages: { answer_quality: 0.94 },
      }),
      variant({
        name: "rag-basic",
        score: 0.74,
        averageLatencyMs: 700,
        totalCostUsd: 0.002,
        rewardAverages: { answer_quality: 0.78 },
      }),
    ]);

    const recommendation = recommendVariant(result);

    expect(recommendation?.winner).toBe("rag-with-verification");
    expect(recommendation?.summary).toContain("rag-with-verification");
    expect(recommendation?.reasons.length).toBeGreaterThan(0);
    expect(recommendation?.tradeoffs.join(" ")).toContain("slower");
    expect(recommendation?.alternatives[0]?.variant).toBe("rag-basic");
  });

  it("uses low confidence when scores are too close", () => {
    const result = experiment([
      variant({ name: "rag-basic", score: 0.82, totalCases: 8 }),
      variant({ name: "direct-answer", score: 0.8, totalCases: 8 }),
    ]);

    expect(recommendVariant(result)?.confidence).toBe("low");
  });

  it("uses high confidence when the winner clearly dominates enough cases", () => {
    const result = experiment([
      variant({ name: "rag-with-verification", score: 0.95, totalCases: 8 }),
      variant({ name: "rag-basic", score: 0.68, totalCases: 8 }),
    ]);

    expect(recommendVariant(result)?.confidence).toBe("high");
  });

  it("uses medium confidence for a clear but small-dataset win", () => {
    const result = experiment([
      variant({ name: "rag-with-verification", score: 1, totalCases: 3 }),
      variant({ name: "rag-basic", score: 0.81, totalCases: 3 }),
    ]);

    expect(recommendVariant(result)?.confidence).toBe("medium");
  });
});

function experiment(leaderboard: VariantSummary[]): ExperimentResult {
  return {
    name: "test-experiment",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    leaderboard,
    cases: [],
    failedCases: [],
  };
}

function variant(input: Partial<VariantSummary> & { name: string; score: number }): VariantSummary {
  return {
    variantId: input.name,
    name: input.name,
    score: input.score,
    totalCases: input.totalCases ?? 3,
    averageLatencyMs: input.averageLatencyMs ?? 500,
    totalCostUsd: input.totalCostUsd ?? 0.001,
    rewardAverages: input.rewardAverages ?? { answer_quality: input.score },
    failedCases: input.failedCases ?? 0,
  };
}
