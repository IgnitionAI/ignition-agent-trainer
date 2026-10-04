import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type {
  EnvironmentAction,
  EnvironmentState,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import {
  type LearningEpisodeResult,
  recordEpisodeTrajectory,
  runLearningEpisode,
  TabularQLearningPolicy,
} from "@ignitionai/agent-trainer-rl";
import { createOrderPolicy, OrderEnvironment, type OrderTask } from "./agent";

export const trainingTasks: OrderTask[] = Array.from({ length: 6 }, (_, index) => ({
  id: `calibration-${index}`,
  product: `training-product-${index}`,
  quantity: (index % 3) + 1,
  unitPrice: index + 2,
}));

export const evaluationTasks: OrderTask[] = Array.from({ length: 24 }, (_, index) => ({
  id: `held-out-${index}`,
  product: `new-product-${index}`,
  quantity: index + 4,
  unitPrice: index + 20,
}));

/** Only observable categories; no task id, hidden price, expected output or reward. */
export function encodeOrderState(state: EnvironmentState): string {
  return [
    state.done === true ? "terminal" : "active",
    state.observation.quantity === 1 ? "single" : "multiple",
    typeof state.observation.unitPrice === "number" ? "price" : "no-price",
    typeof state.observation.total === "number" ? "total" : "no-total",
  ].join(":");
}

export function bindOrderAction(
  state: EnvironmentState,
  action: EnvironmentAction,
): EnvironmentAction {
  if (action.name !== "answer") return action;
  return { ...action, input: state.observation.total ?? state.observation.unitPrice ?? 0 };
}

export function createOrderLearner(seed: number) {
  return new TabularQLearningPolicy({
    alpha: 0.3,
    gamma: 1,
    epsilon: 0.3,
    seed,
    encodeState: encodeOrderState,
    bindAction: bindOrderAction,
  });
}

export async function trainOrderPolicy(seed: number, episodeCount = 400) {
  if (!Number.isSafeInteger(episodeCount) || episodeCount <= 0)
    throw new Error("Training episode count must be positive.");
  const learner = createOrderLearner(seed);
  const rewards: number[] = [];
  let truncated = 0;
  for (let index = 0; index < episodeCount; index += 1) {
    const task = trainingTasks[index % trainingTasks.length];
    if (!task) throw new Error("Training tasks are required.");
    const episode = await runLearningEpisode(new OrderEnvironment(task), learner, {
      maxSteps: 4,
      seed: seed + index,
    });
    rewards.push(episode.totalReward);
    if (episode.truncated) truncated += 1;
  }
  return { learner, rewards, truncated };
}

export async function evaluateOrderPolicy(
  policy: Policy,
  tasks: readonly OrderTask[],
  policyId: string,
) {
  const episodes: LearningEpisodeResult[] = [];
  for (const task of tasks) {
    episodes.push(
      await runLearningEpisode(new OrderEnvironment(task), policy, { maxSteps: 4, policyId }),
    );
  }
  const cases = episodes.map((episode, index) => ({
    taskId: tasks[index]?.id,
    correct: episode.done && episode.finalState.observation.correct === true,
    reward: episode.totalReward,
    toolCalls: episode.steps.filter((step) => step.action.name !== "answer").length,
    actions: episode.steps.map((step) => step.action.name),
    done: episode.done,
    truncated: episode.truncated,
    answer: episode.finalState.observation.answer ?? null,
  }));
  return {
    policyId,
    caseCount: cases.length,
    successRate: cases.length ? cases.filter((item) => item.correct).length / cases.length : 0,
    averageReward: cases.length
      ? cases.reduce((sum, item) => sum + item.reward, 0) / cases.length
      : 0,
    averageToolCalls: cases.length
      ? cases.reduce((sum, item) => sum + item.toolCalls, 0) / cases.length
      : 0,
    cases,
    trajectories: episodes.map((episode, index) =>
      recordEpisodeTrajectory(episode, { id: `${policyId}:${tasks[index]?.id}` }),
    ),
  };
}

export async function runLearningExample(seed = 53) {
  const training = await trainOrderPolicy(seed);
  const tableBefore = training.learner.snapshot();
  const frozen = training.learner.freeze();
  const evaluation = [];
  for (const [id, policy] of [
    ["untrained", createOrderLearner(seed).freeze()],
    ["direct", createOrderPolicy("direct")],
    ["handwritten-react", createOrderPolicy("react")],
    ["q-learning", frozen],
  ] as const) {
    evaluation.push(await evaluateOrderPolicy(policy, evaluationTasks, id));
  }
  const singleItem = await evaluateOrderPolicy(
    frozen,
    [{ id: "single-probe", product: "new-single", quantity: 1, unitPrice: 101 }],
    "q-learning-single",
  );
  return {
    schemaVersion: "ignition.q-learning-example.v1",
    seed,
    parameters: { alpha: 0.3, gamma: 1, epsilon: 0.3, episodeCount: 400, maxSteps: 4 },
    training: {
      taskIds: trainingTasks.map(({ id }) => id),
      rewards: training.rewards,
      truncated: training.truncated,
    },
    evaluationTaskIds: evaluationTasks.map(({ id }) => id),
    evaluation,
    singleItem,
    table: tableBefore,
    unchangedAfterEvaluation:
      JSON.stringify(tableBefore) === JSON.stringify(training.learner.snapshot()),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runLearningExample();
  console.table(
    report.evaluation.map(({ policyId, successRate, averageReward, averageToolCalls }) => ({
      policyId,
      successRate,
      averageReward,
      averageToolCalls,
    })),
  );
  console.log(`Frozen Q table unchanged: ${report.unchangedAfterEvaluation}`);
  const output = process.argv[2];
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/q-learning.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
}
