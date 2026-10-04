import {
  evaluatePolicyOffline,
  type OfflinePolicyEvaluationRecord,
  type PolicyEvaluationResult,
} from "./offline-policy-evaluation";
import type { Policy } from "./policy";
import { ExperimentalBanditStrategySelector } from "./strategy-bandit";

export interface PolicyOptimizationCandidate<TAction> {
  id: string;
  policy: Policy<TAction>;
}

export interface PolicyOptimizationOptions<TAction> {
  candidates: readonly PolicyOptimizationCandidate<TAction>[];
  trainingRecords: readonly OfflinePolicyEvaluationRecord<TAction>[];
  evaluationRecords: readonly OfflinePolicyEvaluationRecord<TAction>[];
}

export interface PolicyOptimizationReport<TAction> {
  schemaVersion: "ignition.policy-selection.v1";
  selectedPolicyId: string;
  reason: string;
  training: PolicyEvaluationResult<TAction>[];
  evaluation: PolicyEvaluationResult<TAction>[];
}

/** Full-information offline selection; evaluation rewards never update the bandit. */
export async function optimizePolicyOffline<TAction>(
  options: PolicyOptimizationOptions<TAction>,
): Promise<PolicyOptimizationReport<TAction>> {
  validateOptions(options);
  const bandit = new ExperimentalBanditStrategySelector(
    options.candidates.map(({ id }) => ({ id, strategy: id })),
    { epsilon: 0 },
  );
  const training = await evaluateCandidates(options.candidates, options.trainingRecords);
  for (const result of training) {
    for (const decision of result.decisions) {
      if (result.policyId === undefined) throw new Error("Evaluated policy id is required.");
      bandit.update(result.policyId, decision.reward);
    }
  }
  const selected = bandit.select();
  return {
    schemaVersion: "ignition.policy-selection.v1",
    selectedPolicyId: selected.id,
    reason: `Selected ${selected.id} with highest training mean reward ${selected.averageReward.toFixed(3)} over ${selected.pulls} records. Ties use policy id. Evaluation records were excluded from selection.`,
    training,
    evaluation: await evaluateCandidates(options.candidates, options.evaluationRecords),
  };
}

async function evaluateCandidates<TAction>(
  candidates: readonly PolicyOptimizationCandidate<TAction>[],
  records: readonly OfflinePolicyEvaluationRecord<TAction>[],
): Promise<PolicyEvaluationResult<TAction>[]> {
  const results: PolicyEvaluationResult<TAction>[] = [];
  for (const candidate of candidates) {
    results.push(
      await evaluatePolicyOffline(candidate.policy, records, { policyId: candidate.id }),
    );
  }
  return results.sort(
    (a, b) =>
      b.averageReward - a.averageReward || (a.policyId ?? "").localeCompare(b.policyId ?? ""),
  );
}

function validateOptions<TAction>(options: PolicyOptimizationOptions<TAction>): void {
  if (options.candidates.length === 0) throw new Error("Policy candidates are required.");
  const policyIds = options.candidates.map(({ id }) => id);
  if (policyIds.some((id) => !id.trim()) || new Set(policyIds).size !== policyIds.length) {
    throw new Error("Policy ids must be nonempty and unique.");
  }
  const trainingIds = validateRecordIds(options.trainingRecords);
  const evaluationIds = validateRecordIds(options.evaluationRecords);
  if (evaluationIds.some((id) => trainingIds.includes(id))) {
    throw new Error("Training and evaluation record ids must be disjoint.");
  }
}

function validateRecordIds<TAction>(records: readonly OfflinePolicyEvaluationRecord<TAction>[]) {
  const ids = records.map(({ id }) => id);
  if (ids.length === 0 || ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error("Each split requires nonempty records with unique ids.");
  }
  return ids;
}
