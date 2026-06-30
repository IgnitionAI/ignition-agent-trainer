import {
  type AgentEnvironment,
  type EnvironmentAction,
  type Policy as EnvironmentPolicy,
  type EnvironmentState,
  runEpisode,
} from "@ignitionai/agent-trainer-environment";
import { describe, expect, it } from "vitest";
import {
  exportTrajectoryReport,
  recordEpisodeTrajectory,
  toMarkdownTrajectoryReport,
} from "./episode-trajectory";
import {
  createOfflinePolicyRecordsFromTrajectories,
  evaluatePolicyOffline,
} from "./offline-policy-evaluation";
import { createStaticPolicy } from "./policy";

describe("episode trajectory bridge", () => {
  it("records environment episodes as deterministic trajectories", async () => {
    const episode = await runEpisode(new RerankEnvironment(), new ScriptedPolicy(), {
      policyId: "scripted-rag",
      metadata: { caseId: "case-1" },
    });

    const trajectory = recordEpisodeTrajectory(episode, {
      id: "episode-trajectory",
      startedAt: "2026-06-30T10:00:00.000Z",
      endedAt: "2026-06-30T10:00:03.000Z",
      metadata: { source: "environment" },
    });

    expect(trajectory).toMatchObject({
      id: "episode-trajectory",
      policyId: "scripted-rag",
      startedAt: "2026-06-30T10:00:00.000Z",
      endedAt: "2026-06-30T10:00:03.000Z",
      metadata: { source: "environment", caseId: "case-1" },
    });
    expect(trajectory.steps.map((step) => step.index)).toEqual([0, 1, 2]);
    expect(trajectory.steps.map((step) => step.action)).toEqual([
      { id: "search", name: "search" },
      { id: "rerank", name: "rerank" },
      { id: "answer", name: "answer" },
    ]);
    expect(trajectory.steps.map((step) => step.reward)).toEqual([0.25, 0.3, 0.45]);
    expect(trajectory.steps.at(-1)?.outcome).toEqual({
      nextStateId: "answered",
      done: true,
    });
  });

  it("supports offline policy evaluation from episode trajectories", async () => {
    const episode = await runEpisode(new RerankEnvironment(), new ScriptedPolicy(), {
      policyId: "scripted-rag",
    });
    const trajectory = recordEpisodeTrajectory(episode, { id: "episode-trajectory" });
    const records = createOfflinePolicyRecordsFromTrajectories([trajectory], {
      experimentName: "rag-environment",
    });

    expect(records.map((record) => record.id)).toEqual([
      "episode-trajectory:0",
      "episode-trajectory:1",
      "episode-trajectory:2",
    ]);

    const answerRecord = records.find((record) => record.expectedCandidateId === "answer");
    if (answerRecord === undefined) throw new Error("Expected answer offline record.");

    const result = await evaluatePolicyOffline(createStaticPolicy("answer"), [answerRecord], {
      policyId: "static-answer",
    });

    expect(result).toMatchObject({
      policyId: "static-answer",
      recordCount: 1,
      totalReward: 0.45,
      averageReward: 0.45,
      accuracy: 1,
    });
  });

  it("exports stable JSON and Markdown trajectory reports", async () => {
    const episode = await runEpisode(new RerankEnvironment(), new ScriptedPolicy(), {
      policyId: "scripted-rag",
    });
    const trajectory = recordEpisodeTrajectory(episode, { id: "episode-trajectory" });
    const report = exportTrajectoryReport(trajectory, {
      generatedAt: "2026-06-30T12:00:00.000Z",
      metadata: { suite: "rl" },
    });

    expect(report).toMatchObject({
      schemaVersion: "ignition.trajectory-report.v1",
      generatedAt: "2026-06-30T12:00:00.000Z",
      trajectory: {
        id: "episode-trajectory",
        policyId: "scripted-rag",
      },
      summary: {
        trajectoryId: "episode-trajectory",
        stepCount: 3,
        totalReward: 1,
      },
      metadata: { suite: "rl" },
    });

    const markdown = toMarkdownTrajectoryReport(report);

    expect(markdown).toContain("# Trajectory report: episode-trajectory");
    expect(markdown).toContain("Policy: scripted-rag");
    expect(markdown).toContain("Total reward: 1.000");
    expect(markdown).toContain("| 2 | answer | 0.450 | yes |");
  });
});

class RerankEnvironment implements AgentEnvironment {
  private index = 0;

  async reset(): Promise<EnvironmentState> {
    this.index = 0;
    return state("start", { query: "refund policy" });
  }

  async actions(): Promise<EnvironmentAction[]> {
    return [{ name: ["search", "rerank", "answer"][this.index] ?? "answer" }];
  }

  async step(_state: EnvironmentState, action: EnvironmentAction) {
    this.index += 1;

    if (action.name === "search") {
      return {
        state: state("searched", { docs: 3 }),
        reward: { name: "retrieval", score: 0.5, weight: 0.5 },
        done: false,
      };
    }

    if (action.name === "rerank") {
      return {
        state: state("reranked", { docs: 2 }),
        reward: { name: "rerank", score: 0.6, weight: 0.5 },
        done: false,
      };
    }

    return {
      state: state("answered", { cited: true }, true),
      reward: { name: "answer", score: 0.9, weight: 0.5 },
      done: true,
    };
  }
}

class ScriptedPolicy implements EnvironmentPolicy {
  async chooseAction(_state: EnvironmentState, actions: EnvironmentAction[]) {
    const action = actions[0];
    if (action === undefined) throw new Error("Expected action.");
    return action;
  }
}

function state(
  id: string,
  observation: Record<string, string | number | boolean>,
  done = false,
): EnvironmentState {
  return {
    id,
    observation,
    ...(done ? { done: true } : {}),
  };
}
