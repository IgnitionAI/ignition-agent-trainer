import type { JsonRecord, JsonValue, Metadata } from "@ignitionai/core";

export interface TrajectoryStep {
  index: number;
  state: JsonRecord;
  action: JsonValue;
  reward: number;
  outcome?: JsonValue;
  metadata?: Metadata;
}

export interface Trajectory {
  id: string;
  steps: TrajectoryStep[];
  policyId?: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: Metadata;
}

export interface TrajectoryStepInput {
  state: JsonRecord;
  action: JsonValue;
  reward: number;
  outcome?: JsonValue;
  metadata?: Metadata;
}

export interface RecordTrajectoryOptions {
  id?: string;
  policyId?: string;
  startedAt?: string | Date;
  endedAt?: string | Date;
  metadata?: Metadata;
}

export interface TrajectorySummary {
  trajectoryId: string;
  stepCount: number;
  totalReward: number;
  averageReward: number;
  actionCounts: Record<string, number>;
  policyId?: string;
  minReward?: number;
  maxReward?: number;
  terminalOutcome?: JsonValue;
  metadata?: Metadata;
}

export function recordTrajectory(
  steps: readonly TrajectoryStepInput[],
  options: RecordTrajectoryOptions = {},
): Trajectory {
  const id = options.id ?? "trajectory";
  if (!id.trim()) throw new Error("Trajectory id is required.");

  const trajectory: Trajectory = {
    id,
    steps: steps.map((step, index) => normalizeStep(step, index)),
  };

  if (options.policyId !== undefined) trajectory.policyId = options.policyId;
  if (options.startedAt !== undefined) trajectory.startedAt = normalizeTimestamp(options.startedAt);
  if (options.endedAt !== undefined) trajectory.endedAt = normalizeTimestamp(options.endedAt);
  if (options.metadata !== undefined) trajectory.metadata = options.metadata;
  return trajectory;
}

export function summarizeTrajectory(trajectory: Trajectory): TrajectorySummary {
  const rewards = trajectory.steps.map((step) => step.reward);
  const totalReward = rewards.reduce((sum, reward) => sum + reward, 0);
  const summary: TrajectorySummary = {
    trajectoryId: trajectory.id,
    stepCount: trajectory.steps.length,
    totalReward,
    averageReward: rewards.length === 0 ? 0 : totalReward / rewards.length,
    actionCounts: summarizeActionCounts(trajectory.steps),
  };

  if (trajectory.policyId !== undefined) summary.policyId = trajectory.policyId;
  if (rewards.length > 0) {
    summary.minReward = Math.min(...rewards);
    summary.maxReward = Math.max(...rewards);
  }

  const finalStep = trajectory.steps[trajectory.steps.length - 1];
  if (finalStep?.outcome !== undefined) summary.terminalOutcome = finalStep.outcome;
  if (trajectory.metadata !== undefined) summary.metadata = trajectory.metadata;
  return summary;
}

function normalizeStep(step: TrajectoryStepInput, index: number): TrajectoryStep {
  if (!Number.isFinite(step.reward))
    throw new Error(`Trajectory reward must be finite at step ${index}.`);

  const normalized: TrajectoryStep = {
    index,
    state: { ...step.state },
    action: cloneJson(step.action),
    reward: step.reward,
  };

  if (step.outcome !== undefined) normalized.outcome = cloneJson(step.outcome);
  if (step.metadata !== undefined) normalized.metadata = step.metadata;
  return normalized;
}

function summarizeActionCounts(steps: readonly TrajectoryStep[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const step of steps) {
    const key = actionKey(step.action);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

function actionKey(action: JsonValue): string {
  if (typeof action === "string") return action;
  if (isRecord(action)) {
    const id = action.id;
    if (typeof id === "string") return id;
    const name = action.name;
    if (typeof name === "string") return name;
  }
  return JSON.stringify(action);
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeTimestamp(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isRecord(value: JsonValue): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
