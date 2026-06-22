import type { RewardFunction } from "@ignitionai/agent-trainer-core";
import {
  citationPresence,
  compositeReward,
  containsAll,
  costPenalty,
  latencyPenalty,
  toolCallCountPenalty,
} from "@ignitionai/agent-trainer-evals";

export interface CitationQualityPresetOptions {
  qualityRewardName?: string;
  qualityWeight?: number;
  containsRewardName?: string;
  containsWeight?: number;
  containsValues?: string[];
  citationRewardName?: string;
  citationWeight?: number;
}

export interface RagQualityPresetOptions extends CitationQualityPresetOptions {
  latencyRewardName?: string;
  latencyWeight?: number;
  maxLatencyMs?: number;
  costRewardName?: string;
  costWeight?: number;
  maxCostUsd?: number;
}

export interface AgenticRagPresetOptions extends RagQualityPresetOptions {
  toolUsageRewardName?: string;
  toolUsageWeight?: number;
  maxToolCalls?: number;
}

export function citationQualityPreset(
  options: CitationQualityPresetOptions = {},
): RewardFunction[] {
  return [
    compositeReward(
      [
        containsAll({
          name: options.containsRewardName ?? "rag_required_terms",
          weight: options.containsWeight ?? 0.65,
          ...(options.containsValues !== undefined ? { values: options.containsValues } : {}),
        }),
        citationPresence({
          name: options.citationRewardName ?? "rag_citations",
          weight: options.citationWeight ?? 0.35,
        }),
      ],
      {
        name: options.qualityRewardName ?? "citation_quality",
        weight: options.qualityWeight ?? 1,
      },
    ),
  ];
}

export function ragQualityPreset(options: RagQualityPresetOptions = {}): RewardFunction[] {
  return [
    ...citationQualityPreset({
      ...options,
      qualityRewardName: options.qualityRewardName ?? "rag_quality",
      qualityWeight: options.qualityWeight ?? 0.75,
    }),
    latencyPenalty({
      name: options.latencyRewardName ?? "rag_latency",
      weight: options.latencyWeight ?? 0.15,
      maxLatencyMs: options.maxLatencyMs ?? 3000,
    }),
    costPenalty({
      name: options.costRewardName ?? "rag_cost",
      weight: options.costWeight ?? 0.1,
      maxCostUsd: options.maxCostUsd ?? 0.01,
    }),
  ];
}

export function agenticRagPreset(options: AgenticRagPresetOptions = {}): RewardFunction[] {
  return [
    ...ragQualityPreset({
      ...options,
      qualityWeight: options.qualityWeight ?? 0.65,
      latencyWeight: options.latencyWeight ?? 0.1,
      costWeight: options.costWeight ?? 0.1,
    }),
    toolCallCountPenalty({
      name: options.toolUsageRewardName ?? "agentic_rag_tool_efficiency",
      weight: options.toolUsageWeight ?? 0.15,
      maxToolCalls: options.maxToolCalls ?? 6,
    }),
  ];
}
