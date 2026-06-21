import type { ExperimentResult, VariantSummary } from "@ignitionai/core";

export type RegressionGateMetric = "score" | "latency" | "cost" | "variant";
export type RegressionGateScope = "experiment" | "variant";

export interface RegressionGateOptions {
  maxScoreDrop?: number;
  maxLatencyIncreaseMs?: number;
  maxCostIncreaseUsd?: number;
  variantIds?: string[];
}

export interface RegressionGateCheck {
  scope: RegressionGateScope;
  metric: RegressionGateMetric;
  name: string;
  baseline?: number;
  current?: number;
  threshold?: number;
  delta?: number;
  passed: boolean;
  message: string;
}

export interface RegressionGateComparison {
  passed: boolean;
  checks: RegressionGateCheck[];
  failures: RegressionGateCheck[];
  markdown: string;
}

interface ResolvedRegressionGateOptions {
  maxScoreDrop: number;
  maxLatencyIncreaseMs?: number;
  maxCostIncreaseUsd?: number;
  variantIds?: string[];
}

export class RegressionGateError extends Error {
  readonly comparison: RegressionGateComparison;

  constructor(comparison: RegressionGateComparison) {
    super(regressionFailureMessage(comparison.failures));
    this.name = "RegressionGateError";
    this.comparison = comparison;
  }
}

export function compareExperimentResults(
  current: ExperimentResult,
  baseline: ExperimentResult,
  options: RegressionGateOptions = {},
): RegressionGateComparison {
  const resolvedOptions = resolveOptions(options);
  const checks = [
    ...compareExperimentWinner(current, baseline, resolvedOptions),
    ...compareVariants(current, baseline, resolvedOptions),
  ];
  const failures = checks.filter((check) => !check.passed);

  return {
    passed: failures.length === 0,
    checks,
    failures,
    markdown: toRegressionGateMarkdown(checks, failures),
  };
}

export function assertNoRegression(
  current: ExperimentResult,
  baseline: ExperimentResult,
  options: RegressionGateOptions = {},
): RegressionGateComparison {
  const comparison = compareExperimentResults(current, baseline, options);
  if (!comparison.passed) throw new RegressionGateError(comparison);
  return comparison;
}

function compareExperimentWinner(
  current: ExperimentResult,
  baseline: ExperimentResult,
  options: ResolvedRegressionGateOptions,
): RegressionGateCheck[] {
  const baselineWinner = baseline.leaderboard[0];
  const currentWinner = current.leaderboard[0];
  if (baselineWinner === undefined || currentWinner === undefined) return [];

  return compareSummaries(
    "experiment",
    "leaderboard winner",
    currentWinner,
    baselineWinner,
    options,
  );
}

function compareVariants(
  current: ExperimentResult,
  baseline: ExperimentResult,
  options: ResolvedRegressionGateOptions,
): RegressionGateCheck[] {
  const currentById = new Map(current.leaderboard.map((variant) => [variant.variantId, variant]));
  const baselineById = new Map(baseline.leaderboard.map((variant) => [variant.variantId, variant]));
  const variantIds =
    options.variantIds ?? Array.from(baselineById.keys()).sort((a, b) => a.localeCompare(b));

  const checks = [];
  for (const variantId of variantIds) {
    const baselineVariant = baselineById.get(variantId);
    const currentVariant = currentById.get(variantId);
    const name = baselineVariant?.name ?? currentVariant?.name ?? variantId;

    if (baselineVariant === undefined) {
      checks.push({
        scope: "variant" as const,
        metric: "variant" as const,
        name,
        passed: true,
        message: `Variant ${name} has no baseline result; skipping regression check.`,
      });
      continue;
    }

    if (currentVariant === undefined) {
      checks.push({
        scope: "variant" as const,
        metric: "variant" as const,
        name,
        passed: false,
        message: `Variant ${name} is missing from the current result.`,
      });
      continue;
    }

    checks.push(...compareSummaries("variant", name, currentVariant, baselineVariant, options));
  }

  return checks;
}

function compareSummaries(
  scope: RegressionGateScope,
  name: string,
  current: VariantSummary,
  baseline: VariantSummary,
  options: ResolvedRegressionGateOptions,
): RegressionGateCheck[] {
  const checks = [compareScore(scope, name, current.score, baseline.score, options.maxScoreDrop)];

  if (options.maxLatencyIncreaseMs !== undefined) {
    checks.push(
      compareIncrease(
        scope,
        "latency",
        name,
        current.averageLatencyMs,
        baseline.averageLatencyMs,
        options.maxLatencyIncreaseMs,
        "ms",
      ),
    );
  }

  if (options.maxCostIncreaseUsd !== undefined) {
    checks.push(
      compareIncrease(
        scope,
        "cost",
        name,
        current.totalCostUsd,
        baseline.totalCostUsd,
        options.maxCostIncreaseUsd,
        "USD",
      ),
    );
  }

  return checks;
}

function compareScore(
  scope: RegressionGateScope,
  name: string,
  current: number,
  baseline: number,
  maxScoreDrop: number,
): RegressionGateCheck {
  const delta = baseline - current;
  const passed = delta <= maxScoreDrop;
  const label = scopeLabel(scope, name);

  return {
    scope,
    metric: "score",
    name,
    baseline,
    current,
    threshold: maxScoreDrop,
    delta,
    passed,
    message: passed
      ? `${label} score passed: ${formatScore(current)} current vs ${formatScore(
          baseline,
        )} baseline.`
      : `${label} score dropped by ${formatScore(delta)}, max allowed ${formatScore(
          maxScoreDrop,
        )} (${formatScore(baseline)} baseline -> ${formatScore(current)} current).`,
  };
}

function compareIncrease(
  scope: RegressionGateScope,
  metric: "latency" | "cost",
  name: string,
  current: number | undefined,
  baseline: number | undefined,
  maxIncrease: number,
  unit: "ms" | "USD",
): RegressionGateCheck {
  const label = scopeLabel(scope, name);
  if (baseline === undefined) {
    const check: RegressionGateCheck = {
      scope,
      metric,
      name,
      threshold: maxIncrease,
      passed: true,
      message: `${label} ${metric} has no baseline value; skipping regression check.`,
    };
    if (current !== undefined) check.current = current;
    return check;
  }

  if (current === undefined) {
    return {
      scope,
      metric,
      name,
      baseline,
      threshold: maxIncrease,
      passed: false,
      message: `${label} ${metric} is missing from the current result.`,
    };
  }

  const delta = current - baseline;
  const passed = delta <= maxIncrease;

  return {
    scope,
    metric,
    name,
    baseline,
    current,
    threshold: maxIncrease,
    delta,
    passed,
    message: passed
      ? `${label} ${metric} passed: ${formatMetric(current, unit)} current vs ${formatMetric(
          baseline,
          unit,
        )} baseline.`
      : `${label} ${metric} increased by ${formatMetric(delta, unit)}, max allowed ${formatMetric(
          maxIncrease,
          unit,
        )} (${formatMetric(baseline, unit)} baseline -> ${formatMetric(current, unit)} current).`,
  };
}

function toRegressionGateMarkdown(
  checks: RegressionGateCheck[],
  failures: RegressionGateCheck[],
): string {
  const lines = [
    "# Regression gate summary",
    "",
    `Result: ${failures.length === 0 ? "pass" : "fail"}`,
    `Checks: ${checks.length}`,
    `Failures: ${failures.length}`,
    "",
    "## Checks",
    "",
  ];

  if (checks.length === 0) {
    lines.push("No regression checks were run.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| Status | Scope | Metric | Name | Baseline | Current | Threshold |");
  lines.push("|---|---|---|---|---:|---:|---:|");

  for (const check of checks) {
    lines.push(
      `| ${check.passed ? "pass" : "fail"} | ${check.scope} | ${check.metric} | ${markdownCell(
        check.name,
      )} | ${formatOptionalNumber(check.baseline)} | ${formatOptionalNumber(
        check.current,
      )} | ${formatOptionalNumber(check.threshold)} |`,
    );
  }

  if (failures.length > 0) {
    lines.push("", "## Failures", "");
    for (const failure of failures) {
      lines.push(`- ${failure.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function resolveOptions(options: RegressionGateOptions): ResolvedRegressionGateOptions {
  const resolved: ResolvedRegressionGateOptions = {
    maxScoreDrop: options.maxScoreDrop ?? 0,
  };
  if (options.maxLatencyIncreaseMs !== undefined) {
    resolved.maxLatencyIncreaseMs = options.maxLatencyIncreaseMs;
  }
  if (options.maxCostIncreaseUsd !== undefined) {
    resolved.maxCostIncreaseUsd = options.maxCostIncreaseUsd;
  }
  if (options.variantIds !== undefined) {
    resolved.variantIds = [...options.variantIds];
  }
  return resolved;
}

function regressionFailureMessage(failures: RegressionGateCheck[]): string {
  if (failures.length === 0) return "Regression gate failed.";
  return `Regression gate failed:\n${failures.map((failure) => `- ${failure.message}`).join("\n")}`;
}

function scopeLabel(scope: RegressionGateScope, name: string): string {
  return scope === "experiment" ? `Experiment ${name}` : `Variant ${name}`;
}

function formatScore(value: number): string {
  return value.toFixed(3);
}

function formatMetric(value: number, unit: "ms" | "USD"): string {
  if (unit === "ms") return `${Math.round(value)}ms`;
  return `$${value.toFixed(4)}`;
}

function formatOptionalNumber(value: number | undefined): string {
  return value === undefined ? "n/a" : value.toFixed(3);
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
