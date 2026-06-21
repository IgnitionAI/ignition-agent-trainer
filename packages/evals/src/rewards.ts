import type {
  DatasetItem,
  MetricResult,
  Reward,
  RewardFunction,
  RunContext,
  RunResult,
} from "@ignitionai/core";
import { clampScore, weightedAverage } from "@ignitionai/core";

export interface RewardOptions {
  name?: string;
  weight?: number;
}

export interface ContainsOptions extends RewardOptions {
  values?: string[];
}

export interface ToolUsageOptions extends RewardOptions {
  maxToolCalls?: number;
}

export interface LatencyOptions extends RewardOptions {
  maxLatencyMs?: number;
}

export interface CostOptions extends RewardOptions {
  maxCostUsd?: number;
}

function textOutput(run: RunResult): string {
  if (typeof run.output === "string") return run.output;

  try {
    return JSON.stringify(run.output);
  } catch {
    return String(run.output);
  }
}

function result(
  name: string,
  score: number,
  weight: number,
  reason?: string,
  metadata?: Record<string, unknown>,
): MetricResult {
  const reward: MetricResult = {
    name,
    score: clampScore(score),
    weight,
    passed: score >= 0.8,
  };
  if (reason !== undefined) reward.reason = reason;
  if (metadata !== undefined) reward.metadata = metadata;
  return reward;
}

export function exactMatch(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "exact_match";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    evaluate(run: RunResult, item: DatasetItem) {
      const expected = item.expected?.exact;
      if (!expected) return result(name, 0, weight, "No expected.exact value provided.");
      const actual = textOutput(run).trim();
      const passed = actual === expected.trim();
      return result(
        name,
        passed ? 1 : 0,
        weight,
        passed ? "Exact match." : "Output did not match expected text.",
      );
    },
  };
}

export function containsAll(options: ContainsOptions = {}): RewardFunction {
  const name = options.name ?? "contains_all";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    evaluate(run: RunResult, item: DatasetItem) {
      const required = options.values ?? item.expected?.contains ?? [];
      if (required.length === 0)
        return result(name, 0, weight, "No expected.contains values provided.");

      const actual = textOutput(run).toLowerCase();
      const hits = required.filter((value) => actual.includes(value.toLowerCase()));
      const missing = required.filter((value) => !actual.includes(value.toLowerCase()));
      return result(
        name,
        hits.length / required.length,
        weight,
        `${hits.length}/${required.length} terms found.`,
        {
          hits,
          missing,
        },
      );
    },
  };
}

export function containsText(options: ContainsOptions = {}): RewardFunction {
  return containsAll({ ...options, name: options.name ?? "contains_text" });
}

export function jsonValidity(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "json_validity";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    evaluate(run: RunResult) {
      if (typeof run.output !== "string") {
        return result(name, 1, weight, "Output is already structured JSON-compatible data.");
      }

      try {
        JSON.parse(run.output);
        return result(name, 1, weight, "Output is valid JSON.");
      } catch (error) {
        return result(name, 0, weight, "Output is not valid JSON.", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  };
}

export function citationPresence(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "citation_presence";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    evaluate(run: RunResult, item: DatasetItem) {
      const expectedCitations = item.expected?.citations ?? [];
      if (expectedCitations.length === 0) {
        return result(name, 0, weight, "No expected.citations values provided.");
      }

      const actual = textOutput(run).toLowerCase();
      const hits = expectedCitations.filter((citation) => actual.includes(citation.toLowerCase()));
      return result(
        name,
        hits.length / expectedCitations.length,
        weight,
        `${hits.length}/${expectedCitations.length} citations found.`,
        {
          hits,
          missing: expectedCitations.filter((citation) => !actual.includes(citation.toLowerCase())),
        },
      );
    },
  };
}

export function toolUsagePenalty(options: ToolUsageOptions = {}): RewardFunction {
  const name = options.name ?? "tool_usage";
  const weight = options.weight ?? 1;
  const maxToolCalls = options.maxToolCalls ?? 5;

  return {
    name,
    weight,
    evaluate(run: RunResult) {
      const count = run.trace.steps.filter((step) => step.type === "tool_call").length;
      if (count <= maxToolCalls) return result(name, 1, weight, `${count} tool calls.`);
      const excess = count - maxToolCalls;
      return result(
        name,
        Math.max(0, 1 - excess / maxToolCalls),
        weight,
        `${count} tool calls exceeds ${maxToolCalls}.`,
      );
    },
  };
}

export function toolCallCountPenalty(options: ToolUsageOptions = {}): RewardFunction {
  return toolUsagePenalty({ ...options, name: options.name ?? "tool_call_efficiency" });
}

export function latencyPenalty(options: LatencyOptions = {}): RewardFunction {
  const name = options.name ?? "latency";
  const weight = options.weight ?? 1;
  const maxLatencyMs = options.maxLatencyMs ?? 3000;

  return {
    name,
    weight,
    evaluate(run: RunResult) {
      const latency = run.usage?.latencyMs;
      if (latency === undefined) return result(name, 1, weight, "No latency metric provided.");
      return result(
        name,
        latency <= maxLatencyMs ? 1 : maxLatencyMs / latency,
        weight,
        `${latency}ms.`,
      );
    },
  };
}

export function costPenalty(options: CostOptions = {}): RewardFunction {
  const name = options.name ?? "cost";
  const weight = options.weight ?? 1;
  const maxCostUsd = options.maxCostUsd ?? 0.01;

  return {
    name,
    weight,
    evaluate(run: RunResult) {
      const cost = run.usage?.costUsd;
      if (cost === undefined) return result(name, 1, weight, "No cost metric provided.");
      return result(name, cost <= maxCostUsd ? 1 : maxCostUsd / cost, weight, `$${cost}.`);
    },
  };
}

export function compositeReward(rewards: Reward[], options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "composite_reward";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    async evaluate(run: RunResult, item: DatasetItem, context: RunContext) {
      const components = [];
      for (const reward of rewards) {
        const component = await reward.evaluate(run, item, context);
        components.push({ ...component, weight: component.weight ?? reward.weight ?? 1 });
      }

      return result(
        name,
        weightedAverage(components),
        weight,
        `${components.length} rewards combined.`,
        {
          components,
        },
      );
    },
  };
}

export function customReward(
  name: string,
  evaluate: (run: RunResult, item: DatasetItem, context: RunContext) => Promise<number> | number,
  options: { weight?: number } = {},
): RewardFunction {
  const weight = options.weight ?? 1;
  return {
    name,
    weight,
    async evaluate(run, item, context) {
      const score = await evaluate(run, item, context);
      return result(name, score, weight);
    },
  };
}
