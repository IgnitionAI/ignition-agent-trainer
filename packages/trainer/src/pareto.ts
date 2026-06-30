import type { VariantSummary } from "@ignitionai/agent-trainer-core";

export interface ParetoOptions {
  minScore?: number;
  maxLatencyMs?: number;
  maxCostUsd?: number;
}

export function filterParetoCandidates(
  summaries: VariantSummary[],
  options: ParetoOptions = {},
): VariantSummary[] {
  return summaries.filter((summary) => {
    if (options.minScore !== undefined && summary.score < options.minScore) return false;
    if (
      options.maxLatencyMs !== undefined &&
      summary.averageLatencyMs !== undefined &&
      summary.averageLatencyMs > options.maxLatencyMs
    ) {
      return false;
    }
    if (
      options.maxCostUsd !== undefined &&
      summary.totalCostUsd !== undefined &&
      summary.totalCostUsd > options.maxCostUsd
    ) {
      return false;
    }
    return true;
  });
}
