import type {
  AgentEnvironment,
  EnvironmentState,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import { expect, test } from "vitest";
import { importIgnitionRagTrajectories } from "./trajectory-import";
import { recordIgnitionRagEpisode, type TrajectoryRecordingOptions } from "./trajectory-recorder";

const fields = {
  actionNames: ["lookup"],
  observationFields: { phase: "number" as const },
  argumentFields: { limit: "number" as const },
};
const options: TrajectoryRecordingOptions = {
  runId: "run",
  episodeId: "episode",
  taskId: "task",
  workflowSnapshotId: "snapshot",
  policyId: "baseline",
  maxSteps: 2,
  fields,
  evaluateQuality: (episode) => (episode.finalState.observation.phase === 2 ? 0.9 : 0),
};
const policy: Policy = {
  async chooseAction() {
    return { name: "lookup", input: { limit: 3, credential: "private-token" } };
  },
};

function mutableEnvironment(terminal: boolean): AgentEnvironment {
  let current: EnvironmentState = {
    id: "initial",
    observation: { phase: 0, customer: "private-customer" },
  };
  return {
    async reset() {
      return current;
    },
    async actions() {
      return [{ name: "lookup" }];
    },
    async step(state, action) {
      current = state;
      current.observation.phase = Number(current.observation.phase) + 1;
      if (action.input && typeof action.input === "object" && !Array.isArray(action.input))
        action.input.limit = 99;
      return {
        state: current,
        reward: { name: "observed", score: -0.25, weight: 2 },
        done: terminal && current.observation.phase === 2,
        metadata: { costUsd: 0.01 },
      };
    },
  };
}

test("records executed transitions before mutable tools change their inputs, with independent quality and measured usage", async () => {
  const episode = await recordIgnitionRagEpisode(mutableEnvironment(true), policy, {
    ...options,
    readMeasuredCost: (result) =>
      typeof result.metadata?.costUsd === "number" ? result.metadata.costUsd : undefined,
  });
  expect(
    episode.steps.map((step) => [
      step.state.phase,
      step.observation.phase,
      step.action.input.limit,
      step.reward,
    ]),
  ).toEqual([
    [0, 1, 3, -0.5],
    [1, 2, 3, -0.5],
  ]);
  expect(episode.qualityScore).toBe(0.9);
  expect(episode.done).toBe(true);
  expect(episode.truncated).toBe(false);
  expect(
    episode.steps.every((step) => step.usage.latencyMs >= 0 && step.usage.costUsd === 0.01),
  ).toBe(true);
  const envelope = {
    schemaVersion: "ignitionrag.trajectory-export.v1",
    source: "ignitionrag",
    evidenceMode: "synthetic",
    environmentId: "test-fixture",
    authorizationReference: "synthetic-only",
    rewardConfigId: "test-reward",
    exportedAt: new Date().toISOString(),
    episodes: [episode],
  };
  const imported = importIgnitionRagTrajectories(envelope, {
    ...fields,
    pseudonymSalt: "stable-private-test-salt",
  });
  expect(imported.rejected).toEqual([]);
  expect(imported.episodes).toHaveLength(1);
  expect(JSON.stringify(envelope)).not.toContain("private-");
});

test("step budget records truncation and unavailable cost without claiming success", async () => {
  const episode = await recordIgnitionRagEpisode(mutableEnvironment(false), policy, {
    ...options,
    maxSteps: 1,
  });
  expect(episode.done).toBe(false);
  expect(episode.truncated).toBe(true);
  expect(episode.qualityScore).toBe(0);
  expect(episode.steps).toHaveLength(1);
  expect(episode.steps[0]?.usage.costUsd).toBeUndefined();
});

test("failed tool or invalid observed quality never returns an exportable completed episode", async () => {
  const environment = mutableEnvironment(true);
  environment.step = async () => {
    throw new Error("provider unavailable");
  };
  await expect(recordIgnitionRagEpisode(environment, policy, options)).rejects.toThrow(
    "provider unavailable",
  );
  await expect(
    recordIgnitionRagEpisode(mutableEnvironment(true), policy, {
      ...options,
      evaluateQuality: () => NaN,
    }),
  ).rejects.toThrow("quality");
  await expect(
    recordIgnitionRagEpisode(mutableEnvironment(true), policy, {
      ...options,
      readMeasuredCost: () => -1,
    }),
  ).rejects.toThrow("cost");
});
