import { createDataset } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import { createExperiment } from "@ignitionai/experiments";
import { describe, expect, it } from "vitest";
import { createMastraAdapter, type MastraAgentLike, mastraAdapter } from "./index";

describe("createMastraAdapter", () => {
  it("wraps a fake Mastra-like agent that returns text", async () => {
    const agent: MastraAgentLike = {
      async generate(input) {
        return `Generated answer: ${input}`;
      },
    };
    const adapter = createMastraAdapter({ name: "mastra-text", agent });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toBe("Generated answer: hello");
    expect(result.metadata?.framework).toBe("mastra");
    expect(result.trace.steps[0]).toMatchObject({ type: "custom", name: "mastra.generate" });
  });

  it("wraps a fake Mastra-like agent that returns structured output", async () => {
    const agent: MastraAgentLike = {
      async run(input) {
        return { answer: "structured mastra response", input };
      },
    };
    const adapter = createMastraAdapter({ name: "mastra-object", agent });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({ answer: "structured mastra response", input: "hello" });
    expect(result.trace.steps[0]).toMatchObject({ type: "custom", name: "mastra.run" });
  });

  it("uses custom input and output mappers when provided", async () => {
    const agent: MastraAgentLike = {
      async generate(input) {
        return { text: `mapped ${JSON.stringify(input)}` };
      },
    };
    const adapter = createMastraAdapter({
      name: "mastra-mapped",
      agent,
      mapInput: (item) => ({ prompt: item.input, caseId: item.id }),
      mapOutput: (raw) => ({
        output: raw,
        metadata: { mapped: true },
        costUsd: 0.03,
      }),
    });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({ text: 'mapped {"prompt":"hello","caseId":"case-1"}' });
    expect(result.metadata?.mapped).toBe(true);
    expect(result.usage?.costUsd).toBe(0.03);
  });

  it("lets thrown errors flow into the experiment failure path", async () => {
    const agent: MastraAgentLike = {
      async generate() {
        throw new Error("mastra failed");
      },
    };
    const adapter = createMastraAdapter({ name: "mastra-failing", agent });

    await expect(adapter.run({ id: "case-1", input: "hello" }, {})).rejects.toThrow(
      "mastra failed",
    );
  });

  it("works inside createExperiment through the variant helper", async () => {
    const dataset = createDataset([
      {
        id: "case-1",
        input: "Explain Mastra evaluation.",
        expected: { contains: ["evaluation", "agents"] },
      },
    ]);
    const agent: MastraAgentLike = {
      async generate(input) {
        return `${input} can be measured with evaluation for agents.`;
      },
    };

    const result = await createExperiment({
      name: "mastra-adapter-test",
      dataset,
      variants: [
        mastraAdapter({
          id: "mastra-fake",
          name: "Mastra Fake",
          agent,
        }),
      ],
      rewards: [containsAll()],
    }).run();

    expect(result.failedCases).toHaveLength(0);
    expect(result.leaderboard[0]?.name).toBe("Mastra Fake");
    expect(result.leaderboard[0]?.score).toBe(1);
  });
});
