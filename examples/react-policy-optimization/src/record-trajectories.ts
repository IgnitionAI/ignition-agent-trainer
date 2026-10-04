import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { AgentEnvironment, Policy } from "@ignitionai/agent-trainer-environment";
import {
  importIgnitionRagTrajectories,
  recordIgnitionRagEpisode,
} from "@ignitionai/agent-trainer-rl";
import { createOrderPolicy, OrderEnvironment } from "./agent";

const fields = {
  actionNames: ["lookup_price", "calculate_total", "answer"],
  observationFields: {
    quantity: "number",
    unitPrice: "number",
    total: "number",
    correct: "boolean",
  },
  argumentFields: { value: "number" },
} as const;

/** The export protocol uses object arguments; this adapter preserves the scalar demo action. */
function recordingTask(strategy: "direct" | "react"): {
  environment: AgentEnvironment;
  policy: Policy;
} {
  const environment = new OrderEnvironment({
    id: "synthetic-order",
    product: "fixture-product",
    quantity: 3,
    unitPrice: 7,
  });
  const policy = createOrderPolicy(strategy);
  return {
    environment: {
      reset: () => environment.reset(),
      actions: (state) => environment.actions(state),
      step(state, action) {
        const value =
          action.input && typeof action.input === "object" && !Array.isArray(action.input)
            ? action.input.value
            : undefined;
        return environment.step(state, {
          name: action.name,
          ...(value !== undefined ? { input: value } : {}),
        });
      },
    },
    policy: {
      async chooseAction(state, actions) {
        const action = await policy.chooseAction(state, actions);
        return {
          name: action.name,
          ...(action.input !== undefined ? { input: { value: action.input } } : {}),
        };
      },
    },
  };
}

export async function runRecordedTrajectoryExample() {
  const episodes = [];
  for (const strategy of ["direct", "react"] as const) {
    const { environment, policy } = recordingTask(strategy);
    episodes.push(
      await recordIgnitionRagEpisode(environment, policy, {
        runId: `synthetic-${strategy}`,
        episodeId: `synthetic-${strategy}`,
        taskId: "synthetic-order",
        workflowSnapshotId: "synthetic-order-v1",
        policyId: `written-${strategy}`,
        maxSteps: 4,
        fields,
        evaluateQuality: (episode) => (episode.finalState.observation.correct === true ? 1 : 0),
      }),
    );
  }
  const envelope = {
    schemaVersion: "ignitionrag.trajectory-export.v1",
    source: "ignitionrag",
    evidenceMode: "synthetic",
    environmentId: "synthetic-order-demo",
    authorizationReference: "synthetic-only",
    rewardConfigId: "order-correctness-and-tool-cost-v1",
    exportedAt: new Date().toISOString(),
    episodes,
  };
  return {
    envelope,
    imported: importIgnitionRagTrajectories(envelope, {
      ...fields,
      pseudonymSalt: "synthetic-demo-salt-only",
    }),
    realEvidence:
      "NOT PROVEN: this executes the synthetic order environment, not the IgnitionRAG runner.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await runRecordedTrajectoryExample();
  console.log(
    JSON.stringify(
      {
        episodes: report.imported.episodes.length,
        rejected: report.imported.rejected,
        measuredLatencies: report.envelope.episodes.map((episode) =>
          episode.steps.map((step) => step.usage.latencyMs),
        ),
        quality: report.envelope.episodes.map((episode) => ({
          policyId: episode.policyId,
          score: episode.qualityScore,
        })),
        realEvidence: report.realEvidence,
      },
      null,
      2,
    ),
  );
  if (process.argv[2]) {
    await mkdir(process.argv[2], { recursive: true });
    await writeFile(
      `${process.argv[2]}/recorded-trajectories.json`,
      `${JSON.stringify(report, null, 2)}\n`,
      { mode: 0o600 },
    );
  }
}
