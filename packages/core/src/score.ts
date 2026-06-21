import type { MetricResult } from "./types";

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

export function weightedAverage(results: MetricResult[]): number {
  const totalWeight = results.reduce((sum, result) => sum + (result.weight ?? 1), 0);
  if (totalWeight === 0) return 0;

  const weighted = results.reduce(
    (sum, result) => sum + clampScore(result.score) * (result.weight ?? 1),
    0,
  );

  return clampScore(weighted / totalWeight);
}
