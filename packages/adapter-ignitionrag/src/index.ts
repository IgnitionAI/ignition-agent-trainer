import type {
  AgentVariant,
  Dataset,
  ExperimentResult,
  Metadata,
  RewardFunction,
} from "@ignitionai/agent-trainer-core";
import type { ExperimentResultExport } from "@ignitionai/agent-trainer-exporters";

export interface IgnitionRagCollectionReference {
  kind: "ignitionrag.collection";
  id: string;
  name?: string;
  version?: string;
  metadata?: Metadata;
}

export interface IgnitionRagWorkflowReference {
  kind: "ignitionrag.workflow";
  id: string;
  name?: string;
  snapshotId?: string;
  version?: string;
  collection?: IgnitionRagCollectionReference;
  metadata?: Metadata;
}

export interface IgnitionRagAgentReference {
  kind: "ignitionrag.agent";
  id: string;
  name?: string;
  workflow?: IgnitionRagWorkflowReference;
  metadata?: Metadata;
}

export type IgnitionRagRunnableReference = IgnitionRagWorkflowReference | IgnitionRagAgentReference;

export interface IgnitionRagExperimentVariantReference {
  id: string;
  name: string;
  runnable: IgnitionRagRunnableReference;
  agentVariant?: AgentVariant;
  metadata?: Metadata;
}

export interface IgnitionRagExperimentExecutionRequest {
  kind: "ignitionrag.experiment.execution-request";
  requestId?: string;
  experimentName: string;
  dataset: Dataset;
  collection?: IgnitionRagCollectionReference;
  variants: IgnitionRagExperimentVariantReference[];
  rewards: RewardFunction[];
  metadata?: Metadata;
}

export interface IgnitionRagReportArtifact {
  format: "json" | "markdown" | "bundle";
  path?: string;
  contents?: string;
  metadata?: Metadata;
}

export interface IgnitionRagExperimentExecutionResult {
  kind: "ignitionrag.experiment.execution-result";
  requestId?: string;
  experimentName: string;
  result: ExperimentResult;
  report?: ExperimentResultExport;
  artifacts?: IgnitionRagReportArtifact[];
  metadata?: Metadata;
}

export interface IgnitionRagAdapterContract {
  executeExperiment(
    request: IgnitionRagExperimentExecutionRequest,
  ): Promise<IgnitionRagExperimentExecutionResult>;
}
