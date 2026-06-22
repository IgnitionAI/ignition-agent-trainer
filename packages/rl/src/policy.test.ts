import { describe, expect, it } from "vitest";
import { createScoreBasedPolicy, createStaticPolicy, type PolicyContext } from "./policy";

type StrategyAction = { strategyId: string };

const context: PolicyContext<StrategyAction> = {
  experimentName: "policy-test",
  candidates: [
    {
      id: "rag-basic",
      action: { strategyId: "rag-basic" },
      score: 0.82,
      metadata: { family: "rag" },
    },
    {
      id: "direct-answer",
      action: { strategyId: "direct-answer" },
      score: 0.42,
    },
    {
      id: "rag-verify",
      action: { strategyId: "rag-verify" },
      score: 0.91,
    },
  ],
};

describe("policy abstraction helpers", () => {
  it("selects a fixed candidate with createStaticPolicy", async () => {
    const policy = createStaticPolicy<StrategyAction>("rag-basic");

    await expect(Promise.resolve(policy.decide(context))).resolves.toEqual({
      candidateId: "rag-basic",
      action: { strategyId: "rag-basic" },
      reason: "Selected static policy candidate rag-basic.",
      metadata: { family: "rag" },
    });
  });

  it("selects the highest scoring candidate deterministically", async () => {
    const policy = createScoreBasedPolicy<StrategyAction>();

    await expect(Promise.resolve(policy.decide(context))).resolves.toEqual({
      candidateId: "rag-verify",
      action: { strategyId: "rag-verify" },
      score: 0.91,
      reason: "Selected highest scoring policy candidate rag-verify.",
    });
  });

  it("uses deterministic id tie-breaking for equal scores", async () => {
    const policy = createScoreBasedPolicy<StrategyAction>();

    const decision = await policy.decide({
      candidates: [
        { id: "beta", action: { strategyId: "beta" }, score: 1 },
        { id: "alpha", action: { strategyId: "alpha" }, score: 1 },
      ],
    });

    expect(decision.candidateId).toBe("alpha");
  });

  it("supports custom score functions", async () => {
    const policy = createScoreBasedPolicy<StrategyAction>({
      scoreCandidate: (candidate) =>
        candidate.action.strategyId === "direct-answer" ? 1 : (candidate.score ?? 0),
    });

    const decision = await policy.decide(context);

    expect(decision.candidateId).toBe("direct-answer");
    expect(decision.score).toBe(1);
  });

  it("reports invalid policy inputs predictably", async () => {
    expect(() => createStaticPolicy("")).toThrow("Static policy candidate id is required.");
    expect(() => createStaticPolicy("missing").decide(context)).toThrow(
      "Static policy candidate not found: missing",
    );
    expect(() => createScoreBasedPolicy().decide({ candidates: [] })).toThrow(
      "Score-based policy has no candidates.",
    );
    expect(() =>
      createScoreBasedPolicy<StrategyAction>({
        scoreCandidate: () => Number.NaN,
      }).decide(context),
    ).toThrow("Policy candidate score must be finite: rag-basic");
  });
});
