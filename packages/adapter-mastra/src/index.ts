import type { AgentRun, AgentVariant, DatasetItem, RunContext } from "@ignitionai/core";

export interface MastraAgentLike {
  generate(input: string | unknown): Promise<unknown>;
}

export function mastraAdapter(options: {
  id: string;
  name: string;
  agent: MastraAgentLike;
  mapInput?: (item: DatasetItem) => string | unknown;
  mapOutput?: (raw: unknown) => AgentRun;
}): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    async run(item: DatasetItem, _context: RunContext) {
      const started = Date.now();
      const raw = await options.agent.generate(options.mapInput?.(item) ?? item.input);
      if (options.mapOutput) return options.mapOutput(raw);

      const output = extractText(raw);
      return {
        output,
        trace: { steps: [{ type: "custom", name: "mastra.generate", payload: safeJson(raw) }] },
        usage: { latencyMs: Date.now() - started },
      };
    },
  };
}

function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "text" in raw) return String((raw as { text: unknown }).text);
  return JSON.stringify(raw);
}

function safeJson(value: unknown): any {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
