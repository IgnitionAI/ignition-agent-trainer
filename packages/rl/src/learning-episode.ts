import type {
  AgentEnvironment,
  EpisodeResult,
  EpisodeStep,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import type { LearningPolicy } from "./q-learning";

export interface LearningEpisodeOptions {
  maxSteps: number;
  seed?: number;
  policyId?: string;
}

export interface LearningEpisodeResult extends EpisodeResult {
  truncated: boolean;
}

/** Online TD updates only for transitions executed by the environment. */
export async function runLearningEpisode(
  environment: AgentEnvironment,
  policy: LearningPolicy | Policy,
  options: LearningEpisodeOptions,
): Promise<LearningEpisodeResult> {
  if (!Number.isSafeInteger(options.maxSteps) || options.maxSteps <= 0) {
    throw new Error("Learning episode maxSteps must be a positive safe integer.");
  }
  let state = await environment.reset(options.seed);
  let done = state.done === true;
  const steps: EpisodeStep[] = [];
  while (!done && steps.length < options.maxSteps) {
    const actions = await environment.actions(state);
    const action = await policy.chooseAction(state, actions);
    if (!actions.some(({ name }) => name === action.name))
      throw new Error(`Unavailable action: ${action.name}`);
    const result = await environment.step(state, action);
    const reward = result.reward.score * result.reward.weight;
    if (
      !Number.isFinite(result.reward.score) ||
      !Number.isFinite(result.reward.weight) ||
      !Number.isFinite(reward)
    ) {
      throw new Error("Learning episode reward must be finite.");
    }
    done = result.done || result.state.done === true;
    const nextState = done ? { ...result.state, done: true } : result.state;
    if ("update" in policy) {
      policy.update({
        state,
        action,
        reward,
        nextState,
        nextActions: done ? [] : await environment.actions(nextState),
        done,
      });
    }
    steps.push({
      state,
      action,
      nextState,
      reward: result.reward,
      done,
      ...(result.metadata ? { metadata: result.metadata } : {}),
    });
    state = nextState;
  }
  const totalReward = steps.reduce((sum, step) => sum + step.reward.score * step.reward.weight, 0);
  return {
    steps,
    totalReward,
    averageReward: steps.length ? totalReward / steps.length : 0,
    finalState: state,
    done,
    truncated: !done,
    ...(options.policyId !== undefined ? { policyId: options.policyId } : {}),
    metadata: { truncated: !done },
  };
}
