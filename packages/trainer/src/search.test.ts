import { createDataset } from "@ignitionai/agent-trainer-core";
import { containsAll } from "@ignitionai/agent-trainer-evals";
import { describe, expect, it } from "vitest";
import {
  createGridSearchVariants,
  generateParameterCombinations,
  runGridSearch,
  type SearchCombination,
  selectBestCombination,
} from "./search";

const dataset = createDataset([
  {
    id: "case-1",
    input: "Answer with the retrieved context.",
    expected: { contains: ["accurate", "verified"] },
  },
]);

describe("simple search optimization", () => {
  it("generates deterministic Cartesian products in sorted parameter order", () => {
    const combinations = generateParameterCombinations({
      topK: [3, 5],
      rerank: [true, false],
    });

    expect(combinations.map((combination) => combination.parameters)).toEqual([
      { rerank: true, topK: 3 },
      { rerank: true, topK: 5 },
      { rerank: false, topK: 3 },
      { rerank: false, topK: 5 },
    ]);
    expect(combinations.map((combination) => combination.id)).toEqual([
      "rerank-true__topK-3",
      "rerank-true__topK-5",
      "rerank-false__topK-3",
      "rerank-false__topK-5",
    ]);
  });

  it("handles empty and single-value grids", () => {
    expect(generateParameterCombinations({})).toEqual([
      {
        id: "default",
        name: "default",
        parameters: {},
      },
    ]);
    expect(generateParameterCombinations({ topK: [] })).toEqual([]);
    expect(generateParameterCombinations({ topK: [3] })).toEqual([
      {
        id: "topK-3",
        name: "topK=3",
        parameters: { topK: 3 },
      },
    ]);
  });

  it("creates variants that keep combination IDs and metadata", () => {
    const combinations = generateParameterCombinations({ verify: [true] });
    const variants = createGridSearchVariants(combinations, (combination) => ({
      id: "ignored",
      name: `Candidate ${combination.id}`,
      run() {
        return "accurate verified";
      },
    }));

    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({
      id: "verify-true",
      name: "Candidate verify-true",
      config: {
        gridSearch: {
          id: "verify-true",
          parameters: { verify: true },
        },
      },
    });
  });

  it("runs a grid search and selects the best combination", async () => {
    const result = await runGridSearch({
      name: "grid-search-test",
      dataset,
      grid: {
        topK: [3, 5],
        verify: [false, true],
      },
      rewards: [containsAll()],
      objective: "quality-first",
      createVariant(combination) {
        return {
          name: combination.name,
          run() {
            const { topK, verify } = combination.parameters;
            return topK === 5 && verify === true
              ? "accurate verified"
              : topK === 5
                ? "accurate"
                : "draft";
          },
        };
      },
    });

    expect(result.combinations.map((combination) => combination.id)).toEqual([
      "topK-3__verify-false",
      "topK-3__verify-true",
      "topK-5__verify-false",
      "topK-5__verify-true",
    ]);
    expect(result.bestCombination?.parameters).toEqual({ topK: 5, verify: true });
    expect(result.best?.variantId).toBe("topK-5__verify-true");
  });

  it("selects the best combination from an existing report", async () => {
    const combinations = generateParameterCombinations({ verify: [false, true] });
    const result = await runGridSearch({
      name: "grid-search-select-test",
      dataset,
      grid: { verify: [false, true] },
      rewards: [containsAll()],
      objective: "quality-first",
      createVariant: verifiedOutput,
    });

    const selected = selectBestCombination(result.report, combinations, "quality-first");

    expect(selected.ranking.map((row) => row.variantId)).toEqual(["verify-true", "verify-false"]);
    expect(selected.bestCombination?.id).toBe("verify-true");
  });

  it("returns an empty result when one grid axis has no values", async () => {
    const result = await runGridSearch({
      name: "empty-grid-search-test",
      dataset,
      grid: { topK: [] },
      rewards: [containsAll()],
      createVariant: verifiedOutput,
    });

    expect(result.combinations).toEqual([]);
    expect(result.report.leaderboard).toEqual([]);
    expect(result.ranking).toEqual([]);
    expect(result.best).toBeNull();
    expect(result.bestCombination).toBeNull();
  });
});

function verifiedOutput(combination: SearchCombination) {
  return {
    name: combination.name,
    run() {
      return combination.parameters.verify === true ? "accurate verified" : "accurate";
    },
  };
}
