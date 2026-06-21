import {
  type CallableAdapterRunInput,
  type CallableAdapterRunResult,
  createCallableAdapter,
} from "@ignitionai/adapter-callable";
import type {
  AgentOutput,
  AgentVariant,
  DatasetItem,
  MaybePromise,
  Metadata,
} from "@ignitionai/core";

export interface LangChainRunnableLike {
  invoke(input: unknown, config?: unknown): MaybePromise<unknown>;
}

export interface LangChainAdapterOptions {
  name: string;
  runnable: LangChainRunnableLike;
  mapInput?: (item: DatasetItem) => unknown;
  mapOutput?: (
    raw: unknown,
    input: CallableAdapterRunInput,
  ) => MaybePromise<CallableAdapterRunResult>;
  metadata?: Metadata;
}

export interface LangChainVariantOptions extends LangChainAdapterOptions {
  id: string;
}

export function createLangChainAdapter(options: LangChainAdapterOptions) {
  return createCallableAdapter({
    name: options.name,
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    async run(input) {
      const raw = await options.runnable.invoke(
        options.mapInput?.(input.item) ?? input.input,
        input.context,
      );
      if (options.mapOutput !== undefined) return options.mapOutput(raw, input);

      return {
        output: toAgentOutput(raw),
        trace: {
          steps: [
            {
              type: "custom",
              name: "langchain.invoke",
              payload: safeJson(raw),
            },
          ],
        },
        metadata: {
          framework: "langchain",
        },
      };
    },
  });
}

export function langChainAdapter(options: LangChainVariantOptions): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    adapter: createLangChainAdapter(options),
  };
}

function toAgentOutput(value: unknown): AgentOutput {
  if (isRecord(value) && typeof value.content === "string") return value.content;
  if (value === undefined) return "";
  if (isAgentOutput(value)) return value;
  return String(value);
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
