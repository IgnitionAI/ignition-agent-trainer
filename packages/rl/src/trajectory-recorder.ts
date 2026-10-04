import type { JsonRecord } from "@ignitionai/agent-trainer-core";
import type {
  AgentEnvironment,
  EnvironmentStepResult,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import { type LearningEpisodeResult, runLearningEpisode } from "./learning-episode";
import type { LearningPolicy } from "./q-learning";
import { redactTrajectoryFields } from "./trajectory-fields";
import type { TrajectoryImportOptions } from "./trajectory-import";

export interface RecordedTrajectoryStep {
  state: JsonRecord;
  action: { name: string; input: JsonRecord };
  observation: JsonRecord;
  reward: number;
  done: boolean;
  usage: { latencyMs: number; costUsd?: number };
}

export interface TrajectoryRecordingOptions {
  runId: string;
  episodeId: string;
  taskId: string;
  workflowSnapshotId: string;
  policyId: string;
  maxSteps: number;
  seed?: number;
  fields: Omit<TrajectoryImportOptions, "pseudonymSalt">;
  /** An independently configured evaluator of the executed episode, not totalReward. */
  evaluateQuality: (episode: LearningEpisodeResult) => number | Promise<number>;
  /** Only provider-measured cost. Undefined leaves cost unavailable. */
  readMeasuredCost?: (result: EnvironmentStepResult) => number | undefined;
}

export interface RecordedTrajectoryEpisode {
  runId: string;
  episodeId: string;
  taskId: string;
  workflowSnapshotId: string;
  policyId: string;
  collectedAt: string;
  done: boolean;
  truncated: boolean;
  qualityScore: number;
  steps: RecordedTrajectoryStep[];
}

/** Executes the supplied environment. No replay, alternative rewards or provenance claim. */
export async function recordIgnitionRagEpisode(
  environment: AgentEnvironment,
  policy: LearningPolicy | Policy,
  options: TrajectoryRecordingOptions,
): Promise<RecordedTrajectoryEpisode> {
  validateIdentity(options);
  const collectedAt = new Date().toISOString();
  const steps: RecordedTrajectoryStep[] = [];
  const episode = await runLearningEpisode(
    recordingEnvironment(environment, options, steps),
    policy,
    {
      maxSteps: options.maxSteps,
      ...(options.seed !== undefined ? { seed: options.seed } : {}),
      policyId: options.policyId,
    },
  );
  if (steps.length === 0) throw new Error("Recording requires an executed transition.");
  const qualityScore = await options.evaluateQuality(episode);
  if (!Number.isFinite(qualityScore) || qualityScore < 0 || qualityScore > 1)
    throw new Error("Observed episode quality must be in [0, 1].");
  return {
    runId: options.runId,
    episodeId: options.episodeId,
    taskId: options.taskId,
    workflowSnapshotId: options.workflowSnapshotId,
    policyId: options.policyId,
    collectedAt,
    done: episode.done,
    truncated: episode.truncated,
    qualityScore,
    steps,
  };
}

function recordingEnvironment(
  environment: AgentEnvironment,
  options: TrajectoryRecordingOptions,
  steps: RecordedTrajectoryStep[],
): AgentEnvironment {
  return {
    reset: (seed) => environment.reset(seed),
    actions: (state) => environment.actions(state),
    async step(state, action) {
      if (!options.fields.actionNames.includes(action.name))
        throw new Error("Recorded action is not in the authorized registry.");
      const recordedState = redactTrajectoryFields(
        state.observation,
        options.fields.observationFields,
      );
      const input = readArguments(action.input);
      const recordedAction = {
        name: action.name,
        input: redactTrajectoryFields(input, options.fields.argumentFields),
      };
      const startedAt = performance.now();
      const result = await environment.step(state, action);
      const latencyMs = performance.now() - startedAt;
      const costUsd = options.readMeasuredCost?.(result);
      if (costUsd !== undefined && (!Number.isFinite(costUsd) || costUsd < 0))
        throw new Error("Measured transition cost must be finite and nonnegative.");
      steps.push({
        state: recordedState,
        action: recordedAction,
        observation: redactTrajectoryFields(
          result.state.observation,
          options.fields.observationFields,
        ),
        reward: result.reward.score * result.reward.weight,
        done: result.done || result.state.done === true,
        usage: { latencyMs, ...(costUsd !== undefined ? { costUsd } : {}) },
      });
      return result;
    },
  };
}

function readArguments(input: unknown): JsonRecord {
  if (input === undefined) return {};
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Trajectory export requires object action arguments.");
  return input as JsonRecord;
}

function validateIdentity(options: TrajectoryRecordingOptions): void {
  for (const value of [
    options.runId,
    options.episodeId,
    options.taskId,
    options.workflowSnapshotId,
    options.policyId,
  ])
    if (typeof value !== "string" || !value.trim() || value.length > 500)
      throw new Error("Recording identity is missing or too long.");
}
