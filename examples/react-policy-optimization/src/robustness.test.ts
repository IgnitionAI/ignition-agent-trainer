import type { Policy } from "@ignitionai/agent-trainer-environment";
import { expect, test } from "vitest";
import { trainingTasks } from "./learning";
import { compareRobustPolicies, evaluateRobustPolicy, runRobustnessCampaign } from "./robustness";
import { categories, failureAwareReact, robustnessTasks } from "./robustness-environment";

test("generalization campaign is reproducible, disjoint and covers safe failure responses across five seeds", async () => {
  const report = await runRobustnessCampaign();
  expect(await runRobustnessCampaign()).toEqual(report);
  expect(
    robustnessTasks.every(
      (task) =>
        !trainingTasks.some(
          (train) =>
            train.id === task.id ||
            train.product === task.product ||
            (train.quantity === task.quantity && train.unitPrice === task.unitPrice),
        ),
    ),
  ).toBe(true);
  expect(report.runs).toHaveLength(5);
  expect(report.decision).toBe("allow-richer-state-experiment");
  for (const { learned, baseline, gate } of report.runs) {
    expect(gate.passed).toBe(true);
    expect(learned.cases.map(({ taskId }) => taskId)).toEqual(
      baseline.cases.map(({ taskId }) => taskId),
    );
    expect(learned.categories).toHaveLength(categories.length);
    expect(
      learned.categories.every(
        (group) =>
          group.caseCount === 10 &&
          group.successRate === 1 &&
          group.unsupportedAnswers === 0 &&
          group.truncations === 0,
      ),
    ).toBe(true);
    expect(learned.cases.every((item) => item.attempts <= 2)).toBe(true);
    expect(
      learned.cases
        .filter(({ category }) => category === "transient-error")
        .every((item) => item.attempts === 2 && item.response === "answer"),
    ).toBe(true);
    expect(
      learned.cases
        .filter(({ category }) => category === "missing-price")
        .every((item) => item.response === "abstain" && item.answer === null),
    ).toBe(true);
    expect(
      learned.cases
        .filter(({ category }) => category === "missing-quantity")
        .every((item) => item.response === "clarify" && item.answer === null),
    ).toBe(true);
  }
});

test("gate rejects an executed degraded policy for answer-success regression", async () => {
  const degraded: Policy = {
    async chooseAction(state, actions) {
      const action = await failureAwareReact.chooseAction(state, actions);
      return action.name === "answer" ? { ...action, input: -1 } : action;
    },
  };
  const baseline = await evaluateRobustPolicy(failureAwareReact, robustnessTasks, 1, "reference");
  const wrong = await evaluateRobustPolicy(degraded, robustnessTasks, 1, "degraded");
  const gate = compareRobustPolicies(wrong, baseline);
  expect(gate.passed).toBe(false);
  expect(gate.failures).toContain("new-values: success regression");
  expect(wrong.categories.find(({ category }) => category === "new-values")?.successRate).toBe(0);
  expect(wrong.categories.find(({ category }) => category === "missing-price")?.successRate).toBe(
    1,
  );
  expect(wrong.cases.every((item) => !item.truncated && !item.unsupportedAnswer)).toBe(true);
  expect(() => compareRobustPolicies({ ...wrong, seed: 2 }, baseline)).toThrow(
    "identical tasks and seeds",
  );
  const incomplete = {
    ...baseline,
    categories: baseline.categories.filter((row) => row.category !== "new-values"),
  };
  expect(compareRobustPolicies(incomplete, baseline).failures).toContain(
    "new-values: missing coverage",
  );
});
