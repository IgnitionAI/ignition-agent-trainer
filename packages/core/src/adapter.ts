import type {
  AgentAdapter,
  AgentAdapterResult,
  AgentInput,
  AgentOutput,
  DatasetItem,
  MaybePromise,
  Metadata,
  RunContext,
  RunResult,
  Trace,
  UsageMetrics,
} from "./types";
import { assertRunResult, assertUsageMetrics } from "./validation";

export type MockAdapterHandler =
  | AgentAdapterResult
  | ((input: AgentInput, context: RunContext) => MaybePromise<AgentAdapterResult>);

export interface MockAdapterOptions {
  name?: string;
  trace?: Trace;
  usage?: UsageMetrics;
}

export function createMockAdapter(
  handler: MockAdapterHandler,
  options: MockAdapterOptions = {},
): AgentAdapter {
  if (options.trace !== undefined) assertRunResult({ output: "", trace: options.trace });
  if (options.usage !== undefined) assertUsageMetrics(options.usage);

  const adapter: AgentAdapter = {
    async run(input, context) {
      const value = typeof handler === "function" ? await handler(input, context) : handler;
      const normalized = normalizeRunResult(value);

      return {
        ...normalized,
        trace: normalized.trace.steps.length
          ? normalized.trace
          : (options.trace ?? normalized.trace),
        usage: { ...options.usage, ...normalized.usage },
      };
    },
  };
  if (options.name !== undefined) adapter.name = options.name;
  return adapter;
}

export function toAgentInput(item: DatasetItem): AgentInput {
  const input: AgentInput = {
    id: item.id,
    input: item.input,
  };
  if (item.expected !== undefined) input.expected = item.expected;
  if (item.metadata !== undefined) input.metadata = item.metadata;
  return input;
}

export function normalizeRunResult(value: AgentAdapterResult): RunResult {
  if (isRunResultLike(value)) {
    const result = {
      output: value.output,
      trace: value.trace ?? { steps: [] },
      ...(value.usage !== undefined ? { usage: value.usage } : {}),
      ...(value.metadata !== undefined ? { metadata: value.metadata } : {}),
    };
    assertRunResult(result);
    return result;
  }

  return {
    output: value,
    trace: { steps: [] },
  };
}

interface RunResultLike {
  output: AgentOutput;
  trace?: Trace;
  usage?: UsageMetrics;
  metadata?: Metadata;
}

function isRunResultLike(value: AgentAdapterResult): value is RunResultLike {
  return value !== null && typeof value === "object" && "output" in value;
}
