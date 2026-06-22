import type { Metadata } from "@ignitionai/core";

export type ContextFeatureValue = string | number | boolean;

export interface ContextFeatures {
  taskType?: string;
  citationNeed?: "none" | "optional" | "required";
  costSensitivity?: "low" | "medium" | "high";
  latencySensitivity?: "low" | "medium" | "high";
  riskLevel?: "low" | "medium" | "high";
  [feature: string]: ContextFeatureValue | undefined;
}

export interface ContextualBanditArm<TStrategy = unknown> {
  id: string;
  name?: string;
  strategy: TStrategy;
  preferredContext?: Partial<ContextFeatures>;
  priorReward?: number;
  metadata?: Metadata;
}

export interface ContextualBanditArmState<TStrategy = unknown>
  extends ContextualBanditArm<TStrategy> {
  pulls: number;
  totalReward: number;
  averageReward: number;
}

export interface ContextualBanditSelection<TStrategy = unknown> {
  arm: ContextualBanditArmState<TStrategy>;
  contextScore: number;
  rewardScore: number;
  score: number;
  reason: string;
}

export interface ContextualBanditSelectorOptions {
  contextWeight?: number;
  rewardWeight?: number;
}

export class ContextualBanditStrategySelector<TStrategy = unknown> {
  private readonly arms = new Map<string, ContextualBanditArmState<TStrategy>>();
  private readonly contextWeight: number;
  private readonly rewardWeight: number;

  constructor(
    arms: Array<ContextualBanditArm<TStrategy>>,
    options: ContextualBanditSelectorOptions = {},
  ) {
    this.contextWeight = options.contextWeight ?? 0.7;
    this.rewardWeight = options.rewardWeight ?? 0.3;

    validateWeight("contextWeight", this.contextWeight);
    validateWeight("rewardWeight", this.rewardWeight);

    for (const arm of arms) {
      if (this.arms.has(arm.id)) throw new Error(`Duplicate contextual bandit arm: ${arm.id}`);
      validateOptionalReward(arm.id, arm.priorReward);
      this.arms.set(arm.id, {
        ...arm,
        pulls: 0,
        totalReward: 0,
        averageReward: 0,
      });
    }
  }

  select(context: ContextFeatures = {}): ContextualBanditSelection<TStrategy> {
    const scored = this.score(context);
    const best = scored[0];
    if (best === undefined) throw new Error("Contextual bandit selector has no arms.");
    return best;
  }

  score(context: ContextFeatures = {}): Array<ContextualBanditSelection<TStrategy>> {
    const scored = this.snapshot()
      .map((arm) => scoreArm(arm, context, this.contextWeight, this.rewardWeight))
      .sort(compareSelections);

    return scored;
  }

  update(armId: string, reward: number): ContextualBanditArmState<TStrategy> {
    if (!Number.isFinite(reward)) throw new Error("Contextual bandit reward must be finite.");

    const arm = this.arms.get(armId);
    if (arm === undefined) throw new Error(`Unknown contextual bandit arm: ${armId}`);

    const pulls = arm.pulls + 1;
    const totalReward = arm.totalReward + reward;
    const updated = {
      ...arm,
      pulls,
      totalReward,
      averageReward: totalReward / pulls,
    };
    this.arms.set(armId, updated);
    return cloneArmState(updated);
  }

  snapshot(): Array<ContextualBanditArmState<TStrategy>> {
    return Array.from(this.arms.values()).map(cloneArmState);
  }
}

export function scoreContextMatch(
  context: ContextFeatures,
  preferredContext: Partial<ContextFeatures> = {},
): number {
  const entries = Object.entries(preferredContext).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return 1;

  const matches = entries.filter(([feature, value]) => context[feature] === value).length;
  return matches / entries.length;
}

function scoreArm<TStrategy>(
  arm: ContextualBanditArmState<TStrategy>,
  context: ContextFeatures,
  contextWeight: number,
  rewardWeight: number,
): ContextualBanditSelection<TStrategy> {
  const contextScore = scoreContextMatch(context, arm.preferredContext);
  const rewardScore = arm.pulls > 0 ? arm.averageReward : (arm.priorReward ?? 0);
  const score = contextScore * contextWeight + rewardScore * rewardWeight;

  return {
    arm,
    contextScore,
    rewardScore,
    score,
    reason: `Selected contextual bandit arm ${arm.id} with context score ${contextScore} and reward score ${rewardScore}.`,
  };
}

function compareSelections<TStrategy>(
  a: ContextualBanditSelection<TStrategy>,
  b: ContextualBanditSelection<TStrategy>,
): number {
  return (
    b.score - a.score ||
    b.contextScore - a.contextScore ||
    b.rewardScore - a.rewardScore ||
    a.arm.pulls - b.arm.pulls ||
    a.arm.id.localeCompare(b.arm.id)
  );
}

function cloneArmState<TStrategy>(
  state: ContextualBanditArmState<TStrategy>,
): ContextualBanditArmState<TStrategy> {
  return {
    id: state.id,
    ...(state.name !== undefined ? { name: state.name } : {}),
    strategy: state.strategy,
    ...(state.preferredContext !== undefined
      ? { preferredContext: { ...state.preferredContext } }
      : {}),
    ...(state.priorReward !== undefined ? { priorReward: state.priorReward } : {}),
    ...(state.metadata !== undefined ? { metadata: state.metadata } : {}),
    pulls: state.pulls,
    totalReward: state.totalReward,
    averageReward: state.averageReward,
  };
}

function validateWeight(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Contextual bandit ${name} must be a non-negative finite number.`);
  }
}

function validateOptionalReward(armId: string, reward: number | undefined): void {
  if (reward !== undefined && !Number.isFinite(reward)) {
    throw new Error(`Contextual bandit prior reward must be finite for arm: ${armId}`);
  }
}
