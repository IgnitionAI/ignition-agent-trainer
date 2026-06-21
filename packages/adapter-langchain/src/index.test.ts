import { createDataset } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import { createExperiment } from "@ignitionai/experiments";
import { describe, expect, it } from "vitest";
import { createLangChainAdapter, type LangChainRunnableLike, langChainAdapter } from "./index";

describe("createLangChainAdapter", () => {
  it("wraps a fake Runnable that returns text output", async () => {
    const runnable: LangChainRunnableLike = {
      async invoke(input) {
        return `Runnable answer: ${input}`;
      },
    };
    const adapter = createLangChainAdapter({ name: "langchain-text", runnable });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toBe("Runnable answer: hello");
    expect(result.metadata?.framework).toBe("langchain");
    expect(result.trace.steps[0]).toMatchObject({ type: "custom", name: "langchain.invoke" });
  });

  it("wraps a fake Runnable that returns object output", async () => {
    const runnable: LangChainRunnableLike = {
      async invoke(input) {
        return { answer: `structured ${input}`, confidence: 0.9 };
      },
    };
    const adapter = createLangChainAdapter({ name: "langchain-object", runnable });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({ answer: "structured hello", confidence: 0.9 });
  });

  it("uses custom input and output mappers when provided", async () => {
    const runnable: LangChainRunnableLike = {
      async invoke(input) {
        return { content: `mapped ${JSON.stringify(input)}`, usage: { costUsd: 0.02 } };
      },
    };
    const adapter = createLangChainAdapter({
      name: "langchain-mapped",
      runnable,
      mapInput: (item) => ({ question: item.input, id: item.id }),
      mapOutput: (raw) => ({
        output: raw,
        metadata: { mapped: true },
        costUsd: 0.02,
      }),
    });

    const result = await adapter.run({ id: "case-1", input: "hello" }, {});

    expect(result.output).toEqual({
      content: 'mapped {"question":"hello","id":"case-1"}',
      usage: { costUsd: 0.02 },
    });
    expect(result.metadata?.mapped).toBe(true);
    expect(result.usage?.costUsd).toBe(0.02);
  });

  it("lets thrown errors flow into the experiment failure path", async () => {
    const runnable: LangChainRunnableLike = {
      async invoke() {
        throw new Error("runnable failed");
      },
    };
    const adapter = createLangChainAdapter({ name: "langchain-failing", runnable });

    await expect(adapter.run({ id: "case-1", input: "hello" }, {})).rejects.toThrow(
      "runnable failed",
    );
  });

  it("works inside createExperiment through the variant helper", async () => {
    const dataset = createDataset([
      {
        id: "case-1",
        input: "Explain Ignition Agent Trainer.",
        expected: { contains: ["evaluation", "agents"] },
      },
    ]);
    const runnable: LangChainRunnableLike = {
      async invoke(input) {
        return `${input} uses evaluation to compare agents.`;
      },
    };

    const result = await createExperiment({
      name: "langchain-adapter-test",
      dataset,
      variants: [
        langChainAdapter({
          id: "langchain-fake",
          name: "LangChain Fake",
          runnable,
        }),
      ],
      rewards: [containsAll()],
    }).run();

    expect(result.failedCases).toHaveLength(0);
    expect(result.leaderboard[0]?.name).toBe("LangChain Fake");
    expect(result.leaderboard[0]?.score).toBe(1);
  });
});
