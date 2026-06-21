import type { ExperimentReport, VariantSummary } from "@ignitionai/core";

export function selectBestVariant(report: ExperimentReport): VariantSummary | undefined {
  return report.leaderboard[0];
}

export function selectTopVariants(report: ExperimentReport, count: number): VariantSummary[] {
  return report.leaderboard.slice(0, count);
}
