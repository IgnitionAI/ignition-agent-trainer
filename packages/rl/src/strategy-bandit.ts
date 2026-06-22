import type { ExperimentResult, Metadata, VariantSummary } from "@ignitionai/agent-trainer-core";

export interface ExperimentalBanditStrategyArm<TStrategy = unknown> {
  id: string;
  name?: string;
  strategy: TStrategy;
  metadata?: Metadata;
}

export interface ExperimentalBanditStrategyState<TStrategy = unknown>
  extends ExperimentalBanditStrategyArm<TStrategy> {
  pulls: number;
  totalReward: number;
  averageReward: number;
}

export interface ExperimentalBanditStrategySelectorOptions {
  epsilon?: number;
  random?: () => number;
}

export interface UpdateFromExperimentOptions {
  rewardFromVariant?: (variant: VariantSummary, result: ExperimentResult) => number;
}

export class ExperimentalBanditStrategySelector<TStrategy = unknown> {
  private readonly arms = new Map<string, ExperimentalBanditStrategyState<TStrategy>>();
  private readonly epsilon: number;
  private readonly random: () => number;

  constructor(
    arms: Array<ExperimentalBanditStrategyArm<TStrategy>>,
    options: ExperimentalBanditStrategySelectorOptions = {},
  ) {
    this.epsilon = options.epsilon ?? 0.1;
    this.random = options.random ?? Math.random;

    for (const arm of arms) {
      if (this.arms.has(arm.id)) throw new Error(`Duplicate bandit strategy arm: ${arm.id}`);
      this.arms.set(arm.id, {
        ...arm,
        pulls: 0,
        totalReward: 0,
        averageReward: 0,
      });
    }
  }

  select(): ExperimentalBanditStrategyState<TStrategy> {
    const arms = this.snapshot();
    if (arms.length === 0) throw new Error("Bandit strategy selector has no arms.");
    const fallbackArm = arms[0];
    if (fallbackArm === undefined) throw new Error("Bandit strategy selector has no arms.");

    if (this.random() < this.epsilon) {
      return arms[Math.floor(this.random() * arms.length)] ?? fallbackArm;
    }

    const bestArm = arms.slice().sort(compareStrategyStates)[0];
    if (bestArm === undefined) throw new Error("Bandit strategy selector has no arms.");
    return bestArm;
  }

  update(armId: string, reward: number): ExperimentalBanditStrategyState<TStrategy> {
    if (!Number.isFinite(reward)) throw new Error("Bandit reward must be a finite number.");

    const arm = this.arms.get(armId);
    if (arm === undefined) throw new Error(`Unknown bandit strategy arm: ${armId}`);

    const pulls = arm.pulls + 1;
    const totalReward = arm.totalReward + reward;
    const updated = {
      ...arm,
      pulls,
      totalReward,
      averageReward: totalReward / pulls,
    };
    this.arms.set(armId, updated);
    return cloneStrategyState(updated);
  }

  updateFromExperimentResult(
    result: ExperimentResult,
    options: UpdateFromExperimentOptions = {},
  ): Array<ExperimentalBanditStrategyState<TStrategy>> {
    const rewardFromVariant =
      options.rewardFromVariant ?? ((variant: VariantSummary) => variant.score);
    const updated = [];

    for (const variant of result.leaderboard) {
      if (!this.arms.has(variant.variantId)) continue;
      updated.push(this.update(variant.variantId, rewardFromVariant(variant, result)));
    }

    return updated;
  }

  snapshot(): Array<ExperimentalBanditStrategyState<TStrategy>> {
    return Array.from(this.arms.values()).map(cloneStrategyState);
  }
}

function compareStrategyStates(
  a: ExperimentalBanditStrategyState,
  b: ExperimentalBanditStrategyState,
): number {
  return b.averageReward - a.averageReward || a.pulls - b.pulls || a.id.localeCompare(b.id);
}

function cloneStrategyState<TStrategy>(
  state: ExperimentalBanditStrategyState<TStrategy>,
): ExperimentalBanditStrategyState<TStrategy> {
  return {
    id: state.id,
    ...(state.name !== undefined ? { name: state.name } : {}),
    strategy: state.strategy,
    ...(state.metadata !== undefined ? { metadata: state.metadata } : {}),
    pulls: state.pulls,
    totalReward: state.totalReward,
    averageReward: state.averageReward,
  };
}
