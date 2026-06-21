import type { EnvironmentAction, EnvironmentState, Policy } from "@ignitionai/environment";

export class RandomPolicy implements Policy {
  constructor(private readonly random: () => number = Math.random) {}

  async chooseAction(
    _state: EnvironmentState,
    actions: EnvironmentAction[],
  ): Promise<EnvironmentAction> {
    if (actions.length === 0) throw new Error("No action available.");
    const fallbackAction = actions[0];
    if (!fallbackAction) throw new Error("No action available.");
    return actions[Math.floor(this.random() * actions.length)] ?? fallbackAction;
  }
}

export interface PpoDesignPlaceholder {
  note: "PPO is intentionally not implemented in the MVP. Stabilize environment, rewards and rollouts first.";
}

export interface GrpoDesignPlaceholder {
  note: "GRPO-style group optimization can begin as candidate selection before weight updates.";
}
