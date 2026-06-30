import type { JsonRecord, JsonValue, Metadata, RewardResult } from "@ignitionai/agent-trainer-core";

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
  metadata?: Metadata;
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
  nextState: EnvironmentState;
  reward: RewardResult;
  done: boolean;
  metadata?: Metadata;
}

export interface EpisodeResult {
  steps: EpisodeStep[];
  totalReward: number;
  averageReward: number;
  finalState: EnvironmentState;
  done: boolean;
  policyId?: string;
  metadata?: Metadata;
}

export interface RunEpisodeOptions {
  seed?: number;
  maxSteps?: number;
  policyId?: string;
  metadata?: Metadata;
}

export async function runEpisode(
  environment: AgentEnvironment,
  policy: Policy,
  options: RunEpisodeOptions = {},
): Promise<EpisodeResult> {
  const maxSteps = options.maxSteps ?? 100;
  validateMaxSteps(maxSteps);

  let state = await environment.reset(options.seed);
  const steps: EpisodeStep[] = [];

  while (!state.done) {
    if (steps.length >= maxSteps) {
      throw new Error(`Episode exceeded maxSteps (${maxSteps}).`);
    }

    const actions = await environment.actions(state);
    if (actions.length === 0) {
      throw new Error(`Environment returned no actions for state ${state.id}.`);
    }

    const action = await policy.chooseAction(state, actions);
    const result = await environment.step(state, action);
    validateReward(result.reward, action);

    steps.push({
      state,
      action,
      nextState: result.state,
      reward: result.reward,
      done: result.done,
      ...(result.metadata !== undefined ? { metadata: result.metadata } : {}),
    });
    state = result.state;
    if (result.done) break;
  }

  const totalReward = steps.reduce((sum, step) => sum + step.reward.score * step.reward.weight, 0);

  return {
    steps,
    totalReward,
    averageReward: steps.length === 0 ? 0 : totalReward / steps.length,
    finalState: state,
    done: state.done === true || steps.at(-1)?.done === true,
    ...(options.policyId !== undefined ? { policyId: options.policyId } : {}),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  };
}

function validateMaxSteps(maxSteps: number): void {
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    throw new Error("Episode maxSteps must be a positive integer.");
  }
}

function validateReward(reward: RewardResult, action: EnvironmentAction): void {
  if (!Number.isFinite(reward.score)) {
    throw new Error(`Environment reward score must be finite for action ${action.name}.`);
  }
  if (!Number.isFinite(reward.weight)) {
    throw new Error(`Environment reward weight must be finite for action ${action.name}.`);
  }
}
