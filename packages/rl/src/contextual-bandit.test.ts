import { describe, expect, it } from "vitest";
import {
  type ContextFeatures,
  ContextualBanditStrategySelector,
  scoreContextMatch,
} from "./contextual-bandit";

describe("contextual bandit strategy selector", () => {
  it("selects the arm whose fixed context features best match the task", () => {
    const selector = new ContextualBanditStrategySelector([
      {
        id: "direct-answer",
        strategy: { workflow: "direct" },
        preferredContext: {
          taskType: "faq",
          citationNeed: "none",
          costSensitivity: "high",
          latencySensitivity: "high",
          riskLevel: "low",
        },
      },
      {
        id: "rag-with-verification",
        strategy: { workflow: "rag-verify" },
        preferredContext: {
          taskType: "policy-analysis",
          citationNeed: "required",
          costSensitivity: "medium",
          latencySensitivity: "low",
          riskLevel: "high",
        },
      },
    ]);

    const context: ContextFeatures = {
      taskType: "policy-analysis",
      citationNeed: "required",
      costSensitivity: "medium",
      latencySensitivity: "low",
      riskLevel: "high",
    };

    const selection = selector.select(context);

    expect(selection.arm.id).toBe("rag-with-verification");
    expect(selection.contextScore).toBe(1);
    expect(selection.arm.strategy).toEqual({ workflow: "rag-verify" });
  });

  it("uses observed reward as a deterministic tie-breaker for equally matching arms", () => {
    const selector = new ContextualBanditStrategySelector(
      [
        {
          id: "rag-basic",
          strategy: "rag-basic",
          preferredContext: { taskType: "support", citationNeed: "required" },
        },
        {
          id: "rag-rerank",
          strategy: "rag-rerank",
          preferredContext: { taskType: "support", citationNeed: "required" },
        },
      ],
      { contextWeight: 0.6, rewardWeight: 0.4 },
    );

    selector.update("rag-basic", 0.72);
    selector.update("rag-rerank", 0.91);

    expect(selector.select({ taskType: "support", citationNeed: "required" }).arm.id).toBe(
      "rag-rerank",
    );
  });

  it("supports prior rewards before observed pulls exist", () => {
    const selector = new ContextualBanditStrategySelector(
      [
        {
          id: "low-prior",
          strategy: "a",
          priorReward: 0.2,
          preferredContext: { taskType: "summarization" },
        },
        {
          id: "high-prior",
          strategy: "b",
          priorReward: 0.8,
          preferredContext: { taskType: "summarization" },
        },
      ],
      { contextWeight: 0.5, rewardWeight: 0.5 },
    );

    expect(selector.select({ taskType: "summarization" }).arm.id).toBe("high-prior");
  });

  it("scores partial fixed-feature matches deterministically", () => {
    expect(
      scoreContextMatch(
        {
          taskType: "support",
          citationNeed: "required",
          costSensitivity: "high",
        },
        {
          taskType: "support",
          citationNeed: "optional",
          costSensitivity: "high",
        },
      ),
    ).toBe(2 / 3);
  });

  it("handles empty arms and tied behavior predictably", () => {
    expect(() => new ContextualBanditStrategySelector([]).select()).toThrow(
      "Contextual bandit selector has no arms.",
    );

    const selector = new ContextualBanditStrategySelector([
      { id: "beta", strategy: "beta", preferredContext: { taskType: "faq" } },
      { id: "alpha", strategy: "alpha", preferredContext: { taskType: "faq" } },
    ]);

    expect(selector.select({ taskType: "faq" }).arm.id).toBe("alpha");
  });

  it("rejects invalid contextual bandit inputs", () => {
    expect(
      () =>
        new ContextualBanditStrategySelector([
          { id: "duplicate", strategy: "a" },
          { id: "duplicate", strategy: "b" },
        ]),
    ).toThrow("Duplicate contextual bandit arm: duplicate");
    expect(() => new ContextualBanditStrategySelector([], { contextWeight: Number.NaN })).toThrow(
      "Contextual bandit contextWeight must be a non-negative finite number.",
    );
    expect(
      () =>
        new ContextualBanditStrategySelector([{ id: "bad", strategy: "bad", priorReward: NaN }]),
    ).toThrow("Contextual bandit prior reward must be finite for arm: bad");

    const selector = new ContextualBanditStrategySelector([{ id: "known", strategy: "known" }]);

    expect(() => selector.update("known", Number.POSITIVE_INFINITY)).toThrow(
      "Contextual bandit reward must be finite.",
    );
    expect(() => selector.update("missing", 1)).toThrow("Unknown contextual bandit arm: missing");
  });
});
