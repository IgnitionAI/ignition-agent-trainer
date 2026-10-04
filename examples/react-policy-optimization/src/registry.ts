import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  createPolicyArtifact,
  LocalPolicyRegistry,
  loadPolicyArtifact,
  type PolicyGateInput,
  type PolicyMetrics,
} from "@ignitionai/agent-trainer-rl";
import {
  bindOrderAction,
  createOrderLearner,
  encodeOrderState,
  evaluateOrderPolicy,
  evaluationTasks,
  trainOrderPolicy,
} from "./learning";

export async function runPolicyRegistryExample(directory: string) {
  const seed = 57;
  const runtime = {
    encoder: {
      id: "order-observable",
      version: 1,
      parameters: {
        stateFields: ["done", "quantity-is-one", "has-price", "has-total"],
        binder: "order-answer-v1",
      },
    },
    actions: ["answer", "lookup_price", "calculate_total"],
    encodeState: encodeOrderState,
    bindAction: bindOrderAction,
  };
  const trained = await trainOrderPolicy(seed);
  const metadata = {
    schemaVersion: 1 as const,
    algorithm: "tabular-q" as const,
    encoder: runtime.encoder,
    actions: runtime.actions,
    hyperparameters: { alpha: 0.3, gamma: 1, epsilon: 0.3 },
    seeds: [seed],
    provenance: {
      reference: "synthetic-order-calibration-v1",
      mode: "synthetic" as const,
      fingerprint: "six-public-order-tasks-v1",
    },
    rewardConfigId: "order-correctness-minus-tool-002-v1",
    evaluationReportId: "registry-heldout-v1",
  };
  const baseline = createPolicyArtifact({
    ...metadata,
    parameters: createOrderLearner(seed).snapshot(),
  });
  const candidate = createPolicyArtifact({ ...metadata, parameters: trained.learner.snapshot() });
  const registry = new LocalPolicyRegistry(`${directory}/registry`);
  await registry.register(baseline);
  await registry.register(candidate);
  await registry.initialize(baseline.id);
  const evaluatedBaseline = await evaluateOrderPolicy(
    loadPolicyArtifact(baseline, runtime),
    evaluationTasks,
    baseline.id,
  );
  const evaluatedCandidate = await evaluateOrderPolicy(
    loadPolicyArtifact(candidate, runtime),
    evaluationTasks,
    candidate.id,
  );
  const originalCandidate = await evaluateOrderPolicy(
    trained.learner.freeze(),
    evaluationTasks,
    "original-frozen",
  );
  const metrics = (result: typeof evaluatedBaseline): PolicyMetrics => ({
    successRate: result.successRate,
    reward: result.averageReward,
    tools: result.averageToolCalls,
    costUsd: null,
  });
  const gate: PolicyGateInput = {
    baselineId: baseline.id,
    candidateId: candidate.id,
    corpusId: "24-disjoint-order-tasks-v1",
    evaluationReportId: metadata.evaluationReportId,
    mode: "synthetic",
    baseline: metrics(evaluatedBaseline),
    candidate: metrics(evaluatedCandidate),
    // Untrained baseline spends no tools; allow up to 2 to solve the task.
    thresholds: {
      maxSuccessDrop: 0,
      maxRewardDrop: 0,
      maxToolIncrease: 2,
      maxCostIncreaseUsd: null,
    },
  };
  const promotion = await registry.promote(gate);
  const activeAfterPromotion = await registry.active();
  const rollback = await registry.rollback();
  const restored = await evaluateOrderPolicy(
    loadPolicyArtifact(await registry.readVersion(rollback.activeId), runtime),
    evaluationTasks,
    rollback.activeId,
  );
  const report = {
    schemaVersion: "ignition.policy-registry-example.v1",
    evidenceMode: "synthetic",
    productionAdoption: "NOT PROVEN; local lifecycle only",
    seed,
    baselineId: baseline.id,
    candidateId: candidate.id,
    evaluationTaskIds: evaluationTasks.map((task) => task.id),
    reloadPreservesDecisions:
      JSON.stringify(evaluatedCandidate.cases) === JSON.stringify(originalCandidate.cases),
    promotion,
    activeAfterPromotion,
    rollback,
    rollbackPreservesBaseline:
      rollback.activeId === baseline.id &&
      rollback.baselineId === baseline.id &&
      JSON.stringify(restored.cases) === JSON.stringify(evaluatedBaseline.cases),
    baseline: evaluatedBaseline.cases,
    candidate: evaluatedCandidate.cases,
  };
  if (!report.reloadPreservesDecisions || !report.rollbackPreservesBaseline || !promotion.passed)
    throw new Error("Local lifecycle verification failed.");
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/policy-registry.json`, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = process.argv[2];
  if (!directory)
    throw new Error(
      "Supply a new output directory; existing active registry initialization is refused.",
    );
  const report = await runPolicyRegistryExample(directory);
  console.table({
    reloadPreservesDecisions: report.reloadPreservesDecisions,
    promotionPassed: report.promotion.passed,
    rollbackPreservesBaseline: report.rollbackPreservesBaseline,
  });
}
