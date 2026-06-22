import {
  type CallableAdapterRunInput,
  type CallableAdapterRunResult,
  createCallableAdapter,
} from "@ignitionai/agent-trainer-adapter-callable";
import type {
  AgentOutput,
  AgentVariant,
  DatasetItem,
  MaybePromise,
  Metadata,
  UsageMetrics,
} from "@ignitionai/agent-trainer-core";

export interface VercelAiGenerateLike {
  // biome-ignore lint/style/useShorthandFunctionType: keep the exported interface stable for adapter consumers.
  (input: { prompt: string; [key: string]: unknown }, context?: unknown): MaybePromise<unknown>;
}

export interface VercelAiAdapterOptions {
  name: string;
  generate: VercelAiGenerateLike;
  baseOptions?: Record<string, unknown>;
  mapInput?: (item: DatasetItem) => { prompt: string; [key: string]: unknown };
  mapOutput?: (
    raw: unknown,
    input: CallableAdapterRunInput,
  ) => MaybePromise<CallableAdapterRunResult>;
  metadata?: Metadata;
}

export interface VercelAiVariantOptions extends VercelAiAdapterOptions {
  id: string;
}

export function createVercelAiAdapter(options: VercelAiAdapterOptions) {
  return createCallableAdapter({
    name: options.name,
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    async run(input) {
      const raw = await options.generate(
        options.mapInput?.(input.item) ?? { ...(options.baseOptions ?? {}), prompt: input.input },
        input.context,
      );
      if (options.mapOutput !== undefined) return options.mapOutput(raw, input);

      return {
        output: toAgentOutput(raw),
        trace: {
          steps: [
            {
              type: "custom",
              name: "vercel_ai.generate",
              payload: safeJson(raw),
            },
          ],
        },
        metadata: {
          framework: "vercel-ai",
          ...metadataFromRaw(raw),
        },
        usage: usageFromRaw(raw),
      };
    },
  });
}

export function vercelAiAdapter(options: VercelAiVariantOptions): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    adapter: createVercelAiAdapter(options),
  };
}

function toAgentOutput(value: unknown): AgentOutput {
  if (isRecord(value) && typeof value.text === "string") return value.text;
  if (isRecord(value) && "object" in value && isAgentOutput(value.object)) return value.object;
  if (isRecord(value) && "output" in value && isAgentOutput(value.output)) return value.output;
  if (value === undefined) return "";
  if (isAgentOutput(value)) return value;
  return String(value);
}

function usageFromRaw(value: unknown): UsageMetrics | undefined {
  if (!isRecord(value) || !isRecord(value.usage)) return undefined;
  const usage: UsageMetrics = {};
  copyNumber(value.usage, usage, "inputTokens");
  copyNumber(value.usage, usage, "outputTokens");
  copyNumber(value.usage, usage, "totalTokens");
  copyNumber(value.usage, usage, "costUsd");
  copyNumber(value.usage, usage, "latencyMs");
  return Object.keys(usage).length > 0 ? usage : undefined;
}

function metadataFromRaw(value: unknown): Metadata {
  if (!isRecord(value) || !isRecord(value.metadata)) return {};
  return value.metadata;
}

function copyNumber(
  source: Record<string, unknown>,
  target: UsageMetrics,
  key: keyof UsageMetrics,
) {
  const value = source[key];
  if (typeof value === "number") target[key] = value;
}

function isAgentOutput(value: unknown): value is AgentOutput {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return true;
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
