import type { ExperimentResult, VariantSummary } from "@ignitionai/agent-trainer-core";

export type OptimizationObjective = "quality-first" | "cost-first" | "latency-first" | "balanced";

export interface RankedVariant {
  rank: number;
  variantId: string;
  name: string;
  objective: OptimizationObjective;
  objectiveScore: number;
  score: number;
  summary: VariantSummary;
  reason: string;
}

export interface NextExperimentSuggestion {
  objective: OptimizationObjective;
  summary: string;
  candidateVariantIds: string[];
  recommendations: string[];
}

interface RankingContext {
  minCostUsd: number;
  maxCostUsd: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

export function selectBestByObjective(
  input: ExperimentResult | VariantSummary[],
  objective: OptimizationObjective = "balanced",
): RankedVariant | null {
  return rankVariants(input, objective)[0] ?? null;
}

export function rankVariants(
  input: ExperimentResult | VariantSummary[],
  objective: OptimizationObjective = "balanced",
): RankedVariant[] {
  const variants = leaderboardFrom(input);
  const context = createRankingContext(variants);

  return variants
    .map((variant) => toRankedVariant(variant, objective, context))
    .sort(compareRankedVariants)
    .map((variant, index) => ({ ...variant, rank: index + 1 }));
}

export function suggestNextExperiment(
  input: ExperimentResult | VariantSummary[],
  objective: OptimizationObjective = "balanced",
): NextExperimentSuggestion | null {
  const ranking = rankVariants(input, objective);
  const winner = ranking[0];
  if (winner === undefined) return null;

  const runnerUp = ranking[1];
  const recommendations = [];
  if (runnerUp !== undefined) {
    const scoreGap = winner.score - runnerUp.score;
    if (scoreGap <= 0.05) {
      recommendations.push(
        `Re-run ${winner.name} and ${runnerUp.name} on a larger dataset because their quality gap is ${scoreGap.toFixed(
          3,
        )}.`,
      );
    }

    if (
      winner.summary.averageLatencyMs !== undefined &&
      runnerUp.summary.averageLatencyMs !== undefined &&
      winner.summary.averageLatencyMs > runnerUp.summary.averageLatencyMs
    ) {
      recommendations.push(
        `Test whether ${winner.name} can keep its quality while reducing latency toward ${runnerUp.name}.`,
      );
    }

    if (
      winner.summary.totalCostUsd !== undefined &&
      runnerUp.summary.totalCostUsd !== undefined &&
      winner.summary.totalCostUsd > runnerUp.summary.totalCostUsd
    ) {
      recommendations.push(
        `Test a cheaper configuration of ${winner.name} against ${runnerUp.name}.`,
      );
    }
  }

  if (winner.summary.averageLatencyMs === undefined || winner.summary.totalCostUsd === undefined) {
    recommendations.push(
      `Instrument cost and latency for ${winner.name} before making this objective production-critical.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(`Promote ${winner.name} as the current ${objective} baseline.`);
  }

  return {
    objective,
    summary: `Next experiment should start from ${winner.name} for the ${objective} objective.`,
    candidateVariantIds:
      runnerUp === undefined ? [winner.variantId] : [winner.variantId, runnerUp.variantId],
    recommendations,
  };
}

function leaderboardFrom(input: ExperimentResult | VariantSummary[]): VariantSummary[] {
  return Array.isArray(input) ? input : input.leaderboard;
}

function toRankedVariant(
  variant: VariantSummary,
  objective: OptimizationObjective,
  context: RankingContext,
): RankedVariant {
  return {
    rank: 0,
    variantId: variant.variantId,
    name: variant.name,
    objective,
    objectiveScore: objectiveScore(variant, objective, context),
    score: variant.score,
    summary: variant,
    reason: objectiveReason(variant, objective),
  };
}

function objectiveScore(
  variant: VariantSummary,
  objective: OptimizationObjective,
  context: RankingContext,
): number {
  const quality = variant.score;
  const costEfficiency = 1 - normalizedCost(variant, context);
  const latencyEfficiency = 1 - normalizedLatency(variant, context);
  const failurePenalty = failureRate(variant) * 0.2;

  if (objective === "quality-first") return quality - failurePenalty;
  if (objective === "cost-first") return costEfficiency * 0.6 + quality * 0.4 - failurePenalty;
  if (objective === "latency-first")
    return latencyEfficiency * 0.6 + quality * 0.4 - failurePenalty;
  return quality * 0.6 + costEfficiency * 0.2 + latencyEfficiency * 0.2 - failurePenalty;
}

function compareRankedVariants(a: RankedVariant, b: RankedVariant): number {
  return (
    b.objectiveScore - a.objectiveScore ||
    b.score - a.score ||
    a.summary.failedCases - b.summary.failedCases ||
    optionalNumber(a.summary.averageLatencyMs) - optionalNumber(b.summary.averageLatencyMs) ||
    optionalNumber(a.summary.totalCostUsd) - optionalNumber(b.summary.totalCostUsd) ||
    a.name.localeCompare(b.name) ||
    a.variantId.localeCompare(b.variantId)
  );
}

function createRankingContext(variants: VariantSummary[]): RankingContext {
  const costs = variants.map((variant) => variant.totalCostUsd);
  const latencies = variants.map((variant) => variant.averageLatencyMs);

  return {
    minCostUsd: minFinite(costs),
    maxCostUsd: maxFinite(costs),
    minLatencyMs: minFinite(latencies),
    maxLatencyMs: maxFinite(latencies),
  };
}

function normalizedCost(variant: VariantSummary, context: RankingContext): number {
  if (variant.totalCostUsd === undefined) return 1;
  if (context.maxCostUsd === context.minCostUsd) return 0;
  return clamp01(
    (variant.totalCostUsd - context.minCostUsd) / (context.maxCostUsd - context.minCostUsd),
  );
}

function normalizedLatency(variant: VariantSummary, context: RankingContext): number {
  if (variant.averageLatencyMs === undefined) return 1;
  if (context.maxLatencyMs === context.minLatencyMs) return 0;
  return clamp01(
    (variant.averageLatencyMs - context.minLatencyMs) /
      (context.maxLatencyMs - context.minLatencyMs),
  );
}

function failureRate(variant: VariantSummary): number {
  if (variant.totalCases === 0) return 0;
  return clamp01(variant.failedCases / variant.totalCases);
}

function objectiveReason(variant: VariantSummary, objective: OptimizationObjective): string {
  if (objective === "quality-first") {
    return `${variant.name} ranks by quality score first.`;
  }
  if (objective === "cost-first") {
    return variant.totalCostUsd === undefined
      ? `${variant.name} is missing cost data and is penalized for cost-first ranking.`
      : `${variant.name} ranks by low cost with quality as a secondary signal.`;
  }
  if (objective === "latency-first") {
    return variant.averageLatencyMs === undefined
      ? `${variant.name} is missing latency data and is penalized for latency-first ranking.`
      : `${variant.name} ranks by low latency with quality as a secondary signal.`;
  }
  return `${variant.name} balances quality, cost and latency.`;
}

function maxFinite(values: Array<number | undefined>): number {
  const finiteValues = values.filter((value): value is number => value !== undefined);
  return finiteValues.length === 0 ? 0 : Math.max(...finiteValues);
}

function minFinite(values: Array<number | undefined>): number {
  const finiteValues = values.filter((value): value is number => value !== undefined);
  return finiteValues.length === 0 ? 0 : Math.min(...finiteValues);
}

function optionalNumber(value: number | undefined): number {
  return value ?? Number.POSITIVE_INFINITY;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
