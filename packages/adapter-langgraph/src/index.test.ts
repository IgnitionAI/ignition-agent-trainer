import { createDataset } from "@ignitionai/agent-trainer-core";
import { containsAll } from "@ignitionai/agent-trainer-evals";
import { createExperiment } from "@ignitionai/agent-trainer-experiments";
import { describe, expect, it } from "vitest";
import { createLangGraphAdapter, type LangGraphLike, langGraphAdapter } from "./index";

describe("createLangGraphAdapter", () => {
  it("wraps a fake graph that returns text output", async () => {
    const graph: LangGraphLike = {
      async invoke(input) {
        return `Graph answer: ${JSON.stringify(input)}`;
      },
    };
    const adapter = createLangGraphAdapter({ name: "langgraph-text", graph });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toContain("Graph answer:");
    expect(result.output).toContain('"content":"hello"');
    expect(result.metadata?.framework).toBe("langgraph");
    expect(result.trace.steps[0]).toMatchObject({ type: "custom", name: "langgraph.invoke" });
  });

  it("wraps a fake graph that returns structured object output", async () => {
    const graph: LangGraphLike = {
      async invoke(input) {
        return { answer: "structured graph response", input };
      },
    };
    const adapter = createLangGraphAdapter({ name: "langgraph-object", graph });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({
      answer: "structured graph response",
      input: { messages: [{ role: "user", content: "hello" }] },
    });
  });

  it("uses custom input and output mappers when provided", async () => {
    const graph: LangGraphLike = {
      async invoke(input) {
        return { content: `mapped ${JSON.stringify(input)}` };
      },
    };
    const adapter = createLangGraphAdapter({
      name: "langgraph-mapped",
      graph,
      mapInput: (item) => ({ state: { question: item.input, caseId: item.id } }),
      mapOutput: (raw) => ({
        output: raw,
        metadata: { mapped: true },
        latencyMs: 42,
      }),
    });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({
      content: 'mapped {"state":{"question":"hello","caseId":"case-1"}}',
    });
    expect(result.metadata?.mapped).toBe(true);
    expect(result.usage?.latencyMs).toBe(42);
  });

  it("lets thrown errors flow into the experiment failure path", async () => {
    const graph: LangGraphLike = {
      async invoke() {
        throw new Error("graph failed");
      },
    };
    const adapter = createLangGraphAdapter({ name: "langgraph-failing", graph });

    await expect(adapter.run({ id: "case-1", input: "hello" }, {})).rejects.toThrow("graph failed");
  });

  it("works inside createExperiment through the variant helper", async () => {
    const dataset = createDataset([
      {
        id: "case-1",
        input: "Explain graph evaluation.",
        expected: { contains: ["evaluation", "agents"] },
      },
    ]);
    const graph: LangGraphLike = {
      async invoke() {
        return "Graph workflows can be measured with evaluation for agents.";
      },
    };

    const result = await createExperiment({
      name: "langgraph-adapter-test",
      dataset,
      variants: [
        langGraphAdapter({
          id: "langgraph-fake",
          name: "LangGraph Fake",
          graph,
        }),
      ],
      rewards: [containsAll()],
    }).run();

    expect(result.failedCases).toHaveLength(0);
    expect(result.leaderboard[0]?.name).toBe("LangGraph Fake");
    expect(result.leaderboard[0]?.score).toBe(1);
  });
});
