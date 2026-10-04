import { expect, test } from "vitest";
import {
  syntheticImportOptions,
  syntheticTrajectoryExport,
} from "../../../examples/react-policy-optimization/src/trajectory-evidence";
import { compareObservedTrajectoryPolicies, splitTrajectoryEvidence } from "./trajectory-evidence";
import { importIgnitionRagTrajectories, pseudonymizeTrajectoryId } from "./trajectory-import";

test("imports observed transitions with pseudonymous ids, allowlisted fields and content fingerprint", () => {
  const raw = syntheticTrajectoryExport();
  const imported = importIgnitionRagTrajectories(raw, syntheticImportOptions);
  expect(imported.episodes).toHaveLength(60);
  expect(imported.rejected).toEqual([]);
  expect(imported.episodes[0]?.transitions[0]?.state).toEqual({ phase: 0 });
  expect(imported.episodes[0]?.transitions[0]?.action.input).toEqual({ topK: 3 });
  const serialized = JSON.stringify(imported);
  for (const privateValue of [
    "private@example.invalid",
    "private-token",
    "fixture-task-0",
    "synthetic-isolated-environment",
  ])
    expect(serialized).not.toContain(privateValue);
  const other = importIgnitionRagTrajectories(raw, {
    ...syntheticImportOptions,
    pseudonymSalt: "different-stable-test-salt",
  });
  expect(other.sourceFingerprint).toBe(imported.sourceFingerprint);
  expect(other.episodes[0]?.taskId).not.toBe(imported.episodes[0]?.taskId);
});

test("rejects malformed terminal/reward/continuity records without reproducing private data", () => {
  const raw = syntheticTrajectoryExport();
  const first = raw.episodes[0];
  if (!first) throw new Error("Fixture episode required.");
  const broken = {
    ...raw,
    episodes: [
      { ...first, done: false, truncated: false },
      { ...first, qualityScore: Infinity },
      { ...first, steps: [{ ...first.steps[0], reward: NaN }] },
      { ...first, steps: [first.steps[0], { ...first.steps[1], state: { phase: 99 } }] },
      first,
      first,
    ],
  };
  const imported = importIgnitionRagTrajectories(broken, syntheticImportOptions);
  expect(imported.episodes).toHaveLength(1);
  expect(imported.rejected).toHaveLength(5);
  expect(imported.rejected.some(({ reason }) => reason.includes("contiguous"))).toBe(true);
  expect(JSON.stringify(imported.rejected)).not.toContain("private");
  expect(() =>
    importIgnitionRagTrajectories({ ...raw, schemaVersion: "unknown" }, syntheticImportOptions),
  ).toThrow();
});

test("chronological split excludes shared task or snapshot even with different episode ids", () => {
  const imported = importIgnitionRagTrajectories(
    syntheticTrajectoryExport(),
    syntheticImportOptions,
  );
  const episode = imported.episodes[0];
  if (!episode) throw new Error("Fixture episode required.");
  const rows = [
    { ...episode, collectedAt: "2026-10-01T00:00:00Z" },
    { ...episode, episodeId: "new-row-same-task", workflowSnapshotId: "different-snapshot" },
    { ...episode, episodeId: "new-row-same-snapshot", taskId: "different-task" },
    {
      ...episode,
      episodeId: "independent",
      taskId: "different-task",
      workflowSnapshotId: "different-snapshot",
    },
  ];
  const split = splitTrajectoryEvidence(rows, "2026-10-02T00:00:00Z");
  expect(split.training).toHaveLength(1);
  expect(split.excluded).toHaveLength(2);
  expect(split.evaluation.map(({ episodeId }) => episodeId)).toEqual(["independent"]);
});

test("paired comparison never invents missing usage or counterfactual rewards and rejects absent gain", () => {
  const imported = importIgnitionRagTrajectories(
    syntheticTrajectoryExport(),
    syntheticImportOptions,
  );
  const protocol = {
    baselinePolicyId: pseudonymizeTrajectoryId("baseline", syntheticImportOptions.pseudonymSalt),
    learnedPolicyId: pseudonymizeTrajectoryId("learned", syntheticImportOptions.pseudonymSalt),
    minimumPairs: 30,
    minimumQualityGain: 0.05,
    maximumToolIncrease: 0,
  };
  const comparison = compareObservedTrajectoryPolicies(imported, protocol);
  expect(comparison.paired).toHaveLength(30);
  expect(comparison.quality.mean).toBeCloseTo(0.1);
  expect(comparison.cost).toBeNull();
  expect(comparison.latency).toBeNull();
  expect(comparison.alternativeActionsEstimated).toBe(false);
  expect(comparison.decision).toBe("do-not-adopt");
  expect(comparison.reasons).toContain(
    "Synthetic evidence cannot establish production improvement.",
  );
  const noGain = compareObservedTrajectoryPolicies(
    {
      ...imported,
      episodes: imported.episodes.map((episode) => ({ ...episode, qualityScore: 0.7 })),
    },
    protocol,
  );
  expect(noGain.reasons).toContain(
    "Quality gain is absent or uncertainty is insufficient/includes no gain.",
  );
  const missing = compareObservedTrajectoryPolicies(
    { ...imported, episodes: imported.episodes.slice(1) },
    protocol,
  );
  expect(missing.paired).toHaveLength(29);
  expect(missing.excluded).toHaveLength(1);
  expect(missing.quality.lower95).toBeNull();
});
