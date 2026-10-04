import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { EnvironmentState, Policy } from "@ignitionai/agent-trainer-environment";
import {
  fitObservationFeatureEncoder,
  type LearningPolicy,
  LinearQLearningPolicy,
  runLearningEpisode,
  TabularQLearningPolicy,
} from "@ignitionai/agent-trainer-rl";
import {
  FeatureOrderEnvironment,
  type FeatureOrderTask,
  featureTasks,
  verificationAwareReact,
} from "./feature-environment";
import { bindOrderAction } from "./learning";

const actionNames = [
  "lookup_price",
  "calculate_total",
  "answer",
  "verify_total",
  "abstain",
  "clarify",
];
const schema = {
  id: "observable-order-features",
  version: 1,
  numeric: ["verificationPending", "verificationRequired", "remainingBudget", "toolQuality"],
  categorical: {
    phase: ["lookup", "single", "calculate", "total"],
    taskType: ["order", "invoice"],
    errorKind: ["none", "transient", "permanent", "not-found", "missing-price", "invalid-response"],
  },
};

export const featureProtocol = {
  seeds: [1, 2, 3, 4, 5],
  episodeCount: 2000,
  alphaLinear: 0.01,
  alphaTabular: 0.3,
  gamma: 1,
  epsilon: 0.3,
  minimumSuccessDelta: 0,
  minimumAbsoluteSuccess: 1,
} as const;

async function calibrationStates(tasks: readonly FeatureOrderTask[]) {
  const states: EnvironmentState[] = [];
  for (const task of tasks) {
    const episode = await runLearningEpisode(
      new FeatureOrderEnvironment(task),
      verificationAwareReact,
      { maxSteps: task.budget },
    );
    for (const step of episode.steps) states.push(step.state);
  }
  return states;
}

export async function createFeaturePolicies(seed: number) {
  const tasks = featureTasks("train");
  const encoder = fitObservationFeatureEncoder(schema, await calibrationStates(tasks));
  const linear = new LinearQLearningPolicy({
    alpha: featureProtocol.alphaLinear,
    gamma: featureProtocol.gamma,
    epsilon: featureProtocol.epsilon,
    seed,
    actionNames,
    encoder,
    bindAction: bindOrderAction,
  });
  const tabular = new TabularQLearningPolicy({
    alpha: featureProtocol.alphaTabular,
    gamma: featureProtocol.gamma,
    epsilon: featureProtocol.epsilon,
    seed,
    encodeState: (state) => JSON.stringify(encoder.encode(state)),
    bindAction: bindOrderAction,
  });
  return { encoder, linear, tabular };
}

async function train(policy: LearningPolicy, seed: number) {
  const tasks = featureTasks("train");
  const rewards: number[] = [];
  for (let index = 0; index < featureProtocol.episodeCount; index += 1) {
    const task = tasks[index % tasks.length];
    if (!task) throw new Error("Feature training tasks required.");
    const episode = await runLearningEpisode(new FeatureOrderEnvironment(task), policy, {
      maxSteps: task.budget,
      seed: seed + index,
    });
    rewards.push(episode.totalReward);
  }
  return rewards;
}

export async function evaluateFeaturePolicy(policy: Policy, tasks: readonly FeatureOrderTask[]) {
  const cases: Array<{
    taskId: string;
    group: string;
    success: boolean;
    reward: number;
    truncated: boolean;
    actions: string[];
  }> = [];
  for (const task of tasks) {
    const episode = await runLearningEpisode(new FeatureOrderEnvironment(task), policy, {
      maxSteps: task.budget,
    });
    cases.push({
      taskId: task.id,
      group: `${task.taskType}:${task.verificationRequired}`,
      success: episode.done && episode.finalState.observation.correct === true,
      reward: episode.totalReward,
      truncated: episode.truncated,
      actions: episode.steps.map((step) => step.action.name),
    });
  }
  const groups = [...new Set(cases.map((item) => item.group))].map((group) => {
    const rows = cases.filter((item) => item.group === group);
    return {
      group,
      caseCount: rows.length,
      successRate: rows.filter((item) => item.success).length / rows.length,
      averageReward: rows.reduce((sum, item) => sum + item.reward, 0) / rows.length,
    };
  });
  return { cases, groups };
}

export async function runFeatureCampaign(split: "validation" | "evaluation") {
  const runs = [];
  for (const seed of featureProtocol.seeds) {
    const policies = await createFeaturePolicies(seed);
    const linearRewards = await train(policies.linear, seed);
    const tabularRewards = await train(policies.tabular, seed);
    const before = JSON.stringify(policies.linear.snapshot());
    const tabularBefore = JSON.stringify(policies.tabular.snapshot());
    const tasks = featureTasks(split);
    const linear = await evaluateFeaturePolicy(policies.linear.freeze(), tasks);
    const tabular = await evaluateFeaturePolicy(policies.tabular.freeze(), tasks);
    const unchanged =
      before === JSON.stringify(policies.linear.snapshot()) &&
      tabularBefore === JSON.stringify(policies.tabular.snapshot());
    const passed =
      unchanged &&
      linear.groups.every(
        (group) =>
          group.successRate >= featureProtocol.minimumAbsoluteSuccess &&
          group.successRate >=
            (tabular.groups.find((row) => row.group === group.group)?.successRate ?? Infinity),
      );
    runs.push({
      seed,
      linear,
      tabular,
      unchanged,
      passed,
      encoder: policies.encoder.descriptor,
      weights: policies.linear.snapshot(),
      parameterCount: Object.values(policies.linear.snapshot()).reduce(
        (sum, weights) => sum + weights.length,
        0,
      ),
      tabularStateCount: policies.tabular.snapshot().length,
      linearRewards,
      tabularRewards,
    });
  }
  return {
    protocol: featureProtocol,
    split,
    trainingTaskIds: featureTasks("train").map(({ id }) => id),
    evaluatedTaskIds: featureTasks(split).map(({ id }) => id),
    runs,
    decision: runs.every(({ passed }) => passed) ? "allow-feature-policy" : "block-feature-policy",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const split = process.argv[2] === "evaluation" ? "evaluation" : "validation";
  const report = await runFeatureCampaign(split);
  console.table(
    report.runs.flatMap((run) =>
      run.linear.groups.map((group) => ({
        seed: run.seed,
        ...group,
        parameters: run.parameterCount,
        passed: run.passed,
      })),
    ),
  );
  console.log(report.decision);
  const output = process.argv[3];
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/features-${split}.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
}
