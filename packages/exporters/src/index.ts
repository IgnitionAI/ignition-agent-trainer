import type { ExperimentResult, Metadata, VariantSummary } from "@ignitionai/core";

export interface ExperimentResultExportOptions {
  generatedAt?: string | Date;
  recommendation?: ExportRecommendation | null;
  metadata?: Metadata;
}

export interface ExportRecommendationAlternative {
  variant: string;
  score: number;
  reason?: string;
  metadata?: Metadata;
}

export interface ExportRecommendation {
  winner: string;
  score: number;
  summary?: string;
  reasons?: string[];
  tradeoffs?: string[];
  confidence?: string;
  alternatives?: ExportRecommendationAlternative[];
  metadata?: Metadata;
}

export interface ExperimentSummaryExport {
  name: string;
  startedAt: string;
  endedAt: string;
  metadata?: Metadata;
}

export interface DatasetSummaryExport {
  size: number;
  caseResultCount: number;
  failedCaseCount: number;
}

export interface VariantExport {
  variantId: string;
  name: string;
  score: number;
  totalCases: number;
  failedCases: number;
  rewardAverages: Record<string, number>;
  averageLatencyMs?: number;
  totalCostUsd?: number;
}

export interface LeaderboardRowExport {
  rank: number;
  variantId: string;
  name: string;
  score: number;
  totalCases: number;
  failedCases: number;
  averageLatencyMs?: number;
  totalCostUsd?: number;
}

export interface RewardAverageExport {
  variantId: string;
  variantName: string;
  score: number;
}

export interface RewardSummaryExport {
  name: string;
  averages: RewardAverageExport[];
}

export interface ExperimentResultExport {
  schemaVersion: "ignition.experiment-report.v1";
  generatedAt: string;
  experiment: ExperimentSummaryExport;
  dataset: DatasetSummaryExport;
  variants: VariantExport[];
  leaderboard: LeaderboardRowExport[];
  rewardSummaries: RewardSummaryExport[];
  recommendation?: ExportRecommendation;
  metadata?: Metadata;
}

export function exportExperimentResult(
  result: ExperimentResult,
  options: ExperimentResultExportOptions = {},
): ExperimentResultExport {
  const exportResult: ExperimentResultExport = {
    schemaVersion: "ignition.experiment-report.v1",
    generatedAt: normalizeTimestamp(options.generatedAt),
    experiment: {
      name: result.name,
      startedAt: result.startedAt,
      endedAt: result.endedAt,
      ...(result.metadata !== undefined ? { metadata: result.metadata } : {}),
    },
    dataset: {
      size: datasetSize(result),
      caseResultCount: result.cases.length,
      failedCaseCount: result.failedCases.length,
    },
    variants: result.leaderboard.map(toVariantExport),
    leaderboard: result.leaderboard.map(toLeaderboardRow),
    rewardSummaries: rewardSummaries(result.leaderboard),
  };

  if (options.recommendation != null) exportResult.recommendation = options.recommendation;
  if (options.metadata !== undefined) exportResult.metadata = options.metadata;
  return exportResult;
}

export function toJsonReport(
  result: ExperimentResult,
  options: ExperimentResultExportOptions = {},
): string {
  return `${JSON.stringify(exportExperimentResult(result, options), null, 2)}\n`;
}

export function toMarkdownReport(
  result: ExperimentResult,
  options: ExperimentResultExportOptions = {},
): string {
  const report = exportExperimentResult(result, options);
  const sections = [
    `# Experiment report: ${report.experiment.name}`,
    [
      `Generated: ${report.generatedAt}`,
      `Started: ${report.experiment.startedAt}`,
      `Ended: ${report.experiment.endedAt}`,
      `Dataset size: ${report.dataset.size}`,
      `Variants: ${report.variants.length}`,
      `Failed cases: ${report.dataset.failedCaseCount}`,
    ].join("\n"),
    leaderboardMarkdown(report.leaderboard),
    rewardSummariesMarkdown(report.rewardSummaries),
  ];

  if (report.recommendation !== undefined) {
    sections.push(recommendationMarkdown(report.recommendation));
  }

  return `${sections.join("\n\n")}\n`;
}

function normalizeTimestamp(value: string | Date | undefined): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date().toISOString();
}

function datasetSize(result: ExperimentResult): number {
  const uniqueCaseIds = new Set(result.cases.map((caseResult) => caseResult.caseId));
  if (uniqueCaseIds.size > 0) return uniqueCaseIds.size;
  return Math.max(0, ...result.leaderboard.map((variant) => variant.totalCases));
}

function toVariantExport(variant: VariantSummary): VariantExport {
  return {
    variantId: variant.variantId,
    name: variant.name,
    score: variant.score,
    totalCases: variant.totalCases,
    failedCases: variant.failedCases,
    rewardAverages: { ...variant.rewardAverages },
    ...(variant.averageLatencyMs !== undefined
      ? { averageLatencyMs: variant.averageLatencyMs }
      : {}),
    ...(variant.totalCostUsd !== undefined ? { totalCostUsd: variant.totalCostUsd } : {}),
  };
}

function toLeaderboardRow(variant: VariantSummary, index: number): LeaderboardRowExport {
  return {
    rank: index + 1,
    variantId: variant.variantId,
    name: variant.name,
    score: variant.score,
    totalCases: variant.totalCases,
    failedCases: variant.failedCases,
    ...(variant.averageLatencyMs !== undefined
      ? { averageLatencyMs: variant.averageLatencyMs }
      : {}),
    ...(variant.totalCostUsd !== undefined ? { totalCostUsd: variant.totalCostUsd } : {}),
  };
}

function rewardSummaries(leaderboard: VariantSummary[]): RewardSummaryExport[] {
  const rewardNames = Array.from(
    new Set(leaderboard.flatMap((variant) => Object.keys(variant.rewardAverages))),
  ).sort((a, b) => a.localeCompare(b));

  return rewardNames.map((name) => ({
    name,
    averages: leaderboard
      .filter((variant) => variant.rewardAverages[name] !== undefined)
      .map((variant) => ({
        variantId: variant.variantId,
        variantName: variant.name,
        score: variant.rewardAverages[name] ?? 0,
      })),
  }));
}

function leaderboardMarkdown(rows: LeaderboardRowExport[]): string {
  if (rows.length === 0) return "## Leaderboard\n\nNo variants were reported.";

  const table = rows
    .map(
      (row) =>
        `| ${row.rank} | ${markdownCell(row.name)} | ${formatScore(row.score)} | ${row.totalCases} | ${row.failedCases} | ${formatMs(
          row.averageLatencyMs,
        )} | ${formatUsd(row.totalCostUsd)} |`,
    )
    .join("\n");

  return `## Leaderboard

| Rank | Variant | Score | Cases | Failed | Avg latency | Total cost |
|---:|---|---:|---:|---:|---:|---:|
${table}`;
}

function rewardSummariesMarkdown(summaries: RewardSummaryExport[]): string {
  if (summaries.length === 0) return "## Reward summaries\n\nNo reward summaries were reported.";

  const rows = summaries
    .map(
      (summary) =>
        `| ${markdownCell(summary.name)} | ${summary.averages
          .map((average) => `${markdownCell(average.variantName)}: ${formatScore(average.score)}`)
          .join("<br>")} |`,
    )
    .join("\n");

  return `## Reward summaries

| Reward | Variant averages |
|---|---|
${rows}`;
}

function recommendationMarkdown(recommendation: ExportRecommendation): string {
  const lines = [
    "## Recommendation",
    "",
    `Winner: ${recommendation.winner} (${formatScore(recommendation.score)})`,
  ];

  if (recommendation.summary !== undefined) lines.push("", recommendation.summary);
  if (recommendation.confidence !== undefined)
    lines.push("", `Confidence: ${recommendation.confidence}`);
  if (recommendation.reasons !== undefined && recommendation.reasons.length > 0) {
    lines.push("", "Reasons:", ...recommendation.reasons.map((reason) => `- ${reason}`));
  }
  if (recommendation.tradeoffs !== undefined && recommendation.tradeoffs.length > 0) {
    lines.push("", "Tradeoffs:", ...recommendation.tradeoffs.map((tradeoff) => `- ${tradeoff}`));
  }

  return lines.join("\n");
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function formatScore(value: number): string {
  return value.toFixed(3);
}

function formatMs(value: number | undefined): string {
  return value === undefined ? "n/a" : `${Math.round(value)}ms`;
}

function formatUsd(value: number | undefined): string {
  return value === undefined ? "n/a" : `$${value.toFixed(4)}`;
}
