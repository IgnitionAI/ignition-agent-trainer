import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { runEpisode } from "@ignitionai/agent-trainer-environment";
import {
  createStaticPolicy,
  exportTrajectoryReport,
  type OfflinePolicyEvaluationRecord,
  optimizePolicyOffline,
  recordEpisodeTrajectory,
  type Trajectory,
} from "@ignitionai/agent-trainer-rl";
import { createOrderPolicy, OrderEnvironment, type OrderTask, type Strategy } from "./agent";

const strategies: Strategy[] = ["direct", "lookup", "react"];
const trainingTasks: OrderTask[] = [
  { id: "train-single", product: "pencil", quantity: 1, unitPrice: 3 },
  { id: "train-batch", product: "notebook", quantity: 4, unitPrice: 7 },
  { id: "train-box", product: "folder", quantity: 6, unitPrice: 2 },
];
const evaluationTasks: OrderTask[] = [
  { id: "eval-single", product: "ruler", quantity: 1, unitPrice: 11 },
  { id: "eval-batch", product: "marker", quantity: 3, unitPrice: 5 },
];

export async function collectRollouts(tasks: readonly OrderTask[]) {
  const records: OfflinePolicyEvaluationRecord<string>[] = [];
  const trajectories: Trajectory[] = [];
  for (const task of tasks) {
    const rewardByCandidateId: Record<string, number> = {};
    for (const strategy of strategies) {
      const episode = await runEpisode(new OrderEnvironment(task), createOrderPolicy(strategy), {
        maxSteps: 4,
        policyId: strategy,
      });
      trajectories.push(recordEpisodeTrajectory(episode, { id: `${task.id}:${strategy}` }));
      rewardByCandidateId[strategy] = episode.totalReward;
    }
    records.push({
      id: task.id,
      context: { candidates: strategies.map((id) => ({ id, action: id })) },
      rewardByCandidateId,
    });
  }
  return { records, trajectories };
}

export async function runExample() {
  const training = await collectRollouts(trainingTasks);
  const evaluation = await collectRollouts(evaluationTasks);
  const report = await optimizePolicyOffline({
    candidates: strategies.map((id) => ({ id, policy: createStaticPolicy<string>(id) })),
    trainingRecords: training.records,
    evaluationRecords: evaluation.records,
  });
  return { report, trajectories: [...training.trajectories, ...evaluation.trajectories] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runExample();
  console.table(
    result.report.evaluation.map(({ policyId, averageReward }) => ({ policyId, averageReward })),
  );
  console.log(result.report.reason);
  const output = process.argv[2];
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(
      `${output}/policy-selection.json`,
      `${JSON.stringify(result.report, null, 2)}\n`,
    );
    const trajectories = result.trajectories.map((trajectory) =>
      exportTrajectoryReport(trajectory, { generatedAt: "2026-10-03T00:00:00.000Z" }),
    );
    await writeFile(`${output}/trajectories.json`, `${JSON.stringify(trajectories, null, 2)}\n`);
  }
}
