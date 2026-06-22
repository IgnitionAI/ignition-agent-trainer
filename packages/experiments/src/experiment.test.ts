import { createDataset, createMockAdapter } from "@ignitionai/agent-trainer-core";
import { containsAll } from "@ignitionai/agent-trainer-evals";
import { describe, expect, it } from "vitest";
import { createExperiment } from "./experiment";

describe("createExperiment", () => {
  it("runs adapter variants and records failed cases without aborting", async () => {
    const dataset = createDataset([
      {
        id: "q1",
        input: "What is IgnitionRAG?",
        expected: { contains: ["RAG", "agents", "evaluation"] },
      },
    ]);

    const result = await createExperiment({
      name: "basic-agent-eval",
      dataset,
      variants: [
        {
          name: "agent-v1",
          adapter: createMockAdapter({
            output: "IgnitionRAG evaluates RAG agents.",
            trace: { steps: [] },
          }),
        },
        {
          name: "agent-v2",
          adapter: createMockAdapter(() => {
            throw new Error("provider unavailable");
          }),
        },
      ],
      rewards: [containsAll()],
      options: { concurrency: 2 },
    }).run();

    expect(result.cases).toHaveLength(2);
    expect(result.failedCases).toHaveLength(1);
    expect(result.leaderboard[0]?.name).toBe("agent-v1");
    expect(result.leaderboard[1]?.failedCases).toBe(1);
  });
});
