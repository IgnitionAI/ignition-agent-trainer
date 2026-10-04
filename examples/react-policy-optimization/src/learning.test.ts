import { expect, test } from "vitest";
import { evaluationTasks, runLearningExample, trainingTasks } from "./learning";

test("learning is reproducible and solves 24 new price/quantity pairs with a frozen policy", async () => {
  const report = await runLearningExample();
  expect(await runLearningExample()).toEqual(report);
  expect(evaluationTasks).toHaveLength(24);
  expect(
    evaluationTasks.every(
      (task) =>
        !trainingTasks.some(
          (train) =>
            train.quantity === task.quantity ||
            train.unitPrice === task.unitPrice ||
            train.id === task.id,
        ),
    ),
  ).toBe(true);
  const learned = report.evaluation.find(({ policyId }) => policyId === "q-learning");
  const baseline = report.evaluation.find(({ policyId }) => policyId === "handwritten-react");
  const direct = report.evaluation.find(({ policyId }) => policyId === "direct");
  expect(learned?.successRate).toBe(1);
  expect(learned?.averageReward).toBeCloseTo(0.96);
  expect(learned?.averageReward).toBeGreaterThan(direct?.averageReward ?? Infinity);
  expect(learned?.averageReward).toBe(baseline?.averageReward);
  expect(
    learned?.cases.every(
      (item) => item.actions.join(",") === "lookup_price,calculate_total,answer",
    ),
  ).toBe(true);
  expect(report.singleItem.cases[0]?.actions).toEqual(["lookup_price", "answer"]);
  expect(report.singleItem.cases[0]?.answer).toBe(101);
  expect(report.unchangedAfterEvaluation).toBe(true);
  expect(report.training.rewards).toHaveLength(400);
});
