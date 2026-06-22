import type { IgnitionRagCollectionReference } from "@ignitionai/adapter-ignitionrag";
import {
  createBridgeExperiment,
  createIgnitionRagExecutionRequest,
  type IgnitionRagEvaluationCaseRecord,
  type IgnitionRagEvaluationDatasetRecord,
  type IgnitionRagWorkflowSnapshotRecord,
} from "./bridge";

export const sampleCollection: IgnitionRagCollectionReference = {
  kind: "ignitionrag.collection",
  id: "col-support-handbook",
  name: "Support Handbook",
  version: "2026-06-alpha",
  metadata: {
    projectId: "proj-customer-ops",
    tenantId: "tenant-ignition-demo",
  },
};

export const sampleDatasetRecord: IgnitionRagEvaluationDatasetRecord = {
  id: "dataset-support-risk",
  name: "support-risk-evaluation",
  description: "Support and policy questions used to evaluate IgnitionRAG workflow snapshots.",
  collectionId: sampleCollection.id,
  source: "manual",
  metadata: {
    owner: "evaluation-center",
  },
};

export const sampleCaseRecords: IgnitionRagEvaluationCaseRecord[] = [
  {
    id: "refund-window",
    datasetId: sampleDatasetRecord.id,
    input: "Can an annual subscriber request a refund after purchase?",
    requiredTerms: ["30 days", "annual subscription", "billing support"],
    requiredCitations: ["billing-handbook.md#refund-window"],
    metadata: {
      taskType: "support",
      riskLevel: "medium",
      citationRequired: true,
    },
  },
  {
    id: "audit-retention",
    datasetId: sampleDatasetRecord.id,
    input: "How long are workspace audit events retained?",
    requiredTerms: ["180 days", "audit events", "workspace"],
    requiredCitations: ["security-controls.md#audit-retention"],
    metadata: {
      taskType: "security",
      riskLevel: "high",
      citationRequired: true,
    },
  },
  {
    id: "contract-notice",
    datasetId: sampleDatasetRecord.id,
    input: "What notice is required before terminating an enterprise contract?",
    requiredTerms: ["60 days", "written notice", "enterprise contract"],
    requiredCitations: ["contract-terms.md#termination"],
    metadata: {
      taskType: "contract",
      riskLevel: "high",
      citationRequired: true,
    },
  },
  {
    id: "missing-citation",
    datasetId: sampleDatasetRecord.id,
    input: "What should the assistant do when it cannot find a policy citation?",
    requiredTerms: ["ask for clarification", "missing citation", "do not guess"],
    requiredCitations: ["support-policy.md#missing-citation"],
    metadata: {
      taskType: "policy",
      riskLevel: "high",
      citationRequired: true,
    },
  },
];

export const sampleWorkflowSnapshots: IgnitionRagWorkflowSnapshotRecord[] = [
  {
    id: "snapshot-direct-answer-v1",
    workflowId: "workflow-support-assistant",
    name: "direct-answer snapshot",
    version: "1",
    collectionId: sampleCollection.id,
    strategy: "direct-answer",
    config: {
      topK: 0,
      verifyGrounding: false,
    },
  },
  {
    id: "snapshot-rag-basic-v2",
    workflowId: "workflow-support-assistant",
    name: "rag-basic snapshot",
    version: "2",
    collectionId: sampleCollection.id,
    strategy: "rag-basic",
    config: {
      topK: 5,
      verifyGrounding: false,
    },
  },
  {
    id: "snapshot-rag-verify-v3",
    workflowId: "workflow-support-assistant",
    name: "rag-with-verification snapshot",
    version: "3",
    collectionId: sampleCollection.id,
    strategy: "rag-with-verification",
    config: {
      topK: 8,
      rerank: true,
      verifyGrounding: true,
    },
  },
];

export const sampleExecutionRequest = createIgnitionRagExecutionRequest({
  requestId: "eval-run-support-risk-001",
  experimentName: "ignitionrag-evaluation-bridge",
  collection: sampleCollection,
  datasetRecord: sampleDatasetRecord,
  caseRecords: sampleCaseRecords,
  workflowSnapshots: sampleWorkflowSnapshots,
  metadata: {
    productSurface: "Evaluation Center",
  },
});

export const sampleBridgeExperiment = createBridgeExperiment(sampleExecutionRequest);
