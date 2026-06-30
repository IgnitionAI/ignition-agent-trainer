import { pathToFileURL } from "node:url";
import {
  type AgentEnvironment,
  defineEnvironmentEpisode,
  type EnvironmentAction,
  type EnvironmentState,
  type EnvironmentStepResult,
  type Policy,
} from "@ignitionai/agent-trainer-environment";
import {
  createOfflinePolicyRecordsFromTrajectories,
  exportTrajectoryReport,
  recordEpisodeTrajectory,
  summarizeTrajectory,
  toMarkdownTrajectoryReport,
} from "@ignitionai/agent-trainer-rl";

type RagActionName = "search" | "rerank" | "verify" | "answer";

export class ScriptedRagPolicy implements Policy {
  private readonly sequence: RagActionName[] = ["search", "rerank", "verify", "answer"];
  private index = 0;

  async chooseAction(
    _state: EnvironmentState,
    actions: EnvironmentAction[],
  ): Promise<EnvironmentAction> {
    const expected = this.sequence[this.index] ?? "answer";
    this.index += 1;
    const action = actions.find((candidate) => candidate.name === expected);
    if (action === undefined) throw new Error(`Expected action is unavailable: ${expected}`);
    return action;
  }
}

export class MockRagEnvironment implements AgentEnvironment {
  private stage: RagActionName | "start" | "done" = "start";

  async reset(seed?: number): Promise<EnvironmentState> {
    this.stage = "start";
    return state("start", {
      query: "What is the annual subscription refund policy?",
      seed: seed ?? 0,
    });
  }

  async actions(): Promise<EnvironmentAction[]> {
    if (this.stage === "start") return [{ name: "search", input: { topK: 5 } }];
    if (this.stage === "search") return [{ name: "rerank", input: { keep: 2 } }];
    if (this.stage === "rerank") return [{ name: "verify", input: { requireCitation: true } }];
    if (this.stage === "verify") return [{ name: "answer" }];
    return [];
  }

  async step(_state: EnvironmentState, action: EnvironmentAction): Promise<EnvironmentStepResult> {
    if (action.name === "search") {
      this.stage = "search";
      return {
        state: state("searched", { retrievedDocuments: 5 }),
        reward: {
          name: "retrieval_relevance",
          score: 0.7,
          weight: 0.2,
          reason: "Retrieved enough potentially relevant documents.",
        },
        done: false,
      };
    }

    if (action.name === "rerank") {
      this.stage = "rerank";
      return {
        state: state("reranked", { retainedDocuments: 2, bestDocument: "billing-handbook" }),
        reward: {
          name: "rerank_precision",
          score: 0.8,
          weight: 0.2,
          reason: "Kept the most relevant billing policy document.",
        },
        done: false,
      };
    }

    if (action.name === "verify") {
      this.stage = "verify";
      return {
        state: state("verified", { citation: "billing-handbook.md#refund-window" }),
        reward: {
          name: "citation_verified",
          score: 1,
          weight: 0.2,
          reason: "Verified the answer has a policy citation.",
        },
        done: false,
      };
    }

    this.stage = "done";
    return {
      state: state(
        "answered",
        {
          answer: "Annual subscriptions have a 30 day refund window.",
          citation: "billing-handbook.md#refund-window",
        },
        true,
      ),
      reward: {
        name: "final_answer_quality",
        score: 0.9,
        weight: 0.4,
        reason: "Answered correctly with the verified citation.",
      },
      done: true,
      metadata: { terminal: true },
    };
  }
}

const definition = defineEnvironmentEpisode({
  name: "rag-environment-episode",
  environment: () => new MockRagEnvironment(),
  policy: () => new ScriptedRagPolicy(),
  options: {
    seed: 7,
    policyId: "scripted-rag-policy",
    metadata: { example: "rag-environment-episode" },
  },
});

export default definition;

export async function runExample(): Promise<void> {
  const episode = await definition.run();

  const trajectory = recordEpisodeTrajectory(episode, {
    id: "rag-environment-episode",
    startedAt: "2026-06-30T00:00:00.000Z",
    endedAt: "2026-06-30T00:00:04.000Z",
  });
  const summary = summarizeTrajectory(trajectory);
  const offlineRecords = createOfflinePolicyRecordsFromTrajectories([trajectory], {
    experimentName: "rag-environment-episode",
  });
  const report = exportTrajectoryReport(trajectory, {
    generatedAt: "2026-06-30T00:00:05.000Z",
  });

  console.log("RAG environment episode");
  console.table(
    episode.steps.map((step) => ({
      action: step.action.name,
      reward: (step.reward.score * step.reward.weight).toFixed(3),
      done: step.done,
    })),
  );
  console.log(`Total reward: ${episode.totalReward.toFixed(3)}`);
  console.log(`Trajectory steps: ${summary.stepCount}`);
  console.log(`Offline records: ${offlineRecords.length}`);
  console.log("");
  console.log(toMarkdownTrajectoryReport(report));
}

if (isMainModule()) {
  await runExample();
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

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}
