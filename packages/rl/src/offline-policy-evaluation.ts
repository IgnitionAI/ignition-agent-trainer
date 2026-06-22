import type { JsonValue, Metadata } from "@ignitionai/agent-trainer-core";
import type { Policy, PolicyCandidate, PolicyContext, PolicyDecision } from "./policy";
import type { Trajectory, TrajectoryStep } from "./trajectory";

export interface OfflinePolicyEvaluationRecord<TAction = unknown> {
  id: string;
  context: PolicyContext<TAction>;
  rewardByCandidateId: Record<string, number>;
  expectedCandidateId?: string;
  metadata?: Metadata;
}

export interface OfflinePolicyDecision<TAction = unknown> {
  recordId: string;
  candidateId: string;
  reward: number;
  decision: PolicyDecision<TAction>;
  expectedCandidateId?: string;
  matchedExpected?: boolean;
  metadata?: Metadata;
}

export interface OfflinePolicyCandidateSummary {
  candidateId: string;
  selections: number;
  totalReward: number;
  averageReward: number;
  expectedSelections: number;
}

export interface PolicyEvaluationResult<TAction = unknown> {
  policyId?: string;
  recordCount: number;
  totalReward: number;
  averageReward: number;
  accuracy?: number;
  decisions: Array<OfflinePolicyDecision<TAction>>;
  candidateSummaries: OfflinePolicyCandidateSummary[];
  metadata?: Metadata;
}

export interface EvaluatePolicyOfflineOptions {
  policyId?: string;
  metadata?: Metadata;
}

export interface TrajectoryOfflineRecordOptions {
  experimentName?: string;
  metadata?: Metadata;
}

export async function evaluatePolicyOffline<TAction>(
  policy: Policy<TAction>,
  records: readonly OfflinePolicyEvaluationRecord<TAction>[],
  options: EvaluatePolicyOfflineOptions = {},
): Promise<PolicyEvaluationResult<TAction>> {
  const decisions: Array<OfflinePolicyDecision<TAction>> = [];

  for (const record of records) {
    validateRecord(record);
    const decision = await policy.decide(record.context);
    const reward = record.rewardByCandidateId[decision.candidateId];
    if (typeof reward !== "number" || !Number.isFinite(reward)) {
      throw new Error(
        `Offline policy reward missing or non-finite for record ${record.id} and candidate ${decision.candidateId}.`,
      );
    }

    decisions.push({
      recordId: record.id,
      candidateId: decision.candidateId,
      reward,
      decision,
      ...(record.expectedCandidateId !== undefined
        ? {
            expectedCandidateId: record.expectedCandidateId,
            matchedExpected: decision.candidateId === record.expectedCandidateId,
          }
        : {}),
      ...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
    });
  }

  const totalReward = decisions.reduce((sum, decision) => sum + decision.reward, 0);
  const result: PolicyEvaluationResult<TAction> = {
    ...(options.policyId !== undefined ? { policyId: options.policyId } : {}),
    recordCount: records.length,
    totalReward,
    averageReward: decisions.length === 0 ? 0 : totalReward / decisions.length,
    decisions,
    candidateSummaries: summarizeCandidates(decisions),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  };

  const expectedDecisions = decisions.filter(
    (decision) => decision.expectedCandidateId !== undefined,
  );
  if (expectedDecisions.length > 0) {
    const matched = expectedDecisions.filter((decision) => decision.matchedExpected).length;
    result.accuracy = matched / expectedDecisions.length;
  }

  return result;
}

export function createOfflinePolicyRecordsFromTrajectories(
  trajectories: readonly Trajectory[],
  options: TrajectoryOfflineRecordOptions = {},
): Array<OfflinePolicyEvaluationRecord<JsonValue>> {
  const records: Array<OfflinePolicyEvaluationRecord<JsonValue>> = [];

  for (const trajectory of trajectories) {
    for (const step of trajectory.steps) {
      const candidate = createObservedCandidate(step);
      records.push({
        id: `${trajectory.id}:${step.index}`,
        context: {
          candidates: [candidate],
          ...(options.experimentName !== undefined
            ? { experimentName: options.experimentName }
            : {}),
          metadata: {
            trajectoryId: trajectory.id,
            stepIndex: step.index,
            state: step.state,
          },
        },
        rewardByCandidateId: {
          [candidate.id]: step.reward,
        },
        expectedCandidateId: candidate.id,
        metadata: {
          ...(options.metadata ?? {}),
          trajectoryId: trajectory.id,
          stepIndex: step.index,
        },
      });
    }
  }

  return records.sort((a, b) => a.id.localeCompare(b.id));
}

function validateRecord<TAction>(record: OfflinePolicyEvaluationRecord<TAction>): void {
  if (!record.id.trim()) throw new Error("Offline policy record id is required.");
  if (record.context.candidates.length === 0) {
    throw new Error(`Offline policy record has no candidates: ${record.id}`);
  }

  for (const [candidateId, reward] of Object.entries(record.rewardByCandidateId)) {
    if (!candidateId.trim()) {
      throw new Error(`Offline policy reward candidate id is required for record ${record.id}.`);
    }
    if (!Number.isFinite(reward)) {
      throw new Error(
        `Offline policy reward must be finite for record ${record.id} and candidate ${candidateId}.`,
      );
    }
  }
}

function summarizeCandidates<TAction>(
  decisions: readonly OfflinePolicyDecision<TAction>[],
): OfflinePolicyCandidateSummary[] {
  const summaries = new Map<string, OfflinePolicyCandidateSummary>();

  for (const decision of decisions) {
    const summary = summaries.get(decision.candidateId) ?? {
      candidateId: decision.candidateId,
      selections: 0,
      totalReward: 0,
      averageReward: 0,
      expectedSelections: 0,
    };

    summary.selections += 1;
    summary.totalReward += decision.reward;
    summary.averageReward = summary.totalReward / summary.selections;
    if (decision.expectedCandidateId === decision.candidateId) summary.expectedSelections += 1;
    summaries.set(decision.candidateId, summary);
  }

  return Array.from(summaries.values()).sort(
    (a, b) =>
      b.averageReward - a.averageReward ||
      b.selections - a.selections ||
      a.candidateId.localeCompare(b.candidateId),
  );
}

function createObservedCandidate(step: TrajectoryStep): PolicyCandidate<JsonValue> {
  return {
    id: actionId(step.action),
    action: step.action,
    score: step.reward,
  };
}

function actionId(action: JsonValue): string {
  if (typeof action === "string") return action;
  if (isRecord(action)) {
    const id = action.id;
    if (typeof id === "string" && id.trim()) return id;
    const name = action.name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return JSON.stringify(action);
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
