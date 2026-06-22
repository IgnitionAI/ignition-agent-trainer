import type {
  AgentAdapterResult,
  AgentVariant,
  Dataset,
  DatasetItem,
  ExperimentResult,
  MaybePromise,
  Metadata,
  RewardFunction,
  RunContext,
} from "@ignitionai/agent-trainer-core";
import { createExperiment, type ExperimentOptions } from "@ignitionai/agent-trainer-experiments";
import { type OptimizationObjective, type RankedVariant, rankVariants } from "./optimization";

export type CandidateKind = "prompt" | "workflow";

export interface CandidateRunInput {
  input: string;
  item: DatasetItem;
  context: RunContext;
  candidate: PromptCandidate | WorkflowCandidate;
}

export type CandidateRun = (input: CandidateRunInput) => MaybePromise<AgentAdapterResult>;

interface BaseCandidate {
  id: string;
  name?: string;
  run: CandidateRun;
  metadata?: Metadata;
}

export interface PromptCandidate extends BaseCandidate {
  kind: "prompt";
  prompt: string;
}

export interface WorkflowCandidate extends BaseCandidate {
  kind: "workflow";
  workflow: string | Metadata;
}

export type EvaluationCandidate = PromptCandidate | WorkflowCandidate;

export interface CandidateEvaluationConfig {
  name: string;
  dataset: Dataset;
  candidates: EvaluationCandidate[];
  rewards: RewardFunction[];
  objective?: OptimizationObjective;
  options?: ExperimentOptions;
  metadata?: Metadata;
}

export interface CandidateEvaluationResult {
  report: ExperimentResult;
  ranking: RankedVariant[];
  best: RankedVariant | null;
}

export function createCandidateVariants(candidates: EvaluationCandidate[]): AgentVariant[] {
  return candidates.map(candidateToVariant);
}

export function candidateToVariant(candidate: EvaluationCandidate): AgentVariant {
  return {
    id: candidate.id,
    name: candidate.name ?? candidate.id,
    config: candidateConfig(candidate),
    run(item, context) {
      return candidate.run({
        input: item.input,
        item,
        context,
        candidate,
      });
    },
  };
}

export async function evaluateCandidates(
  config: CandidateEvaluationConfig,
): Promise<CandidateEvaluationResult> {
  if (config.candidates.length === 0) {
    const now = new Date().toISOString();
    const report: ExperimentResult = {
      name: config.name,
      startedAt: now,
      endedAt: now,
      leaderboard: [],
      cases: [],
      failedCases: [],
      ...(config.metadata !== undefined ? { metadata: config.metadata } : {}),
    };
    return { report, ranking: [], best: null };
  }

  const report = await createExperiment({
    name: config.name,
    dataset: config.dataset,
    variants: createCandidateVariants(config.candidates),
    rewards: config.rewards,
    ...(config.options !== undefined ? { options: config.options } : {}),
    ...(config.metadata !== undefined ? { metadata: config.metadata } : {}),
  }).run();
  const ranking = rankVariants(report, config.objective ?? "balanced");

  return {
    report,
    ranking,
    best: ranking[0] ?? null,
  };
}

function candidateConfig(candidate: EvaluationCandidate): Metadata {
  return {
    kind: candidate.kind,
    ...(candidate.kind === "prompt"
      ? { prompt: candidate.prompt }
      : { workflow: candidate.workflow }),
    ...candidate.metadata,
  };
}
