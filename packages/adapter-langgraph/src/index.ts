import type { AgentRun, AgentVariant, DatasetItem, RunContext } from "@ignitionai/core";

export interface LangGraphLike {
  invoke(input: unknown, config?: unknown): Promise<unknown>;
}

export function langGraphAdapter(options: {
  id: string;
  name: string;
  graph: LangGraphLike;
  mapInput?: (item: DatasetItem) => unknown;
  mapOutput?: (raw: unknown) => AgentRun;
}): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    async run(item: DatasetItem, context: RunContext) {
      const started = Date.now();
      const input = options.mapInput?.(item) ?? { messages: [{ role: "user", content: item.input }] };
      const raw = await options.graph.invoke(input, context);
      if (options.mapOutput) return options.mapOutput(raw);

      return {
        output: typeof raw === "string" ? raw : JSON.stringify(raw),
        trace: { steps: [{ type: "custom", name: "langgraph.invoke", payload: safeJson(raw) }] },
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
