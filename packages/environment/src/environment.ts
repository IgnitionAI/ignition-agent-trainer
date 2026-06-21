import type { JsonRecord, JsonValue, RewardResult } from "@ignitionai/core";

export interface EnvironmentState {
  id: string;
  observation: JsonRecord;
  done?: boolean;
}

export interface EnvironmentAction {
  name: string;
  input?: JsonValue;
}

export interface EnvironmentStepResult {
  state: EnvironmentState;
  reward: RewardResult;
  done: boolean;
  metadata?: JsonRecord;
}

export interface AgentEnvironment {
  reset(seed?: number): Promise<EnvironmentState>;
  actions(state: EnvironmentState): Promise<EnvironmentAction[]>;
  step(state: EnvironmentState, action: EnvironmentAction): Promise<EnvironmentStepResult>;
}

export interface Policy {
  chooseAction(state: EnvironmentState, actions: EnvironmentAction[]): Promise<EnvironmentAction>;
}

export interface EpisodeStep {
  state: EnvironmentState;
  action: EnvironmentAction;
  reward: RewardResult;
}

export interface EpisodeResult {
  steps: EpisodeStep[];
  totalReward: number;
}

export async function runEpisode(
  environment: AgentEnvironment,
  policy: Policy,
): Promise<EpisodeResult> {
  let state = await environment.reset();
  const steps: EpisodeStep[] = [];

  while (!state.done) {
    const actions = await environment.actions(state);
    const action = await policy.chooseAction(state, actions);
    const result = await environment.step(state, action);
    steps.push({ state, action, reward: result.reward });
    state = result.state;
    if (result.done) break;
  }

  return {
    steps,
    totalReward: steps.reduce((sum, step) => sum + step.reward.score * step.reward.weight, 0),
  };
}
