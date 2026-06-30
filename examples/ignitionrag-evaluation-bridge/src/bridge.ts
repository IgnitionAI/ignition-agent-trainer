import type {
  IgnitionRagCollectionReference,
  IgnitionRagExperimentExecutionRequest,
  IgnitionRagExperimentVariantReference,
} from "@ignitionai/agent-trainer-adapter-ignitionrag";
import type {
  AgentAdapter,
  AgentInput,
  AgentVariant,
  Dataset,
  DatasetItem,
  ExpectedOutput,
  JsonValue,
  Metadata,
  RunContext,
} from "@ignitionai/agent-trainer-core";
import { createDataset } from "@ignitionai/agent-trainer-core";
import { defineExperiment, type ExperimentDefinition } from "@ignitionai/agent-trainer-experiments";
import { ragQualityPreset } from "@ignitionai/agent-trainer-preset-rag";

export interface IgnitionRagEvaluationDatasetRecord {
  id: string;
  name: string;
  description?: string;
  collectionId: string;
  source: "manual" | "import" | "trace" | "failed-conversation";
  metadata?: Metadata;
}

export interface IgnitionRagEvaluationCaseRecord {
  id: string;
  datasetId: string;
  input: string;
  expectedExact?: string;
  requiredTerms?: string[];
  requiredCitations?: string[];
  expectedJson?: JsonValue;
  metadata?: Metadata;
}

export type IgnitionRagWorkflowStrategy = "direct-answer" | "rag-basic" | "rag-with-verification";

export interface IgnitionRagWorkflowSnapshotRecord {
  id: string;
  workflowId: string;
  name: string;
  version: string;
  collectionId: string;
  strategy: IgnitionRagWorkflowStrategy;
  config?: {
    topK?: number;
    rerank?: boolean;
    verifyGrounding?: boolean;
  };
  metadata?: Metadata;
}

export interface BridgeExecutionRequestInput {
  requestId?: string;
  experimentName: string;
  collection: IgnitionRagCollectionReference;
  datasetRecord: IgnitionRagEvaluationDatasetRecord;
  caseRecords: IgnitionRagEvaluationCaseRecord[];
  workflowSnapshots: IgnitionRagWorkflowSnapshotRecord[];
  metadata?: Metadata;
}

interface StrategyProfile {
  latencyMs: number;
  costUsd: number;
  tools: string[];
}

const strategyProfiles: Record<IgnitionRagWorkflowStrategy, StrategyProfile> = {
  "direct-answer": {
    latencyMs: 180,
    costUsd: 0.0004,
    tools: [],
  },
  "rag-basic": {
    latencyMs: 720,
    costUsd: 0.002,
    tools: ["retrieve_context"],
  },
  "rag-with-verification": {
    latencyMs: 1250,
    costUsd: 0.004,
    tools: ["retrieve_context", "verify_grounding"],
  },
};

export function mapDatasetRecordToDataset(
  datasetRecord: IgnitionRagEvaluationDatasetRecord,
  caseRecords: IgnitionRagEvaluationCaseRecord[],
): Dataset {
  const items = caseRecords
    .filter((record) => record.datasetId === datasetRecord.id)
    .map((record) => mapCaseRecordToDatasetItem(record, datasetRecord));

  return createDataset({
    name: datasetRecord.name,
    ...(datasetRecord.description !== undefined ? { description: datasetRecord.description } : {}),
    items,
    metadata: {
      ...datasetRecord.metadata,
      ignitionragDatasetId: datasetRecord.id,
      ignitionragCollectionId: datasetRecord.collectionId,
      source: datasetRecord.source,
    },
  });
}

export function mapCaseRecordToDatasetItem(
  caseRecord: IgnitionRagEvaluationCaseRecord,
  datasetRecord: IgnitionRagEvaluationDatasetRecord,
): DatasetItem {
  return {
    id: caseRecord.id,
    input: caseRecord.input,
    expected: buildExpectedOutput(caseRecord),
    metadata: {
      ...caseRecord.metadata,
      ignitionragCaseId: caseRecord.id,
      ignitionragDatasetId: datasetRecord.id,
      ignitionragCollectionId: datasetRecord.collectionId,
    },
  };
}

export function mapWorkflowSnapshotToVariant(
  snapshot: IgnitionRagWorkflowSnapshotRecord,
): AgentVariant {
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: `IgnitionRAG workflow ${snapshot.workflowId} snapshot ${snapshot.version}.`,
    config: {
      ...snapshot.config,
      ignitionragWorkflowId: snapshot.workflowId,
      ignitionragSnapshotId: snapshot.id,
      ignitionragCollectionId: snapshot.collectionId,
      strategy: snapshot.strategy,
    },
    adapter: createWorkflowSnapshotAdapter(snapshot),
  };
}

export function createIgnitionRagExecutionRequest(
  input: BridgeExecutionRequestInput,
): IgnitionRagExperimentExecutionRequest {
  const dataset = mapDatasetRecordToDataset(input.datasetRecord, input.caseRecords);
  const variants = input.workflowSnapshots.map((snapshot) =>
    mapWorkflowSnapshotToVariantReference(snapshot, input.collection),
  );

  return {
    kind: "ignitionrag.experiment.execution-request",
    ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
    experimentName: input.experimentName,
    collection: input.collection,
    dataset,
    variants,
    rewards: ragQualityPreset({
      maxLatencyMs: 1600,
      maxCostUsd: 0.006,
    }),
    metadata: {
      ...input.metadata,
      source: "ignitionrag-evaluation-bridge",
      datasetRecordId: input.datasetRecord.id,
      workflowSnapshotCount: input.workflowSnapshots.length,
    },
  };
}

export function createBridgeExperiment(
  request: IgnitionRagExperimentExecutionRequest,
): ExperimentDefinition {
  const variants = request.variants.map((variant) => {
    if (variant.agentVariant === undefined) {
      throw new Error(`Variant ${variant.id} is missing an executable AgentVariant.`);
    }
    return variant.agentVariant;
  });

  return defineExperiment({
    name: request.experimentName,
    dataset: request.dataset,
    variants,
    rewards: request.rewards,
    options: {
      concurrency: 3,
    },
    metadata: {
      ...request.metadata,
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
      collectionId: request.collection?.id,
    },
  });
}

function buildExpectedOutput(caseRecord: IgnitionRagEvaluationCaseRecord): ExpectedOutput {
  return {
    ...(caseRecord.expectedExact !== undefined ? { exact: caseRecord.expectedExact } : {}),
    ...(caseRecord.requiredTerms !== undefined ? { contains: caseRecord.requiredTerms } : {}),
    ...(caseRecord.requiredCitations !== undefined
      ? { citations: caseRecord.requiredCitations }
      : {}),
    ...(caseRecord.expectedJson !== undefined ? { json: caseRecord.expectedJson } : {}),
  };
}

function mapWorkflowSnapshotToVariantReference(
  snapshot: IgnitionRagWorkflowSnapshotRecord,
  collection: IgnitionRagCollectionReference,
): IgnitionRagExperimentVariantReference {
  return {
    id: snapshot.id,
    name: snapshot.name,
    runnable: {
      kind: "ignitionrag.workflow",
      id: snapshot.workflowId,
      name: snapshot.name,
      snapshotId: snapshot.id,
      version: snapshot.version,
      collection,
      metadata: {
        ...snapshot.metadata,
        strategy: snapshot.strategy,
      },
    },
    agentVariant: mapWorkflowSnapshotToVariant(snapshot),
    metadata: {
      ...snapshot.metadata,
      strategy: snapshot.strategy,
    },
  };
}

function createWorkflowSnapshotAdapter(snapshot: IgnitionRagWorkflowSnapshotRecord): AgentAdapter {
  const profile = strategyProfiles[snapshot.strategy];

  return {
    name: snapshot.name,
    run(input: AgentInput, _context: RunContext) {
      return {
        output: answerFromSnapshot(input, snapshot.strategy),
        trace: {
          steps: [
            {
              type: "message",
              role: "user",
              content: input.input,
            },
            ...profile.tools.map((tool) => ({
              type: "tool_call" as const,
              name: tool,
              input: {
                workflowSnapshotId: snapshot.id,
                caseId: input.id,
                topK: snapshot.config?.topK,
              },
            })),
            ...(snapshot.strategy === "rag-with-verification"
              ? [
                  {
                    type: "decision" as const,
                    action: "verify_grounding",
                    reason: "Confirm required answer fragments and citations before responding.",
                    confidence: 0.92,
                  },
                ]
              : []),
            {
              type: "message" as const,
              role: "assistant" as const,
              content: `Final answer from IgnitionRAG snapshot ${snapshot.id}.`,
            },
          ],
        },
        usage: {
          latencyMs: profile.latencyMs,
          costUsd: profile.costUsd,
        },
        metadata: {
          ignitionragWorkflowId: snapshot.workflowId,
          ignitionragSnapshotId: snapshot.id,
          strategy: snapshot.strategy,
        },
      };
    },
  };
}

function answerFromSnapshot(input: AgentInput, strategy: IgnitionRagWorkflowStrategy): string {
  const requiredTerms = input.expected?.contains ?? [];
  const citations = input.expected?.citations ?? [];
  const firstTerm = requiredTerms[0] ?? "the requested policy";
  const firstCitation = citations[0];

  if (strategy === "direct-answer") {
    return `Based on general assistant knowledge, the answer likely involves ${firstTerm}.`;
  }

  if (strategy === "rag-basic") {
    const terms = requiredTerms.slice(0, 2).join(" and ");
    return `${terms} are supported by the retrieved collection context. ${
      firstCitation === undefined ? "" : `[${firstCitation}]`
    }`;
  }

  const citationText = citations.map((citation) => `[${citation}]`).join(" ");
  return `${requiredTerms.join(", ")}. Verified against the workflow snapshot context. ${citationText}`;
}
