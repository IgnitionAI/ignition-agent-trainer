export interface BanditArm {
  id: string;
  pulls: number;
  totalReward: number;
}

export interface EpsilonGreedyBanditOptions {
  epsilon?: number;
  random?: () => number;
}

export class EpsilonGreedyBandit {
  private readonly arms = new Map<string, BanditArm>();
  private readonly epsilon: number;
  private readonly random: () => number;

  constructor(armIds: string[], options: EpsilonGreedyBanditOptions = {}) {
    this.epsilon = options.epsilon ?? 0.1;
    this.random = options.random ?? Math.random;

    for (const id of armIds) {
      this.arms.set(id, { id, pulls: 0, totalReward: 0 });
    }
  }

  choose(): string {
    const arms = Array.from(this.arms.values());
    if (arms.length === 0) throw new Error("Bandit has no arms.");

    if (this.random() < this.epsilon) {
      return arms[Math.floor(this.random() * arms.length)]?.id ?? arms[0]!.id;
    }

    return arms
      .slice()
      .sort((a, b) => this.averageReward(b) - this.averageReward(a))[0]!.id;
  }

  update(armId: string, reward: number): void {
    const arm = this.arms.get(armId);
    if (!arm) throw new Error(`Unknown bandit arm: ${armId}`);
    arm.pulls += 1;
    arm.totalReward += reward;
  }

  snapshot(): BanditArm[] {
    return Array.from(this.arms.values()).map((arm) => ({ ...arm }));
  }

  private averageReward(arm: BanditArm): number {
    return arm.pulls === 0 ? 0 : arm.totalReward / arm.pulls;
  }
}
