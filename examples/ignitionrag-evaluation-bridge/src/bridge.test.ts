import { normalizeRunResult } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import {
  createBridgeExperiment,
  createIgnitionRagExecutionRequest,
  mapDatasetRecordToDataset,
  mapWorkflowSnapshotToVariant,
} from "./bridge";
import {
  sampleCaseRecords,
  sampleCollection,
  sampleDatasetRecord,
  sampleExecutionRequest,
  sampleWorkflowSnapshots,
} from "./sample";

describe("IgnitionRAG evaluation bridge prototype", () => {
  it("maps IgnitionRAG dataset records into a Dataset", () => {
    const dataset = mapDatasetRecordToDataset(sampleDatasetRecord, sampleCaseRecords);

    expect(dataset.name).toBe("support-risk-evaluation");
    expect(dataset.items).toHaveLength(4);
    expect(dataset.items[0]?.expected?.contains).toEqual([
      "30 days",
      "annual subscription",
      "billing support",
    ]);
    expect(dataset.items[0]?.expected?.citations).toEqual(["billing-handbook.md#refund-window"]);
    expect(dataset.items[0]?.metadata?.ignitionragCollectionId).toBe(sampleCollection.id);
  });

  it("maps workflow snapshots into executable AgentVariant objects", async () => {
    const snapshot = sampleWorkflowSnapshots[2];
    if (snapshot === undefined) throw new Error("Missing verified sample workflow snapshot.");

    const item = mapDatasetRecordToDataset(sampleDatasetRecord, sampleCaseRecords).items[0];
    if (item === undefined) throw new Error("Missing sample dataset item.");

    const variant = mapWorkflowSnapshotToVariant(snapshot);
    if (variant.adapter === undefined) throw new Error("Mapped variant is missing an adapter.");

    expect(variant.id).toBe("snapshot-rag-verify-v3");
    expect(variant.adapter).toBeDefined();

    const rawRun = await variant.adapter.run(
      {
        id: item.id,
        input: item.input,
        ...(item.expected !== undefined ? { expected: item.expected } : {}),
        ...(item.metadata !== undefined ? { metadata: item.metadata } : {}),
      },
      {
        experimentName: "test",
        variantId: variant.id ?? "snapshot-rag-verify-v3",
        caseId: item.id,
      },
    );
    const run = normalizeRunResult(rawRun);

    expect(JSON.stringify(run.output)).toContain("30 days");
    expect(JSON.stringify(run.output)).toContain("billing-handbook.md#refund-window");
  });

  it("creates an executable IgnitionRAG experiment request", () => {
    const request = createIgnitionRagExecutionRequest({
      requestId: "test-run",
      experimentName: "bridge-test",
      collection: sampleCollection,
      datasetRecord: sampleDatasetRecord,
      caseRecords: sampleCaseRecords,
      workflowSnapshots: sampleWorkflowSnapshots,
    });

    expect(request.kind).toBe("ignitionrag.experiment.execution-request");
    expect(request.dataset.items).toHaveLength(4);
    expect(request.variants).toHaveLength(3);
    expect(request.variants.every((variant) => variant.agentVariant !== undefined)).toBe(true);
  });

  it("runs the bridge experiment locally and recommends the verified snapshot", async () => {
    const experiment = createBridgeExperiment(sampleExecutionRequest);
    const result = await experiment.run();

    expect(result.leaderboard[0]?.name).toBe("rag-with-verification snapshot");
    expect(result.failedCases).toEqual([]);
    expect(result.cases).toHaveLength(12);
  });
});
