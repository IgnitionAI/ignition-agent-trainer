import type { VariantSummary } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import { rankVariants, selectBestByObjective, suggestNextExperiment } from "./optimization";

describe("optimization primitives", () => {
  it("ranks variants for quality-first objective", () => {
    const ranking = rankVariants(
      [
        variant({ id: "cheap", score: 0.75, costUsd: 0.001, latencyMs: 100 }),
        variant({ id: "quality", score: 0.95, costUsd: 0.02, latencyMs: 400 }),
      ],
      "quality-first",
    );

    expect(ranking.map((row) => row.variantId)).toEqual(["quality", "cheap"]);
    expect(
      selectBestByObjective(
        ranking.map((row) => row.summary),
        "quality-first",
      )?.variantId,
    ).toBe("quality");
  });

  it("ranks variants for cost-first objective", () => {
    const ranking = rankVariants(
      [
        variant({ id: "expensive", score: 0.95, costUsd: 0.02, latencyMs: 100 }),
        variant({ id: "cheap", score: 0.8, costUsd: 0.001, latencyMs: 200 }),
      ],
      "cost-first",
    );

    expect(ranking.map((row) => row.variantId)).toEqual(["cheap", "expensive"]);
  });

  it("ranks variants for latency-first objective", () => {
    const ranking = rankVariants(
      [
        variant({ id: "slow", score: 0.95, costUsd: 0.001, latencyMs: 900 }),
        variant({ id: "fast", score: 0.8, costUsd: 0.002, latencyMs: 80 }),
      ],
      "latency-first",
    );

    expect(ranking.map((row) => row.variantId)).toEqual(["fast", "slow"]);
  });

  it("ranks variants for balanced objective", () => {
    const ranking = rankVariants(
      [
        variant({ id: "quality-expensive", score: 0.98, costUsd: 0.1, latencyMs: 900 }),
        variant({ id: "balanced", score: 0.9, costUsd: 0.02, latencyMs: 200 }),
        variant({ id: "cheap-weak", score: 0.6, costUsd: 0.001, latencyMs: 100 }),
      ],
      "balanced",
    );

    expect(ranking.map((row) => row.variantId)).toEqual([
      "balanced",
      "cheap-weak",
      "quality-expensive",
    ]);
  });

  it("uses deterministic tie-breaking", () => {
    const ranking = rankVariants(
      [
        variant({ id: "b-id", name: "Same", score: 0.9, costUsd: 0.01, latencyMs: 100 }),
        variant({ id: "a-id", name: "Same", score: 0.9, costUsd: 0.01, latencyMs: 100 }),
      ],
      "quality-first",
    );

    expect(ranking.map((row) => row.variantId)).toEqual(["a-id", "b-id"]);
  });

  it("penalizes missing cost and latency for those objectives", () => {
    const variants = [
      variant({ id: "missing", score: 0.95 }),
      variant({ id: "measured", score: 0.8, costUsd: 0.01, latencyMs: 100 }),
    ];

    expect(rankVariants(variants, "cost-first")[0]?.variantId).toBe("measured");
    expect(rankVariants(variants, "latency-first")[0]?.variantId).toBe("measured");
  });

  it("suggests a next experiment from common tradeoffs", () => {
    const suggestion = suggestNextExperiment(
      [
        variant({ id: "verified", score: 0.91, costUsd: 0.02, latencyMs: 800 }),
        variant({ id: "basic", score: 0.89, costUsd: 0.01, latencyMs: 300 }),
      ],
      "quality-first",
    );

    expect(suggestion).toMatchObject({
      objective: "quality-first",
      candidateVariantIds: ["verified", "basic"],
    });
    expect(suggestion?.recommendations).toEqual([
      "Re-run verified and basic on a larger dataset because their quality gap is 0.020.",
      "Test whether verified can keep its quality while reducing latency toward basic.",
      "Test a cheaper configuration of verified against basic.",
    ]);
  });
});

function variant(input: {
  id: string;
  name?: string;
  score: number;
  costUsd?: number;
  latencyMs?: number;
}): VariantSummary {
  const summary: VariantSummary = {
    variantId: input.id,
    name: input.name ?? input.id,
    score: input.score,
    totalCases: 3,
    failedCases: 0,
    rewardAverages: { quality: input.score },
  };
  if (input.costUsd !== undefined) summary.totalCostUsd = input.costUsd;
  if (input.latencyMs !== undefined) summary.averageLatencyMs = input.latencyMs;
  return summary;
}
