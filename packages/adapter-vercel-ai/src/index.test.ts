import { createDataset } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import { createExperiment } from "@ignitionai/experiments";
import { describe, expect, it } from "vitest";
import { createVercelAiAdapter, type VercelAiGenerateLike, vercelAiAdapter } from "./index";

describe("createVercelAiAdapter", () => {
  it("wraps a fake Vercel AI SDK-style function that returns text", async () => {
    const generate: VercelAiGenerateLike = async ({ prompt }) => `Generated answer: ${prompt}`;
    const adapter = createVercelAiAdapter({ name: "vercel-ai-text", generate });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toBe("Generated answer: hello");
    expect(result.metadata?.framework).toBe("vercel-ai");
    expect(result.trace.steps[0]).toMatchObject({ type: "custom", name: "vercel_ai.generate" });
  });

  it("wraps a fake function that returns structured data", async () => {
    const generate: VercelAiGenerateLike = async ({ prompt }) => ({
      object: { answer: "structured response", prompt },
    });
    const adapter = createVercelAiAdapter({ name: "vercel-ai-object", generate });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({ answer: "structured response", prompt: "hello" });
  });

  it("preserves usage and metadata when provided", async () => {
    const generate: VercelAiGenerateLike = async ({ prompt }) => ({
      text: `usage response: ${prompt}`,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        costUsd: 0.004,
        latencyMs: 250,
      },
      metadata: { model: "fake-model" },
    });
    const adapter = createVercelAiAdapter({ name: "vercel-ai-usage", generate });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toBe("usage response: hello");
    expect(result.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      costUsd: 0.004,
      latencyMs: 250,
    });
    expect(result.metadata).toMatchObject({ framework: "vercel-ai", model: "fake-model" });
  });

  it("uses base options, custom input and output mappers", async () => {
    const generate: VercelAiGenerateLike = async (input) => ({ output: input });
    const adapter = createVercelAiAdapter({
      name: "vercel-ai-mapped",
      generate,
      baseOptions: { temperature: 0 },
      mapInput: (item) => ({ prompt: item.input, mode: "json", id: item.id }),
      mapOutput: (raw) => ({
        output: raw,
        metadata: { mapped: true },
      }),
    });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({ output: { prompt: "hello", mode: "json", id: "case-1" } });
    expect(result.metadata?.mapped).toBe(true);
  });

  it("works inside createExperiment through the variant helper", async () => {
    const dataset = createDataset([
      {
        id: "case-1",
        input: "Explain Vercel AI SDK evaluation.",
        expected: { contains: ["evaluation", "agents"] },
      },
    ]);
    const generate: VercelAiGenerateLike = async ({ prompt }) =>
      `${prompt} can be measured with evaluation for agents.`;

    const result = await createExperiment({
      name: "vercel-ai-adapter-test",
      dataset,
      variants: [
        vercelAiAdapter({
          id: "vercel-ai-fake",
          name: "Vercel AI Fake",
          generate,
        }),
      ],
      rewards: [containsAll()],
    }).run();

    expect(result.failedCases).toHaveLength(0);
    expect(result.leaderboard[0]?.name).toBe("Vercel AI Fake");
    expect(result.leaderboard[0]?.score).toBe(1);
  });
});
