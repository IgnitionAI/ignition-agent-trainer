import { describe, expect, it } from "vitest";
import {
  createOfflinePolicyRecordsFromTrajectories,
  evaluatePolicyOffline,
  type OfflinePolicyEvaluationRecord,
} from "./offline-policy-evaluation";
import { createScoreBasedPolicy, createStaticPolicy, type PolicyContext } from "./policy";
import { recordTrajectory } from "./trajectory";

type StrategyAction = { strategyId: string };

describe("offline policy evaluation", () => {
  it("evaluates a policy against deterministic offline records", async () => {
    const result = await evaluatePolicyOffline(
      createStaticPolicy<StrategyAction>("rag-basic"),
      [
        record("case-1", context(0.8, 0.6), { "rag-basic": 0.8, direct: 0.6 }, "rag-basic"),
        record("case-2", context(0.7, 0.9), { "rag-basic": 0.7, direct: 0.9 }, "direct"),
      ],
      { policyId: "static-rag" },
    );

    expect(result).toMatchObject({
      policyId: "static-rag",
      recordCount: 2,
      totalReward: 1.5,
      averageReward: 0.75,
      accuracy: 0.5,
    });
    expect(result.decisions.map((decision) => [decision.recordId, decision.candidateId])).toEqual([
      ["case-1", "rag-basic"],
      ["case-2", "rag-basic"],
    ]);
    expect(result.candidateSummaries).toEqual([
      {
        candidateId: "rag-basic",
        selections: 2,
        totalReward: 1.5,
        averageReward: 0.75,
        expectedSelections: 1,
      },
    ]);
  });

  it("supports score-based policies and sorted candidate summaries", async () => {
    const result = await evaluatePolicyOffline(createScoreBasedPolicy<StrategyAction>(), [
      record("case-1", context(0.4, 0.9), { "rag-basic": 0.4, direct: 0.9 }, "direct"),
      record("case-2", context(0.95, 0.3), { "rag-basic": 0.95, direct: 0.3 }, "rag-basic"),
      record("case-3", context(0.7, 0.2), { "rag-basic": 0.7, direct: 0.2 }, "rag-basic"),
    ]);

    expect(result.totalReward).toBe(2.55);
    expect(result.accuracy).toBe(1);
    expect(result.candidateSummaries.map((summary) => summary.candidateId)).toEqual([
      "direct",
      "rag-basic",
    ]);
  });

  it("converts recorded trajectories into offline records", async () => {
    const trajectories = [
      recordTrajectory(
        [
          { state: { task: "faq" }, action: { id: "direct" }, reward: 0.7 },
          { state: { task: "policy" }, action: { id: "rag-basic" }, reward: 0.9 },
        ],
        { id: "trajectory-a" },
      ),
    ];

    const records = createOfflinePolicyRecordsFromTrajectories(trajectories, {
      experimentName: "trajectory-eval",
    });

    expect(records.map((entry) => entry.id)).toEqual(["trajectory-a:0", "trajectory-a:1"]);
    const secondRecord = records[1];
    if (secondRecord === undefined) throw new Error("Expected second trajectory record.");
    expect(secondRecord.context.experimentName).toBe("trajectory-eval");

    const result = await evaluatePolicyOffline(createStaticPolicy("rag-basic"), [secondRecord]);

    expect(result.totalReward).toBe(0.9);
    expect(result.accuracy).toBe(1);
  });

  it("summarizes empty offline evaluations deterministically", async () => {
    await expect(evaluatePolicyOffline(createScoreBasedPolicy(), [])).resolves.toEqual({
      recordCount: 0,
      totalReward: 0,
      averageReward: 0,
      decisions: [],
      candidateSummaries: [],
    });
  });

  it("reports invalid offline records predictably", async () => {
    await expect(
      evaluatePolicyOffline(createStaticPolicy("missing"), [
        record("case-1", context(0.5, 0.4), { direct: 0.4 }),
      ]),
    ).rejects.toThrow("Static policy candidate not found: missing");

    await expect(
      evaluatePolicyOffline(createStaticPolicy("rag-basic"), [
        record("case-2", context(0.5, 0.4), { direct: 0.4 }),
      ]),
    ).rejects.toThrow(
      "Offline policy reward missing or non-finite for record case-2 and candidate rag-basic.",
    );

    await expect(
      evaluatePolicyOffline(createStaticPolicy("rag-basic"), [
        record("", context(0.5, 0.4), { "rag-basic": 0.5 }),
      ]),
    ).rejects.toThrow("Offline policy record id is required.");

    await expect(
      evaluatePolicyOffline(createStaticPolicy("rag-basic"), [
        {
          id: "empty-candidates",
          context: { candidates: [] },
          rewardByCandidateId: {},
        },
      ]),
    ).rejects.toThrow("Offline policy record has no candidates: empty-candidates");

    await expect(
      evaluatePolicyOffline(createStaticPolicy("rag-basic"), [
        record("case-3", context(0.5, 0.4), { "rag-basic": Number.NaN }),
      ]),
    ).rejects.toThrow(
      "Offline policy reward must be finite for record case-3 and candidate rag-basic.",
    );
  });
});

function context(ragScore: number, directScore: number): PolicyContext<StrategyAction> {
  return {
    candidates: [
      { id: "rag-basic", action: { strategyId: "rag-basic" }, score: ragScore },
      { id: "direct", action: { strategyId: "direct" }, score: directScore },
    ],
  };
}

function record(
  id: string,
  policyContext: PolicyContext<StrategyAction>,
  rewardByCandidateId: Record<string, number>,
  expectedCandidateId?: string,
): OfflinePolicyEvaluationRecord<StrategyAction> {
  return {
    id,
    context: policyContext,
    rewardByCandidateId,
    ...(expectedCandidateId !== undefined ? { expectedCandidateId } : {}),
  };
}
