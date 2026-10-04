import { runEpisode } from "@ignitionai/agent-trainer-environment";
import { expect, test } from "vitest";
import { createOrderPolicy, OrderEnvironment } from "./agent";
import { runExample } from "./index";

test("ReAct uses tool observations and skips calculation for a single item", async () => {
  for (const quantity of [1, 4]) {
    const episode = await runEpisode(
      new OrderEnvironment({ id: "order", product: "pen", quantity, unitPrice: 13 }),
      createOrderPolicy("react"),
      { maxSteps: 4 },
    );
    expect(episode.finalState.observation.answer).toBe(13 * quantity);
    expect(episode.steps.map((step) => step.action.name)).toEqual(
      quantity === 1 ? ["lookup_price", "answer"] : ["lookup_price", "calculate_total", "answer"],
    );
  }
});

test("framework selects a tool-using policy and verifies it on separate orders", async () => {
  const { report, trajectories } = await runExample();
  expect(report.selectedPolicyId).toBe("react");
  const rewards = Object.fromEntries(
    report.evaluation.map((row) => [row.policyId, row.averageReward]),
  );
  expect(rewards.react).toBeCloseTo(0.97);
  expect(rewards.lookup).toBeCloseTo(0.48);
  expect(rewards.direct).toBe(0);
  expect(trajectories).toHaveLength(15);
  expect(trajectories.every((trajectory) => trajectory.steps.at(-1)?.outcome)).toBe(true);
});
