import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Policy } from "@ignitionai/agent-trainer-environment";
import { runLearningEpisode } from "@ignitionai/agent-trainer-rl";
import { trainingTasks, trainOrderPolicy } from "./learning";
import {
  categories,
  failureAwareReact,
  type RobustnessCategory,
  type RobustnessTask,
  RobustOrderEnvironment,
  robustnessTasks,
} from "./robustness-environment";

interface RobustnessCase {
  seed: number;
  taskId: string;
  category: RobustnessCategory;
  success: boolean;
  unsupportedAnswer: boolean;
  response: string | null;
  answer: number | null;
  reward: number;
  toolCalls: number;
  attempts: number;
  truncated: boolean;
}

export const robustnessProtocol = {
  corpusVersion: "robust-orders.v1",
  seeds: [1, 2, 3, 4, 5],
  maxSteps: 4,
  maxLookupAttempts: 2,
  trainingEpisodes: 400,
  minimumSuccessRelativeToBaseline: 0,
  maximumUnsupportedAnswers: 0,
  maximumTruncations: 0,
  maximumToolIncreaseRelativeToBaseline: 0,
} as const;

export async function evaluateRobustPolicy(
  policy: Policy,
  tasks: readonly RobustnessTask[],
  seed: number,
  policyId: string,
) {
  const cases: RobustnessCase[] = [];
  for (const task of tasks) {
    const episode = await runLearningEpisode(new RobustOrderEnvironment(task), policy, {
      maxSteps: robustnessProtocol.maxSteps,
      seed,
      policyId,
    });
    cases.push({
      seed,
      taskId: task.id,
      category: task.category,
      success: episode.done && episode.finalState.observation.correct === true,
      unsupportedAnswer: episode.finalState.observation.unsupportedAnswer === true,
      response:
        typeof episode.finalState.observation.response === "string"
          ? episode.finalState.observation.response
          : null,
      answer:
        typeof episode.finalState.observation.answer === "number"
          ? episode.finalState.observation.answer
          : null,
      reward: episode.totalReward,
      toolCalls: episode.steps.filter((step) =>
        ["lookup_price", "calculate_total"].includes(step.action.name),
      ).length,
      attempts: Number(episode.finalState.observation.attempts ?? 0),
      truncated: episode.truncated,
    });
  }
  return {
    seed,
    policyId,
    cases,
    categories: categories.map((category) => {
      const group = cases.filter((item) => item.category === category);
      return {
        category,
        caseCount: group.length,
        successRate: group.length ? group.filter((item) => item.success).length / group.length : 0,
        unsupportedAnswers: group.filter((item) => item.unsupportedAnswer).length,
        truncations: group.filter((item) => item.truncated).length,
        averageToolCalls: group.length
          ? group.reduce((sum, item) => sum + item.toolCalls, 0) / group.length
          : 0,
        averageReward: group.length
          ? group.reduce((sum, item) => sum + item.reward, 0) / group.length
          : 0,
      };
    }),
  };
}

export type RobustPolicyEvaluation = Awaited<ReturnType<typeof evaluateRobustPolicy>>;

export function compareRobustPolicies(
  learned: RobustPolicyEvaluation,
  baseline: RobustPolicyEvaluation,
) {
  if (
    learned.seed !== baseline.seed ||
    JSON.stringify(learned.cases.map(({ taskId }) => taskId)) !==
      JSON.stringify(baseline.cases.map(({ taskId }) => taskId))
  ) {
    throw new Error("Robustness comparison requires identical tasks and seeds.");
  }
  const failures: string[] = [];
  for (const category of categories) {
    const row = learned.categories.find((entry) => entry.category === category);
    const reference = baseline.categories.find((entry) => entry.category === category);
    if (!row || !reference || row.caseCount === 0 || reference.caseCount !== row.caseCount) {
      failures.push(`${category}: missing coverage`);
      continue;
    }
    if (reference && row.successRate < reference.successRate)
      failures.push(`${row.category}: success regression`);
    if (row.unsupportedAnswers > 0) failures.push(`${row.category}: unsupported answer`);
    if (row.truncations > 0) failures.push(`${row.category}: budget exhausted`);
    if (reference && row.averageToolCalls > reference.averageToolCalls)
      failures.push(`${row.category}: tool cost regression`);
  }
  return { passed: failures.length === 0, failures };
}

export async function runRobustnessCampaign() {
  const runs = [];
  for (const seed of robustnessProtocol.seeds) {
    const training = await trainOrderPolicy(seed, robustnessProtocol.trainingEpisodes);
    const learned = await evaluateRobustPolicy(
      training.learner.freeze(),
      robustnessTasks,
      seed,
      "q-learning",
    );
    const baseline = await evaluateRobustPolicy(
      failureAwareReact,
      robustnessTasks,
      seed,
      "handwritten-react",
    );
    runs.push({ learned, baseline, gate: compareRobustPolicies(learned, baseline) });
  }
  return {
    protocol: robustnessProtocol,
    trainingTaskIds: trainingTasks.map(({ id }) => id),
    evaluationTaskIds: robustnessTasks.map(({ id }) => id),
    runs,
    decision: runs.every(({ gate }) => gate.passed)
      ? "allow-richer-state-experiment"
      : "block-richer-state-experiment",
    limits:
      "Synthetic tools. Unsupported numeric actions are masked by the domain contract; clarification/abstention after permanent failure is constrained, not learned. Normal states retain competing answer/tool/abstention choices. No production gain is established.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runRobustnessCampaign();
  console.table(
    report.runs.flatMap(({ learned }) =>
      learned.categories.map((row) => ({ seed: learned.seed, ...row })),
    ),
  );
  console.log(report.decision);
  const output = process.argv[2];
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/robustness.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (report.decision.startsWith("block")) process.exitCode = 1;
}
