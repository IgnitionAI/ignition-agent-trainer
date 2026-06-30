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
} from "@ignitionai/agent-trainer-core";

export interface MastraAgentLike {
  generate?: (input: unknown, options?: unknown) => MaybePromise<unknown>;
  run?: (input: unknown, options?: unknown) => MaybePromise<unknown>;
}

export interface MastraAdapterOptions {
  name: string;
  agent: MastraAgentLike;
  mapInput?: (item: DatasetItem) => unknown;
  mapOutput?: (
    raw: unknown,
    input: CallableAdapterRunInput,
  ) => MaybePromise<CallableAdapterRunResult>;
  metadata?: Metadata;
}

export interface MastraVariantOptions extends MastraAdapterOptions {
  id: string;
}

export function createMastraAdapter(options: MastraAdapterOptions) {
  if (options.agent.generate === undefined && options.agent.run === undefined) {
    throw new Error("Mastra adapter requires an agent with generate() or run().");
  }

  return createCallableAdapter({
    name: options.name,
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    async run(input) {
      const raw = await invokeMastraAgent(
        options.agent,
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
              name: mastraCallName(options.agent),
              payload: safeJson(raw),
            },
          ],
        },
        metadata: {
          framework: "mastra",
        },
      };
    },
  });
}

export function mastraAdapter(options: MastraVariantOptions): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    adapter: createMastraAdapter(options),
  };
}

function invokeMastraAgent(
  agent: MastraAgentLike,
  input: unknown,
  context: unknown,
): MaybePromise<unknown> {
  if (agent.generate !== undefined) return agent.generate(input, context);
  if (agent.run !== undefined) return agent.run(input, context);
  throw new Error("Mastra adapter requires an agent with generate() or run().");
}

function mastraCallName(agent: MastraAgentLike): "mastra.generate" | "mastra.run" {
  return agent.generate !== undefined ? "mastra.generate" : "mastra.run";
}

function toAgentOutput(value: unknown): AgentOutput {
  if (isRecord(value) && typeof value.text === "string") return value.text;
  if (isRecord(value) && "output" in value && isAgentOutput(value.output)) return value.output;
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
