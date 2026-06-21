import type {
  AgentVariant,
  CaseResult,
  Dataset,
  ExperimentReport,
  RewardFunction,
  RunContext,
  VariantSummary,
} from "@ignitionai/core";
import { weightedAverage } from "@ignitionai/core";

export interface ExperimentConfig {
  name: string;
  dataset: Dataset;
  variants: AgentVariant[];
  rewards: RewardFunction[];
  metadata?: Record<string, unknown>;
}

export interface Experiment {
  run(): Promise<ExperimentReport>;
}

export function createExperiment(config: ExperimentConfig): Experiment {
  validateExperiment(config);

  return {
    async run() {
      const startedAt = new Date().toISOString();
      const cases: CaseResult[] = [];

      for (const variant of config.variants) {
        for (const item of config.dataset.items) {
          const context: RunContext = {
            experimentName: config.name,
            variantId: variant.id,
            caseId: item.id,
          };

          const run = await variant.run(item, context);
          const rewards = [];
          for (const reward of config.rewards) {
            rewards.push(await reward.evaluate(run, item, context));
          }

          const caseResult: CaseResult = {
            caseId: item.id,
            variantId: variant.id,
            output: run.output,
            trace: run.trace,
            rewards,
            score: weightedAverage(rewards),
          };
          if (run.usage !== undefined) caseResult.usage = run.usage;
          if (run.metadata !== undefined) caseResult.metadata = run.metadata;
          cases.push(caseResult);
        }
      }

      const endedAt = new Date().toISOString();
      const leaderboard = summarizeVariants(config.variants, cases);

      return {
        name: config.name,
        startedAt,
        endedAt,
        leaderboard,
        cases,
        metadata: config.metadata as any,
      };
    },
  };
}

function validateExperiment(config: ExperimentConfig): void {
  if (!config.name.trim()) throw new Error("Experiment name is required.");
  if (config.dataset.items.length === 0) throw new Error("Experiment dataset is empty.");
  if (config.variants.length === 0) throw new Error("At least one variant is required.");
  if (config.rewards.length === 0) throw new Error("At least one reward is required.");
}

function summarizeVariants(variants: AgentVariant[], cases: CaseResult[]): VariantSummary[] {
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
            caseResult.rewards.filter((reward) => reward.name === rewardName).map((reward) => reward.score),
          ),
        );
      }

      const summary: VariantSummary = {
        variantId: variant.id,
        name: variant.name,
        score,
        totalCases: variantCases.length,
        rewardAverages,
      };
      if (latencies.length) summary.averageLatencyMs = average(latencies);
      if (costs.length) summary.totalCostUsd = costs.reduce((sum, cost) => sum + cost, 0);
      return summary;
    })
    .sort((a, b) => b.score - a.score);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
