import type {
  AgentAdapterResult,
  AgentVariant,
  CaseResult,
  Dataset,
  DatasetItem,
  ExperimentReport,
  MetricResult,
  RewardFunction,
  RunContext,
  RunError,
  RunResult,
  VariantSummary,
} from "@ignitionai/agent-trainer-core";
import { normalizeRunResult, toAgentInput, weightedAverage } from "@ignitionai/agent-trainer-core";

export interface ExperimentOptions {
  concurrency?: number;
}

export interface ExperimentConfig {
  name: string;
  dataset: Dataset;
  variants: AgentVariant[];
  rewards: RewardFunction[];
  options?: ExperimentOptions;
  metadata?: Record<string, unknown>;
}

export interface Experiment {
  run(): Promise<ExperimentReport>;
}

interface ResolvedVariant extends AgentVariant {
  id: string;
}

export function createExperiment(config: ExperimentConfig): Experiment {
  validateExperiment(config);
  const variants = resolveVariants(config.variants);

  return {
    async run() {
      const startedAt = new Date().toISOString();
      const tasks = variants.flatMap((variant) =>
        config.dataset.items.map((item) => () => runCase(config, variant, item)),
      );
      const cases = await runWithConcurrency(tasks, config.options?.concurrency ?? 1);
      const endedAt = new Date().toISOString();
      const leaderboard = summarizeVariants(variants, cases);
      const failedCases = cases.filter((caseResult) => caseResult.error !== undefined);

      const report: ExperimentReport = {
        name: config.name,
        startedAt,
        endedAt,
        leaderboard,
        cases,
        failedCases,
      };
      if (config.metadata !== undefined) report.metadata = config.metadata;
      return report;
    },
  };
}

function validateExperiment(config: ExperimentConfig): void {
  if (!config.name.trim()) throw new Error("Experiment name is required.");
  if (config.dataset === undefined) throw new Error("Experiment dataset is required.");
  if (config.dataset.items.length === 0) throw new Error("Experiment dataset is empty.");
  if (config.variants === undefined) throw new Error("Experiment variants are required.");
  if (config.variants.length === 0) throw new Error("At least one variant is required.");
  if (config.rewards === undefined) throw new Error("Experiment rewards are required.");
  if (config.rewards.length === 0) throw new Error("At least one reward is required.");

  for (const variant of config.variants) {
    if (!variant.name.trim()) throw new Error("Variant name is required.");
    if (variant.adapter === undefined && variant.run === undefined) {
      throw new Error(`Variant ${variant.name} requires an adapter or run function.`);
    }
  }
}

function resolveVariants(variants: AgentVariant[]): ResolvedVariant[] {
  const used = new Set<string>();

  return variants.map((variant, index) => {
    const baseId = variant.id?.trim() || slugify(variant.name) || `variant-${index + 1}`;
    const id = uniqueId(baseId, used);
    used.add(id);
    return { ...variant, id };
  });
}

async function runCase(
  config: ExperimentConfig,
  variant: ResolvedVariant,
  item: DatasetItem,
): Promise<CaseResult> {
  const context: RunContext = {
    experimentName: config.name,
    variantId: variant.id,
    caseId: item.id,
  };
  const started = Date.now();

  try {
    const raw = await runVariant(variant, item, context);
    const run = withMeasuredLatency(normalizeRunResult(raw), started);
    const rewards = [];

    for (const reward of config.rewards) {
      rewards.push(await evaluateReward(reward, run, item, context));
    }

    return createCaseResult(variant, item, run, rewards);
  } catch (error) {
    return createFailedCaseResult(variant, item, error, config.rewards, Date.now() - started);
  }
}

function runVariant(
  variant: ResolvedVariant,
  item: DatasetItem,
  context: RunContext,
): Promise<AgentAdapterResult> {
  if (variant.adapter !== undefined) {
    return Promise.resolve(variant.adapter.run(toAgentInput(item), context));
  }

  if (variant.run !== undefined) {
    return Promise.resolve(variant.run(item, context));
  }

  throw new Error(`Variant ${variant.name} requires an adapter or run function.`);
}

function withMeasuredLatency(run: RunResult, started: number): RunResult {
  if (run.usage?.latencyMs !== undefined) return run;

  return {
    ...run,
    usage: {
      ...run.usage,
      latencyMs: Date.now() - started,
    },
  };
}

async function evaluateReward(
  reward: RewardFunction,
  run: RunResult,
  item: DatasetItem,
  context: RunContext,
): Promise<MetricResult> {
  try {
    const result = await reward.evaluate(run, item, context);
    return {
      ...result,
      score: clampScore(result.score),
      weight: result.weight ?? reward.weight ?? 1,
    };
  } catch (error) {
    return {
      name: reward.name,
      score: 0,
      weight: reward.weight ?? 1,
      passed: false,
      reason: `Reward failed: ${errorMessage(error)}`,
      metadata: { error: toRunError(error) },
    };
  }
}

function createCaseResult(
  variant: ResolvedVariant,
  item: DatasetItem,
  run: RunResult,
  rewards: MetricResult[],
): CaseResult {
  const caseResult: CaseResult = {
    caseId: item.id,
    variantId: variant.id,
    variantName: variant.name,
    output: run.output,
    trace: run.trace,
    rewards,
    score: weightedAverage(rewards),
  };
  if (run.usage !== undefined) caseResult.usage = run.usage;
  if (run.metadata !== undefined) caseResult.metadata = run.metadata;
  return caseResult;
}

function createFailedCaseResult(
  variant: ResolvedVariant,
  item: DatasetItem,
  error: unknown,
  rewards: RewardFunction[],
  latencyMs: number,
): CaseResult {
  const runError = toRunError(error);
  return {
    caseId: item.id,
    variantId: variant.id,
    variantName: variant.name,
    output: "",
    trace: {
      steps: [
        {
          type: "custom",
          name: "run_error",
          payload: runError,
        },
      ],
    },
    usage: { latencyMs },
    rewards: rewards.map((reward) => ({
      name: reward.name,
      score: 0,
      weight: reward.weight ?? 1,
      passed: false,
      reason: `Run failed: ${runError.message}`,
      metadata: { error: runError },
    })),
    score: 0,
    error: runError,
  };
}

function summarizeVariants(variants: ResolvedVariant[], cases: CaseResult[]): VariantSummary[] {
  return variants
    .map((variant) => {
      const variantCases = cases.filter((caseResult) => caseResult.variantId === variant.id);
      const score = average(variantCases.map((caseResult) => caseResult.score));
      const latencies = variantCases
        .map((caseResult) => caseResult.usage?.latencyMs)
        .filter((value): value is number => value !== undefined);
      const costs = variantCases
        .map((caseResult) => caseResult.usage?.costUsd)
        .filter((value): value is number => value !== undefined);

      const rewardAverages: Record<string, number> = {};
      for (const caseResult of variantCases) {
        for (const reward of caseResult.rewards) {
          rewardAverages[reward.name] ??= 0;
        }
      }
      for (const rewardName of Object.keys(rewardAverages)) {
        rewardAverages[rewardName] = average(
          variantCases.flatMap((caseResult) =>
            caseResult.rewards
              .filter((reward) => reward.name === rewardName)
              .map((reward) => reward.score),
          ),
        );
      }

      const summary: VariantSummary = {
        variantId: variant.id,
        name: variant.name,
        score,
        totalCases: variantCases.length,
        rewardAverages,
        failedCases: variantCases.filter((caseResult) => caseResult.error !== undefined).length,
      };
      if (latencies.length) summary.averageLatencyMs = average(latencies);
      if (costs.length) summary.totalCostUsd = costs.reduce((sum, cost) => sum + cost, 0);
      return summary;
    })
    .sort((a, b) => b.score - a.score);
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const limit = Math.max(1, Math.min(tasks.length, Math.floor(concurrency)));
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[currentIndex];
      if (task === undefined) throw new Error(`Missing experiment task at index ${currentIndex}.`);
      results[currentIndex] = await task();
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

function uniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) return baseId;

  let index = 2;
  while (used.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

function toRunError(error: unknown): RunError {
  if (error instanceof Error) {
    const runError: RunError = {
      message: error.message,
      name: error.name,
    };
    if (error.stack !== undefined) runError.stack = error.stack;
    return runError;
  }

  return { message: String(error) };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
