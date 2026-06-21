import type { AgentRun, DatasetItem, RewardFunction, RewardResult, RunContext } from "@ignitionai/core";
import { clampScore } from "@ignitionai/core";

export interface RewardOptions {
  name?: string;
  weight?: number;
}

function textOutput(run: AgentRun): string {
  return typeof run.output === "string" ? run.output : JSON.stringify(run.output);
}

function result(name: string, score: number, weight: number, reason?: string): RewardResult {
  const reward: RewardResult = {
    name,
    score: clampScore(score),
    weight,
    passed: score >= 0.8,
  };
  if (reason !== undefined) reward.reason = reason;
  return reward;
}

export function exactMatch(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "exact_match";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    async evaluate(run: AgentRun, item: DatasetItem) {
      const expected = item.expected?.exact;
      if (!expected) return result(name, 0, weight, "No expected.exact value provided.");
      const actual = textOutput(run).trim();
      return result(name, actual === expected.trim() ? 1 : 0, weight);
    },
  };
}

export function containsText(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "contains_text";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    async evaluate(run: AgentRun, item: DatasetItem) {
      const required = item.expected?.contains ?? [];
      if (required.length === 0) return result(name, 0, weight, "No expected.contains values provided.");

      const actual = textOutput(run).toLowerCase();
      const hits = required.filter((value) => actual.includes(value.toLowerCase()));
      return result(name, hits.length / required.length, weight, `${hits.length}/${required.length} terms found.`);
    },
  };
}

export function citationPresence(options: RewardOptions = {}): RewardFunction {
  const name = options.name ?? "citation_presence";
  const weight = options.weight ?? 1;

  return {
    name,
    weight,
    async evaluate(run: AgentRun, item: DatasetItem) {
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
      );
    },
  };
}

export function toolCallCountPenalty(options: RewardOptions & { maxToolCalls?: number } = {}): RewardFunction {
  const name = options.name ?? "tool_call_efficiency";
  const weight = options.weight ?? 1;
  const maxToolCalls = options.maxToolCalls ?? 5;

  return {
    name,
    weight,
    async evaluate(run: AgentRun) {
      const count = run.trace.steps.filter((step) => step.type === "tool_call").length;
      if (count <= maxToolCalls) return result(name, 1, weight, `${count} tool calls.`);
      const excess = count - maxToolCalls;
      return result(name, Math.max(0, 1 - excess / maxToolCalls), weight, `${count} tool calls exceeds ${maxToolCalls}.`);
    },
  };
}

export function latencyPenalty(options: RewardOptions & { maxLatencyMs: number } = { maxLatencyMs: 3000 }): RewardFunction {
  const name = options.name ?? "latency";
  const weight = options.weight ?? 1;
  const maxLatencyMs = options.maxLatencyMs;

  return {
    name,
    weight,
    async evaluate(run: AgentRun) {
      const latency = run.usage?.latencyMs;
      if (latency === undefined) return result(name, 1, weight, "No latency metric provided.");
      return result(name, latency <= maxLatencyMs ? 1 : maxLatencyMs / latency, weight, `${latency}ms.`);
    },
  };
}

export function costPenalty(options: RewardOptions & { maxCostUsd: number } = { maxCostUsd: 0.01 }): RewardFunction {
  const name = options.name ?? "cost";
  const weight = options.weight ?? 1;
  const maxCostUsd = options.maxCostUsd;

  return {
    name,
    weight,
    async evaluate(run: AgentRun) {
      const cost = run.usage?.costUsd;
      if (cost === undefined) return result(name, 1, weight, "No cost metric provided.");
      return result(name, cost <= maxCostUsd ? 1 : maxCostUsd / cost, weight, `$${cost}.`);
    },
  };
}

export function customReward(
  name: string,
  evaluate: (run: AgentRun, item: DatasetItem, context: RunContext) => Promise<number> | number,
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
