import { createDataset, createMockAdapter, type RewardFunction } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import type {
  IgnitionRagAdapterContract,
  IgnitionRagAgentReference,
  IgnitionRagCollectionReference,
  IgnitionRagExperimentExecutionRequest,
  IgnitionRagExperimentExecutionResult,
  IgnitionRagWorkflowReference,
} from "./index";

const collection = {
  kind: "ignitionrag.collection",
  id: "collection-1",
  name: "Support knowledge",
  version: "2026-01-01",
} satisfies IgnitionRagCollectionReference;

const workflow = {
  kind: "ignitionrag.workflow",
  id: "workflow-1",
  name: "Verified RAG workflow",
  snapshotId: "snapshot-1",
  collection,
} satisfies IgnitionRagWorkflowReference;

const agent = {
  kind: "ignitionrag.agent",
  id: "agent-1",
  name: "Support agent",
  workflow,
} satisfies IgnitionRagAgentReference;

const reward: RewardFunction = {
  name: "quality",
  evaluate() {
    return { name: "quality", score: 1, weight: 1 };
  },
};

describe("IgnitionRAG adapter contract", () => {
  it("describes an experiment execution request without runtime IgnitionRAG code", () => {
    const request = {
      kind: "ignitionrag.experiment.execution-request",
      requestId: "request-1",
      experimentName: "support-rag-eval",
      collection,
      dataset: createDataset([{ id: "case-1", input: "Answer with grounding." }]),
      variants: [
        {
          id: "verified-rag",
          name: "Verified RAG",
          runnable: agent,
          agentVariant: {
            id: "verified-rag",
            name: "Verified RAG",
            adapter: createMockAdapter({ output: "grounded answer", trace: { steps: [] } }),
          },
        },
      ],
      rewards: [reward],
      metadata: { source: "type-test" },
    } satisfies IgnitionRagExperimentExecutionRequest;

    expect(request.collection?.id).toBe("collection-1");
    expect(request.variants[0]?.runnable.kind).toBe("ignitionrag.agent");
    expect(request.variants[0]?.agentVariant?.name).toBe("Verified RAG");
  });

  it("describes report results and adapter implementations", async () => {
    const result = {
      kind: "ignitionrag.experiment.execution-result",
      requestId: "request-1",
      experimentName: "support-rag-eval",
      result: {
        name: "support-rag-eval",
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:00:01.000Z",
        leaderboard: [],
        cases: [],
        failedCases: [],
      },
      artifacts: [{ format: "json", path: "reports/support-rag-eval/report.json" }],
    } satisfies IgnitionRagExperimentExecutionResult;

    const adapter: IgnitionRagAdapterContract = {
      async executeExperiment(_request) {
        return result;
      },
    };

    await expect(
      adapter.executeExperiment({} as IgnitionRagExperimentExecutionRequest),
    ).resolves.toMatchObject({
      kind: "ignitionrag.experiment.execution-result",
      artifacts: [{ format: "json" }],
    });
  });
});
