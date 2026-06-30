import type {
  AgentAdapter,
  AgentInput,
  AgentOutput,
  MaybePromise,
  Metadata,
  RunContext,
  RunResult,
  Trace,
  UsageMetrics,
} from "@ignitionai/agent-trainer-core";

export interface CallableAdapterRunInput {
  input: string;
  item: AgentInput;
  context: RunContext;
}

export type CallableAdapterRunResult =
  | AgentOutput
  | {
      output: AgentOutput;
      trace?: Trace;
      metadata?: Metadata;
      usage?: UsageMetrics;
      costUsd?: number;
      latencyMs?: number;
    };

export type CallableAdapterResult = CallableAdapterRunResult;

export type CallableAdapterRun = (
  input: CallableAdapterRunInput,
) => MaybePromise<CallableAdapterRunResult>;

export interface CallableAdapterOptions {
  name: string;
  run: CallableAdapterRun;
  metadata?: Metadata;
}

export interface CallableAgentAdapter extends AgentAdapter {
  name: string;
  run(input: AgentInput, context: RunContext): Promise<RunResult>;
}

export function createCallableAdapter(options: CallableAdapterOptions): CallableAgentAdapter {
  if (!options.name.trim()) {
    throw new Error("Callable adapter name is required.");
  }

  return {
    name: options.name,
    async run(item, context) {
      const startedAt = Date.now();
      const result = await options.run({
        input: item.input,
        item,
        context,
      });

      return normalizeCallableResult(result, {
        startedAt,
        adapterName: options.name,
        ...(options.metadata !== undefined ? { defaultMetadata: options.metadata } : {}),
      });
    },
  };
}

function normalizeCallableResult(
  result: CallableAdapterRunResult,
  options: {
    startedAt: number;
    adapterName: string;
    defaultMetadata?: Metadata;
  },
): RunResult {
  const measuredLatencyMs = Date.now() - options.startedAt;

  if (isCallableResultObject(result)) {
    const metadata = {
      ...options.defaultMetadata,
      ...result.metadata,
    };
    const usage = normalizeUsage(result, metadata, measuredLatencyMs);

    return {
      output: result.output,
      trace: result.trace ?? defaultTrace(options.adapterName),
      usage,
      metadata,
    };
  }

  return {
    output: result,
    trace: defaultTrace(options.adapterName),
    usage: {
      latencyMs: measuredLatencyMs,
    },
    ...(options.defaultMetadata !== undefined ? { metadata: options.defaultMetadata } : {}),
  };
}

function normalizeUsage(
  result: Extract<CallableAdapterRunResult, { output: AgentOutput }>,
  metadata: Metadata,
  measuredLatencyMs: number,
): UsageMetrics {
  const usage: UsageMetrics = {
    ...result.usage,
  };

  usage.latencyMs =
    result.usage?.latencyMs ??
    result.latencyMs ??
    numericMetadata(metadata, "latencyMs") ??
    measuredLatencyMs;

  const costUsd = result.usage?.costUsd ?? result.costUsd ?? numericMetadata(metadata, "costUsd");
  if (costUsd !== undefined) {
    usage.costUsd = costUsd;
  }

  return usage;
}

function defaultTrace(adapterName: string): Trace {
  return {
    steps: [
      {
        type: "custom",
        name: "callable.run",
        payload: { adapterName },
      },
    ],
  };
}

function isCallableResultObject(
  result: CallableAdapterRunResult,
): result is Extract<CallableAdapterRunResult, { output: AgentOutput }> {
  return (
    result !== null && typeof result === "object" && !Array.isArray(result) && "output" in result
  );
}

function numericMetadata(metadata: Metadata, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" ? value : undefined;
}
