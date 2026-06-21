import type { AgentRun, AgentVariant, DatasetItem, RunContext } from "@ignitionai/core";

export interface LangChainRunnableLike {
  invoke(input: unknown, config?: unknown): Promise<unknown>;
}

export function langChainAdapter(options: {
  id: string;
  name: string;
  runnable: LangChainRunnableLike;
  mapInput?: (item: DatasetItem) => unknown;
  mapOutput?: (raw: unknown) => AgentRun;
}): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    async run(item: DatasetItem, context: RunContext) {
      const started = Date.now();
      const raw = await options.runnable.invoke(options.mapInput?.(item) ?? item.input, context);
      if (options.mapOutput) return options.mapOutput(raw);

      return {
        output: typeof raw === "string" ? raw : JSON.stringify(raw),
        trace: { steps: [{ type: "custom", name: "langchain.invoke", payload: safeJson(raw) }] },
        usage: { latencyMs: Date.now() - started },
      };
    },
  };
}

function safeJson(value: unknown): any {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
