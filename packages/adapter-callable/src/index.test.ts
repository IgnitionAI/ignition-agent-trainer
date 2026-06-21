import { createDataset } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import { createExperiment } from "@ignitionai/experiments";
import { describe, expect, it } from "vitest";
import { createCallableAdapter } from "./index";

describe("createCallableAdapter", () => {
  it("wraps a simple async function", async () => {
    const adapter = createCallableAdapter({
      name: "simple",
      run: async ({ input }) => `Answer to: ${input}`,
    });

    const result = await adapter.run({ id: "q1", input: "hello" }, {});

    expect(result.output).toBe("Answer to: hello");
  });

  it("passes dataset input and item to the callable", async () => {
    const adapter = createCallableAdapter({
      name: "captures-input",
      run: async ({ input, item }) => ({
        output: `${item.id}:${input}:${item.metadata?.topic}`,
      }),
    });

    const result = await adapter.run(
      { id: "case-1", input: "question", metadata: { topic: "support" } },
      {},
    );

    expect(result.output).toBe("case-1:question:support");
  });

  it("returns structured object output correctly", async () => {
    const adapter = createCallableAdapter({
      name: "structured",
      run: async () => ({
        output: { answer: "structured response", confidence: 0.9 },
      }),
    });

    const result = await adapter.run({ id: "q1", input: "hello" }, {});

    expect(result.output).toEqual({ answer: "structured response", confidence: 0.9 });
  });

  it("records latency automatically", async () => {
    const adapter = createCallableAdapter({
      name: "latency",
      run: async () => ({ output: "ok" }),
    });

    const result = await adapter.run({ id: "q1", input: "hello" }, {});

    expect(result.usage?.latencyMs).toEqual(expect.any(Number));
  });

  it("preserves metadata such as costUsd and maps it to usage", async () => {
    const adapter = createCallableAdapter({
      name: "cost",
      run: async () => ({
        output: "ok",
        metadata: { costUsd: 0.02 },
      }),
    });

    const result = await adapter.run({ id: "q1", input: "hello" }, {});

    expect(result.metadata?.costUsd).toBe(0.02);
    expect(result.usage?.costUsd).toBe(0.02);
  });

  it("preserves trace if provided", async () => {
    const adapter = createCallableAdapter({
      name: "trace",
      run: async () => ({
        output: "ok",
        trace: { steps: [{ type: "tool_call", name: "search" }] },
      }),
    });

    const result = await adapter.run({ id: "q1", input: "hello" }, {});

    expect(result.trace.steps).toEqual([{ type: "tool_call", name: "search" }]);
  });

  it("lets thrown errors flow into the experiment failure path", async () => {
    const adapter = createCallableAdapter({
      name: "failing",
      run: async () => {
        throw new Error("callable failed");
      },
    });

    await expect(adapter.run({ id: "q1", input: "hello" }, {})).rejects.toThrow("callable failed");
  });

  it("works inside createExperiment", async () => {
    const dataset = createDataset([
      {
        id: "q1",
        input: "What is Ignition?",
        expected: { contains: ["evaluation", "agents"] },
      },
    ]);
    const adapter = createCallableAdapter({
      name: "experiment-agent",
      run: async ({ input }) => ({
        output: `${input} is about evaluation for agents.`,
        metadata: { costUsd: 0.01 },
      }),
    });

    const result = await createExperiment({
      name: "callable-test",
      dataset,
      variants: [{ name: "experiment-agent", adapter }],
      rewards: [containsAll()],
    }).run();

    expect(result.leaderboard[0]?.name).toBe("experiment-agent");
    expect(result.leaderboard[0]?.score).toBe(1);
    expect(result.cases[0]?.usage?.costUsd).toBe(0.01);
  });

  it("records failed cases without crashing the experiment", async () => {
    const dataset = createDataset([{ id: "q1", input: "hello" }]);
    const adapter = createCallableAdapter({
      name: "failing-experiment-agent",
      run: async () => {
        throw new Error("provider unavailable");
      },
    });

    const result = await createExperiment({
      name: "callable-failure-test",
      dataset,
      variants: [{ name: "failing-experiment-agent", adapter }],
      rewards: [containsAll({ values: ["ok"] })],
    }).run();

    expect(result.failedCases).toHaveLength(1);
    expect(result.failedCases[0]?.error?.message).toBe("provider unavailable");
  });
});
