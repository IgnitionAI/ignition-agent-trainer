import type { ExperimentResult, VariantSummary } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import {
  assertNoRegression,
  compareExperimentResults,
  RegressionGateError,
} from "./regression-gates";

describe("regression gates", () => {
  it("passes when the current result meets configured thresholds", () => {
    const baseline = createResult([
      variant({ id: "alpha", score: 0.9, latencyMs: 100, costUsd: 0.01 }),
      variant({ id: "beta", score: 0.8, latencyMs: 200, costUsd: 0.02 }),
    ]);
    const current = createResult([
      variant({ id: "alpha", score: 0.88, latencyMs: 120, costUsd: 0.011 }),
      variant({ id: "beta", score: 0.81, latencyMs: 190, costUsd: 0.019 }),
    ]);

    const comparison = assertNoRegression(current, baseline, {
      maxScoreDrop: 0.05,
      maxLatencyIncreaseMs: 50,
      maxCostIncreaseUsd: 0.005,
    });

    expect(comparison.passed).toBe(true);
    expect(comparison.failures).toEqual([]);
    expect(comparison.markdown).toContain("Result: pass");
  });

  it("fails when score drops beyond the allowed threshold", () => {
    const baseline = createResult([variant({ id: "alpha", score: 0.9 })]);
    const current = createResult([variant({ id: "alpha", score: 0.83 })]);

    const comparison = compareExperimentResults(current, baseline, { maxScoreDrop: 0.05 });

    expect(comparison.passed).toBe(false);
    expect(comparison.failures.map((failure) => failure.message)).toEqual([
      "Experiment leaderboard winner score dropped by 0.070, max allowed 0.050 (0.900 baseline -> 0.830 current).",
      "Variant alpha score dropped by 0.070, max allowed 0.050 (0.900 baseline -> 0.830 current).",
    ]);
    expect(comparison.markdown).toContain("## Failures");
    expect(() => assertNoRegression(current, baseline, { maxScoreDrop: 0.05 })).toThrow(
      RegressionGateError,
    );
  });

  it("fails when latency exceeds the allowed increase", () => {
    const baseline = createResult([variant({ id: "alpha", score: 0.9, latencyMs: 100 })]);
    const current = createResult([variant({ id: "alpha", score: 0.9, latencyMs: 175 })]);

    const comparison = compareExperimentResults(current, baseline, {
      maxLatencyIncreaseMs: 50,
    });

    expect(comparison.passed).toBe(false);
    expect(comparison.failures.map((failure) => failure.message)).toContain(
      "Variant alpha latency increased by 75ms, max allowed 50ms (100ms baseline -> 175ms current).",
    );
  });

  it("fails when cost exceeds the allowed increase", () => {
    const baseline = createResult([variant({ id: "alpha", score: 0.9, costUsd: 0.01 })]);
    const current = createResult([variant({ id: "alpha", score: 0.9, costUsd: 0.018 })]);

    const comparison = compareExperimentResults(current, baseline, {
      maxCostIncreaseUsd: 0.005,
    });

    expect(comparison.passed).toBe(false);
    expect(comparison.failures.map((failure) => failure.message)).toContain(
      "Variant alpha cost increased by $0.0080, max allowed $0.0050 ($0.0100 baseline -> $0.0180 current).",
    );
  });

  it("orders variant regression messages deterministically", () => {
    const baseline = createResult([
      variant({ id: "beta", score: 0.8 }),
      variant({ id: "alpha", score: 0.9 }),
    ]);
    const current = createResult([
      variant({ id: "beta", score: 0.7 }),
      variant({ id: "alpha", score: 0.8 }),
    ]);

    const comparison = compareExperimentResults(current, baseline, { maxScoreDrop: 0.01 });

    expect(
      comparison.failures
        .filter((failure) => failure.scope === "variant")
        .map((failure) => failure.message),
    ).toEqual([
      "Variant alpha score dropped by 0.100, max allowed 0.010 (0.900 baseline -> 0.800 current).",
      "Variant beta score dropped by 0.100, max allowed 0.010 (0.800 baseline -> 0.700 current).",
    ]);
  });
});

function createResult(leaderboard: VariantSummary[]): ExperimentResult {
  return {
    name: "regression-gate-test",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    leaderboard,
    cases: [],
    failedCases: [],
  };
}

function variant(input: {
  id: string;
  score: number;
  latencyMs?: number;
  costUsd?: number;
}): VariantSummary {
  const summary: VariantSummary = {
    variantId: input.id,
    name: input.id,
    score: input.score,
    totalCases: 3,
    failedCases: 0,
    rewardAverages: { quality: input.score },
  };

  if (input.latencyMs !== undefined) summary.averageLatencyMs = input.latencyMs;
  if (input.costUsd !== undefined) summary.totalCostUsd = input.costUsd;
  return summary;
}
