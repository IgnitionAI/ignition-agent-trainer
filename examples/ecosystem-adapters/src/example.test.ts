import { describe, expect, it } from "vitest";
import { dataset, runEcosystemAdapterExperiment, variants } from "./example";

describe("ecosystem adapter example", () => {
  it("runs mocked ecosystem adapters through createExperiment with trace, usage and metadata", async () => {
    const result = await runEcosystemAdapterExperiment();

    expect(result.name).toBe("ecosystem-adapter-comparison");
    expect(result.failedCases).toEqual([]);
    expect(result.leaderboard.map((row) => row.variantId).sort()).toEqual(
      variants.map((variant) => variant.id).sort(),
    );
    expect(result.cases).toHaveLength(dataset.items.length * variants.length);

    for (const caseResult of result.cases) {
      expect(caseResult.score).toBeGreaterThan(0.8);
      expect(caseResult.trace.steps.length).toBeGreaterThan(0);
      expect(caseResult.usage?.latencyMs).toBeGreaterThan(0);
      expect(caseResult.usage?.costUsd).toBeGreaterThan(0);
      expect(caseResult.metadata?.framework).toBeDefined();
    }

    expect(result.cases.map((caseResult) => caseResult.metadata?.framework).sort()).toEqual([
      "langchain",
      "langchain",
      "langgraph",
      "langgraph",
      "mastra",
      "mastra",
      "vercel-ai",
      "vercel-ai",
    ]);
  });
});
