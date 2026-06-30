import type { JsonRecord, JsonValue, Metadata } from "@ignitionai/agent-trainer-core";
import type { EnvironmentAction, EpisodeResult } from "@ignitionai/agent-trainer-environment";
import {
  recordTrajectory,
  summarizeTrajectory,
  type Trajectory,
  type TrajectorySummary,
} from "./trajectory";

export interface RecordEpisodeTrajectoryOptions {
  id?: string;
  startedAt?: string | Date;
  endedAt?: string | Date;
  metadata?: Metadata;
}

export interface TrajectoryReportOptions {
  generatedAt?: string | Date;
  metadata?: Metadata;
}

export interface TrajectoryReportStep {
  index: number;
  state: JsonRecord;
  action: JsonValue;
  reward: number;
  outcome?: JsonValue;
  metadata?: Metadata;
}

export interface TrajectoryReport {
  schemaVersion: "ignition.trajectory-report.v1";
  generatedAt: string;
  trajectory: {
    id: string;
    policyId?: string;
    startedAt?: string;
    endedAt?: string;
    metadata?: Metadata;
  };
  summary: TrajectorySummary;
  steps: TrajectoryReportStep[];
  metadata?: Metadata;
}

export function recordEpisodeTrajectory(
  episode: EpisodeResult,
  options: RecordEpisodeTrajectoryOptions = {},
): Trajectory {
  return recordTrajectory(
    episode.steps.map((step) => ({
      state: {
        stateId: step.state.id,
        observation: step.state.observation,
        done: step.state.done === true,
      },
      action: actionToTrajectoryAction(step.action),
      reward: step.reward.score * step.reward.weight,
      outcome: {
        nextStateId: step.nextState.id,
        done: step.done,
      },
      metadata: {
        rewardName: step.reward.name,
        rewardScore: step.reward.score,
        rewardWeight: step.reward.weight,
        nextObservation: step.nextState.observation,
        ...(step.metadata ?? {}),
      },
    })),
    {
      id: options.id ?? "episode-trajectory",
      ...(episode.policyId !== undefined ? { policyId: episode.policyId } : {}),
      ...(options.startedAt !== undefined ? { startedAt: options.startedAt } : {}),
      ...(options.endedAt !== undefined ? { endedAt: options.endedAt } : {}),
      metadata: {
        ...(episode.metadata ?? {}),
        ...(options.metadata ?? {}),
      },
    },
  );
}

export function exportTrajectoryReport(
  trajectory: Trajectory,
  options: TrajectoryReportOptions = {},
): TrajectoryReport {
  return {
    schemaVersion: "ignition.trajectory-report.v1",
    generatedAt: normalizeTimestamp(options.generatedAt),
    trajectory: {
      id: trajectory.id,
      ...(trajectory.policyId !== undefined ? { policyId: trajectory.policyId } : {}),
      ...(trajectory.startedAt !== undefined ? { startedAt: trajectory.startedAt } : {}),
      ...(trajectory.endedAt !== undefined ? { endedAt: trajectory.endedAt } : {}),
      ...(trajectory.metadata !== undefined ? { metadata: trajectory.metadata } : {}),
    },
    summary: summarizeTrajectory(trajectory),
    steps: trajectory.steps.map((step) => ({
      index: step.index,
      state: step.state,
      action: step.action,
      reward: step.reward,
      ...(step.outcome !== undefined ? { outcome: step.outcome } : {}),
      ...(step.metadata !== undefined ? { metadata: step.metadata } : {}),
    })),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  };
}

export function toMarkdownTrajectoryReport(report: TrajectoryReport): string {
  const sections = [
    `# Trajectory report: ${report.trajectory.id}`,
    [
      `Generated: ${report.generatedAt}`,
      `Policy: ${report.trajectory.policyId ?? "n/a"}`,
      `Steps: ${report.summary.stepCount}`,
      `Total reward: ${formatReward(report.summary.totalReward)}`,
      `Average reward: ${formatReward(report.summary.averageReward)}`,
    ].join("\n"),
    "## Actions",
    actionTable(report.summary.actionCounts),
    "## Steps",
    stepTable(report.steps),
  ];

  return `${sections.join("\n\n")}\n`;
}

function actionToTrajectoryAction(action: EnvironmentAction): JsonRecord {
  return {
    id: action.name,
    name: action.name,
    ...(action.input !== undefined ? { input: action.input } : {}),
  };
}

function actionTable(actionCounts: Record<string, number>): string {
  const rows = Object.entries(actionCounts);
  if (rows.length === 0) return "No actions recorded.";

  return [
    "| Action | Count |",
    "|---|---:|",
    ...rows.map(([action, count]) => `| ${action} | ${count} |`),
  ].join("\n");
}

function stepTable(steps: readonly TrajectoryReportStep[]): string {
  if (steps.length === 0) return "No steps recorded.";

  return [
    "| Step | Action | Reward | Done |",
    "|---:|---|---:|---|",
    ...steps.map(
      (step) =>
        `| ${step.index} | ${actionName(step.action)} | ${formatReward(step.reward)} | ${isDone(step.outcome) ? "yes" : "no"} |`,
    ),
  ].join("\n");
}

function actionName(action: JsonValue): string {
  if (typeof action === "string") return action;
  if (isRecord(action)) {
    const name = action.name;
    if (typeof name === "string") return name;
    const id = action.id;
    if (typeof id === "string") return id;
  }
  return JSON.stringify(action);
}

function isDone(outcome: JsonValue | undefined): boolean {
  return isRecord(outcome) && outcome.done === true;
}

function formatReward(value: number): string {
  return value.toFixed(3);
}

function normalizeTimestamp(value: string | Date | undefined): string {
  if (value === undefined) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
