import type { ExperimentResult, VariantSummary } from "@ignitionai/core";

export type RecommendationConfidence = "low" | "medium" | "high";

export interface VariantAlternative {
  variant: string;
  score: number;
  reason: string;
}

export interface VariantRecommendation {
  winner: string;
  score: number;
  summary: string;
  reasons: string[];
  tradeoffs: string[];
  confidence: RecommendationConfidence;
  alternatives: VariantAlternative[];
  metadata?: Record<string, unknown>;
}

export interface RecommendationOptions {
  maxAlternatives?: number;
  lowConfidenceScoreGap?: number;
  mediumConfidenceScoreGap?: number;
  highConfidenceScoreGap?: number;
  highConfidenceMinCases?: number;
}

export interface TradeoffExplanation {
  winner: string;
  reasons: string[];
  tradeoffs: string[];
  alternatives: VariantAlternative[];
  scoreGap?: number;
  metadata?: Record<string, unknown>;
}

const defaultOptions = {
  maxAlternatives: 2,
  lowConfidenceScoreGap: 0.05,
  mediumConfidenceScoreGap: 0.1,
  highConfidenceScoreGap: 0.2,
  highConfidenceMinCases: 5,
};

export function selectBestVariant(result: ExperimentResult): VariantSummary | null {
  return sortLeaderboard(result.leaderboard)[0] ?? null;
}

export function selectTopVariants(result: ExperimentResult, count: number): VariantSummary[] {
  return sortLeaderboard(result.leaderboard).slice(0, count);
}

export function recommendVariant(
  result: ExperimentResult,
  options: RecommendationOptions = {},
): VariantRecommendation | null {
  const winner = selectBestVariant(result);
  if (winner === null) return null;

  const resolvedOptions = { ...defaultOptions, ...options };
  const explanation = explainTradeoffs(result, resolvedOptions);
  if (explanation === null) return null;

  return {
    winner: winner.name,
    score: winner.score,
    summary: `Use ${winner.name} because it achieved the highest overall score.`,
    reasons: explanation.reasons,
    tradeoffs: explanation.tradeoffs,
    confidence: inferConfidence(result, explanation.scoreGap, resolvedOptions),
    alternatives: explanation.alternatives,
    metadata: {
      variantId: winner.variantId,
      totalCases: winner.totalCases,
      scoreGap: explanation.scoreGap,
    },
  };
}

export function explainTradeoffs(
  result: ExperimentResult,
  options: RecommendationOptions = {},
): TradeoffExplanation | null {
  const resolvedOptions = { ...defaultOptions, ...options };
  const leaderboard = sortLeaderboard(result.leaderboard);
  const winner = leaderboard[0];
  if (winner === undefined) return null;

  const runnerUp = leaderboard[1];
  const scoreGap = runnerUp === undefined ? undefined : winner.score - runnerUp.score;
  const reasons = buildReasons(winner, runnerUp, scoreGap);
  const tradeoffs = buildTradeoffs(winner, runnerUp);
  const alternatives = leaderboard
    .slice(1, 1 + resolvedOptions.maxAlternatives)
    .map((variant) => toAlternative(winner, variant));

  return {
    winner: winner.name,
    reasons,
    tradeoffs,
    alternatives,
    ...(scoreGap !== undefined ? { scoreGap } : {}),
    metadata: {
      variantId: winner.variantId,
      totalCases: winner.totalCases,
    },
  };
}

function sortLeaderboard(leaderboard: VariantSummary[]): VariantSummary[] {
  return leaderboard.slice().sort(compareVariants);
}

function compareVariants(a: VariantSummary, b: VariantSummary): number {
  return (
    b.score - a.score ||
    a.failedCases - b.failedCases ||
    optionalNumber(a.averageLatencyMs) - optionalNumber(b.averageLatencyMs) ||
    optionalNumber(a.totalCostUsd) - optionalNumber(b.totalCostUsd) ||
    a.name.localeCompare(b.name) ||
    a.variantId.localeCompare(b.variantId)
  );
}

function buildReasons(
  winner: VariantSummary,
  runnerUp: VariantSummary | undefined,
  scoreGap: number | undefined,
): string[] {
  const reasons = [`${winner.name} ranked first on the experiment leaderboard.`];

  if (runnerUp !== undefined && scoreGap !== undefined) {
    reasons.push(`${winner.name} beat ${runnerUp.name} by ${scoreGap.toFixed(3)} score points.`);
  }

  const strongestReward = Object.entries(winner.rewardAverages).sort((a, b) => b[1] - a[1])[0];
  if (strongestReward !== undefined) {
    reasons.push(
      `${winner.name} scored ${strongestReward[1].toFixed(2)} on ${strongestReward[0]}.`,
    );
  }

  if (winner.failedCases === 0) {
    reasons.push(`${winner.name} completed all evaluated cases without run failures.`);
  }

  return reasons;
}

function buildTradeoffs(winner: VariantSummary, runnerUp: VariantSummary | undefined): string[] {
  const tradeoffs = [];

  if (winner.failedCases > 0) {
    tradeoffs.push(`${winner.name} still has ${winner.failedCases} failed case(s).`);
  }

  if (runnerUp?.averageLatencyMs !== undefined && winner.averageLatencyMs !== undefined) {
    const latencyDelta = winner.averageLatencyMs - runnerUp.averageLatencyMs;
    if (latencyDelta > 0) {
      tradeoffs.push(
        `${winner.name} is ${Math.round(latencyDelta)}ms slower on average than ${runnerUp.name}.`,
      );
    } else if (latencyDelta < 0) {
      tradeoffs.push(
        `${winner.name} is ${Math.round(Math.abs(latencyDelta))}ms faster on average than ${runnerUp.name}.`,
      );
    }
  }

  if (runnerUp?.totalCostUsd !== undefined && winner.totalCostUsd !== undefined) {
    const costDelta = winner.totalCostUsd - runnerUp.totalCostUsd;
    if (costDelta > 0) {
      tradeoffs.push(`${winner.name} costs $${costDelta.toFixed(4)} more than ${runnerUp.name}.`);
    } else if (costDelta < 0) {
      tradeoffs.push(
        `${winner.name} costs $${Math.abs(costDelta).toFixed(4)} less than ${runnerUp.name}.`,
      );
    }
  }

  if (winner.name.toLowerCase().includes("verification")) {
    tradeoffs.push(`${winner.name} adds workflow complexity because it performs verification.`);
  }

  if (tradeoffs.length === 0) {
    tradeoffs.push("No cost, latency or complexity tradeoff was recorded for the winner.");
  }

  return tradeoffs;
}

function toAlternative(winner: VariantSummary, alternative: VariantSummary): VariantAlternative {
  const reasons = [];

  if (alternative.averageLatencyMs !== undefined && winner.averageLatencyMs !== undefined) {
    const latencyDelta = winner.averageLatencyMs - alternative.averageLatencyMs;
    if (latencyDelta > 0) reasons.push("lower latency");
  }

  if (alternative.totalCostUsd !== undefined && winner.totalCostUsd !== undefined) {
    const costDelta = winner.totalCostUsd - alternative.totalCostUsd;
    if (costDelta > 0) reasons.push("lower cost");
  }

  const scoreGap = winner.score - alternative.score;
  const reason =
    reasons.length > 0
      ? `Good fallback when ${reasons.join(" and ")} matters more.`
      : `Next best option, trailing the winner by ${scoreGap.toFixed(3)} score points.`;

  return {
    variant: alternative.name,
    score: alternative.score,
    reason,
  };
}

function inferConfidence(
  result: ExperimentResult,
  scoreGap: number | undefined,
  options: Required<RecommendationOptions>,
): RecommendationConfidence {
  const winner = selectBestVariant(result);
  if (winner === null || scoreGap === undefined) return "low";
  if (scoreGap <= options.lowConfidenceScoreGap) return "low";

  const caseCount = winner.totalCases;
  const tied = sortLeaderboard(result.leaderboard).some(
    (variant) => variant.variantId !== winner.variantId && variant.score === winner.score,
  );
  if (caseCount < 2 || tied) return "low";

  if (caseCount >= options.highConfidenceMinCases && scoreGap >= options.highConfidenceScoreGap) {
    return "high";
  }

  if (scoreGap >= options.mediumConfidenceScoreGap) return "medium";

  return "low";
}

function optionalNumber(value: number | undefined): number {
  return value ?? Number.POSITIVE_INFINITY;
}
