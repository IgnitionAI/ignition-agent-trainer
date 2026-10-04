import { expect, test } from "vitest";
import type { OfflinePolicyEvaluationRecord } from "./offline-policy-evaluation";
import { createStaticPolicy } from "./policy";
import { optimizePolicyOffline } from "./policy-optimization";

const candidates = ["a", "b"].map((id) => ({ id, policy: createStaticPolicy<string>(id) }));
function record(id: string, a: number, b: number): OfflinePolicyEvaluationRecord<string> {
  return {
    id,
    context: {
      candidates: ["a", "b"].map((candidateId) => ({ id: candidateId, action: candidateId })),
    },
    rewardByCandidateId: { a, b },
  };
}

test("held-out rewards cannot change the selected policy; ties are deterministic", async () => {
  for (const rewards of [
    [1, 0],
    [1, 1],
  ]) {
    const report = await optimizePolicyOffline({
      candidates: [...candidates].reverse(),
      trainingRecords: [record("train", rewards[0] ?? 0, rewards[1] ?? 0)],
      evaluationRecords: [record("eval", 0, 100)],
    });
    expect(report.selectedPolicyId).toBe("a");
    expect(report.evaluation[0]?.policyId).toBe("b");
  }
});

test("rejects contaminated, empty, duplicate or unobserved offline inputs", async () => {
  const valid = {
    candidates,
    trainingRecords: [record("train", 1, 0)],
    evaluationRecords: [record("eval", 0, 1)],
  };
  const missing = record("missing", 1, 0);
  delete missing.rewardByCandidateId.b;
  for (const options of [
    { ...valid, candidates: [] },
    {
      ...valid,
      candidates: [candidates[0], candidates[0]].filter((candidate) => candidate !== undefined),
    },
    { ...valid, trainingRecords: [] },
    { ...valid, evaluationRecords: valid.trainingRecords },
    { ...valid, trainingRecords: [missing] },
  ]) {
    await expect(optimizePolicyOffline(options)).rejects.toThrow();
  }
});
