import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  compareObservedTrajectoryPolicies,
  importIgnitionRagTrajectories,
  pseudonymizeTrajectoryId,
  splitTrajectoryEvidence,
  type TrajectoryImportOptions,
} from "@ignitionai/agent-trainer-rl";

/** Explicitly synthetic contract fixture, never presented as an IgnitionRAG run. */
export function syntheticTrajectoryExport() {
  return {
    schemaVersion: "ignitionrag.trajectory-export.v1",
    source: "ignitionrag",
    evidenceMode: "synthetic",
    environmentId: "synthetic-isolated-environment",
    authorizationReference: "synthetic-example-only",
    rewardConfigId: "synthetic-quality-v1",
    exportedAt: "2026-10-04T00:00:00Z",
    episodes: Array.from({ length: 30 }, (_, index) =>
      ["baseline", "learned"].map((policyId) => ({
        runId: `fixture-run-${policyId}-${index}`,
        episodeId: `fixture-episode-${policyId}-${index}`,
        taskId: `fixture-task-${index}`,
        workflowSnapshotId: "fixture-workflow-v1",
        policyId,
        collectedAt: "2026-10-03T10:00:00Z",
        done: true,
        truncated: false,
        qualityScore: policyId === "baseline" ? 0.7 : 0.8,
        steps: [
          {
            state: { phase: 0, customerEmail: "private@example.invalid" },
            action: { name: "lookup_price", input: { topK: 3, accessToken: "private-token" } },
            observation: { phase: 1 },
            reward: -0.02,
            done: false,
            usage: { costUsd: 0.001, latencyMs: 10 },
          },
          {
            state: { phase: 1 },
            action: { name: "answer" },
            observation: { phase: 2 },
            reward: policyId === "baseline" ? 0.7 : 0.8,
            done: true,
          },
        ],
      })),
    ).flat(),
  };
}

export const syntheticImportOptions: TrajectoryImportOptions = {
  pseudonymSalt: "synthetic-salt-not-for-real-data",
  actionNames: ["lookup_price", "answer"],
  observationFields: { phase: "number" },
  argumentFields: { topK: "number" },
};

export function runTrajectoryEvidenceExample() {
  const imported = importIgnitionRagTrajectories(
    syntheticTrajectoryExport(),
    syntheticImportOptions,
  );
  const split = splitTrajectoryEvidence(imported.episodes, "2026-10-03T00:00:00Z");
  const comparison = compareObservedTrajectoryPolicies(imported, {
    baselinePolicyId: pseudonymizeTrajectoryId("baseline", syntheticImportOptions.pseudonymSalt),
    learnedPolicyId: pseudonymizeTrajectoryId("learned", syntheticImportOptions.pseudonymSalt),
    minimumPairs: 30,
    minimumQualityGain: 0.05,
    maximumToolIncrease: 0,
    actionKinds: { lookup_price: "tool" as const, answer: "control" as const },
  });
  return {
    imported,
    split,
    comparison,
    realEvidence: "BLOCKED — NOT PROVEN: no authorized real trajectory export available.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runTrajectoryEvidenceExample();
  console.log(
    JSON.stringify(
      {
        pairs: report.comparison.paired.length,
        decision: report.comparison.decision,
        reasons: report.comparison.reasons,
        cost: report.comparison.cost,
        latency: report.comparison.latency,
        realEvidence: report.realEvidence,
      },
      null,
      2,
    ),
  );
  const output = process.argv[2];
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/trajectory-evidence.json`, `${JSON.stringify(report, null, 2)}\n`);
  }
}
