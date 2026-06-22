import { describe, expect, it } from "vitest";
import { recordTrajectory, summarizeTrajectory } from "./trajectory";

describe("trajectory recorder", () => {
  it("records state, action, reward and outcome steps with deterministic indexes", () => {
    const trajectory = recordTrajectory(
      [
        {
          state: { task: "contract", risk: "medium" },
          action: { id: "rag-basic", topK: 5 },
          reward: 0.7,
        },
        {
          state: { task: "contract", risk: "high" },
          action: { id: "rag-with-verification", verify: true },
          reward: 0.95,
          outcome: { passed: true },
        },
      ],
      {
        id: "trajectory-1",
        policyId: "score-policy",
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        endedAt: "2026-01-01T00:00:02.000Z",
        metadata: { source: "unit-test" },
      },
    );

    expect(trajectory).toMatchObject({
      id: "trajectory-1",
      policyId: "score-policy",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:02.000Z",
      metadata: { source: "unit-test" },
    });
    expect(trajectory.steps.map((step) => step.index)).toEqual([0, 1]);
    expect(trajectory.steps[1]?.outcome).toEqual({ passed: true });
  });

  it("summarizes rewards, terminal outcome and sorted action counts", () => {
    const trajectory = recordTrajectory(
      [
        { state: { step: 1 }, action: { id: "verify" }, reward: 0.9 },
        { state: { step: 2 }, action: { id: "basic" }, reward: 0.6 },
        { state: { step: 3 }, action: { id: "verify" }, reward: 1, outcome: "accepted" },
      ],
      { id: "trajectory-summary", policyId: "policy-a" },
    );

    expect(summarizeTrajectory(trajectory)).toEqual({
      trajectoryId: "trajectory-summary",
      policyId: "policy-a",
      stepCount: 3,
      totalReward: 2.5,
      averageReward: 2.5 / 3,
      minReward: 0.6,
      maxReward: 1,
      terminalOutcome: "accepted",
      actionCounts: {
        basic: 1,
        verify: 2,
      },
    });
  });

  it("summarizes empty trajectories deterministically", () => {
    const trajectory = recordTrajectory([], { id: "empty" });

    expect(summarizeTrajectory(trajectory)).toEqual({
      trajectoryId: "empty",
      stepCount: 0,
      totalReward: 0,
      averageReward: 0,
      actionCounts: {},
    });
  });

  it("rejects invalid trajectory input", () => {
    expect(() => recordTrajectory([], { id: "" })).toThrow("Trajectory id is required.");
    expect(() =>
      recordTrajectory([{ state: {}, action: "bad", reward: Number.NaN }], { id: "bad" }),
    ).toThrow("Trajectory reward must be finite at step 0.");
  });
});
