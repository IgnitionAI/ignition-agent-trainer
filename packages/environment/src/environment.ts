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

export type EnvironmentFactory = AgentEnvironment | (() => AgentEnvironment);
export type PolicyFactory = Policy | (() => Policy);

export interface EnvironmentEpisodeConfig {
  name: string;
  environment: EnvironmentFactory;
  policy: PolicyFactory;
  options?: RunEpisodeOptions;
  metadata?: Metadata;
}

export interface EnvironmentEpisodeDefinition extends EnvironmentEpisodeConfig {
  readonly kind: "ignition.environment-episode-definition";
  createEnvironment(): AgentEnvironment;
  createPolicy(): Policy;
  run(options?: RunEpisodeOptions): Promise<EpisodeResult>;
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

export function defineEnvironmentEpisode(
  config: EnvironmentEpisodeConfig,
): EnvironmentEpisodeDefinition {
  validateEnvironmentEpisodeConfig(config);

  return {
    ...config,
    kind: "ignition.environment-episode-definition",
    createEnvironment() {
      return resolveEnvironment(config.environment);
    },
    createPolicy() {
      return resolvePolicy(config.policy);
    },
    run(options = {}) {
      return runEpisode(
        this.createEnvironment(),
        this.createPolicy(),
        mergeOptions(config, options),
      );
    },
  };
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

function validateEnvironmentEpisodeConfig(config: EnvironmentEpisodeConfig): void {
  if (!config.name.trim()) {
    throw new Error("Environment episode name is required.");
  }
}

function resolveEnvironment(value: EnvironmentFactory): AgentEnvironment {
  const environment = typeof value === "function" ? value() : value;
  if (
    typeof environment.reset !== "function" ||
    typeof environment.actions !== "function" ||
    typeof environment.step !== "function"
  ) {
    throw new Error("Environment episode environment must implement reset, actions and step.");
  }
  return environment;
}

function resolvePolicy(value: PolicyFactory): Policy {
  const policy = typeof value === "function" ? value() : value;
  if (typeof policy.chooseAction !== "function") {
    throw new Error("Environment episode policy must implement chooseAction.");
  }
  return policy;
}

function mergeOptions(
  config: EnvironmentEpisodeConfig,
  options: RunEpisodeOptions,
): RunEpisodeOptions {
  const metadata = {
    ...(config.metadata ?? {}),
    ...(config.options?.metadata ?? {}),
    ...(options.metadata ?? {}),
  };
  const merged = {
    ...(config.options ?? {}),
    ...options,
  };
  return Object.keys(metadata).length === 0 ? merged : { ...merged, metadata };
}

function validateReward(reward: RewardResult, action: EnvironmentAction): void {
  if (!Number.isFinite(reward.score)) {
    throw new Error(`Environment reward score must be finite for action ${action.name}.`);
  }
  if (!Number.isFinite(reward.weight)) {
    throw new Error(`Environment reward weight must be finite for action ${action.name}.`);
  }
}
