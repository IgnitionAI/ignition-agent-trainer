import type { AgentRun, AgentVariant, DatasetItem, RunContext } from "@ignitionai/core";

export interface VercelAiGenerateLike {
  (input: { prompt: string; [key: string]: unknown }): Promise<unknown>;
}

export function vercelAiAdapter(options: {
  id: string;
  name: string;
  generate: VercelAiGenerateLike;
  baseOptions?: Record<string, unknown>;
  mapInput?: (item: DatasetItem) => { prompt: string; [key: string]: unknown };
  mapOutput?: (raw: unknown) => AgentRun;
}): AgentVariant {
  return {
    id: options.id,
    name: options.name,
    async run(item: DatasetItem, _context: RunContext) {
      const started = Date.now();
      const raw = await options.generate(
        options.mapInput?.(item) ?? { ...(options.baseOptions ?? {}), prompt: item.input },
      );
      if (options.mapOutput) return options.mapOutput(raw);

      const output = extractText(raw);
      return {
        output,
        trace: { steps: [{ type: "custom", name: "vercel_ai.generate", payload: safeJson(raw) }] },
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
