import { expect, test } from "vitest";
import { featureTasks, trainingContexts } from "./feature-environment";
import { createFeaturePolicies, runFeatureCampaign } from "./features";

test("linear values generalize to held-out context combinations across five seeds without learning on evaluation", async () => {
  const report = await runFeatureCampaign("evaluation");
  expect(report.decision).toBe("allow-feature-policy");
  expect(report.runs).toHaveLength(5);
  expect(
    featureTasks("evaluation").every(
      (task) =>
        !trainingContexts.some(
          (context) =>
            context.taskType === task.taskType &&
            context.verificationRequired === task.verificationRequired &&
            context.toolQuality === task.toolQuality &&
            context.budget === task.budget,
        ),
    ),
  ).toBe(true);
  for (const run of report.runs) {
    expect(run.parameterCount).toBe(144);
    expect(run.unchanged).toBe(true);
    expect(run.linearRewards).toHaveLength(2000);
    expect(run.tabularRewards).toHaveLength(2000);
    expect(
      run.linear.groups.every(
        (group) =>
          group.successRate === 1 &&
          group.successRate >=
            (run.tabular.groups.find((row) => row.group === group.group)?.successRate ?? Infinity),
      ),
    ).toBe(true);
    expect(run.linear.cases.every((item) => !item.truncated)).toBe(true);
  }
  const policies = await createFeaturePolicies(1);
  const count = Object.values(policies.linear.snapshot()).reduce(
    (sum, values) => sum + values.length,
    0,
  );
  expect(count).toBe(144);
});
