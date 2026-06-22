import { type DatasetItem, normalizeRunResult, toAgentInput } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import {
  builtInStrategyPresets,
  createStrategyRegistry,
  defineStrategyPreset,
  getStrategyPreset,
  listStrategyPresets,
} from "./index";

const item: DatasetItem = {
  id: "case-1",
  input: "Explain the RAG answer.",
  expected: {
    contains: ["retrieval", "grounded", "citation"],
    citations: ["docs.md#rag", "docs.md#grounding"],
  },
};

describe("strategy preset registry", () => {
  it("lists built-in strategy presets in deterministic order", () => {
    expect(listStrategyPresets().map((preset) => preset.id)).toEqual([
      "direct-answer",
      "rag-basic",
      "rag-rerank",
      "rag-with-verification",
    ]);
  });

  it("looks up built-in strategy presets by id", () => {
    expect(getStrategyPreset("rag-basic")?.name).toBe("Basic RAG");
    expect(getStrategyPreset("missing")).toBeNull();
  });

  it("creates reusable mocked experiment variants", async () => {
    const preset = getStrategyPreset("rag-with-verification");
    if (preset === null) throw new Error("Expected built-in strategy preset.");

    const variant = preset.createVariant({ metadata: { source: "unit-test" } });
    const rawRun = await variant.adapter?.run(toAgentInput(item), {
      caseId: item.id,
      variantId: variant.id ?? preset.id,
    });
    if (rawRun === undefined) throw new Error("Expected variant adapter run result.");
    const run = normalizeRunResult(rawRun);

    expect(variant).toMatchObject({
      id: "rag-with-verification",
      name: "rag-with-verification",
      config: {
        strategyPresetId: "rag-with-verification",
        tools: ["retrieve_context", "verify_grounding"],
      },
    });
    expect(String(run?.output)).toContain("[docs.md#rag]");
    expect(String(run?.output)).toContain("Verified against retrieved context.");
    expect(
      run.trace.steps.filter((step) => step.type === "tool_call").map((step) => step.name),
    ).toEqual(["retrieve_context", "verify_grounding"]);
    expect(run.usage?.latencyMs).toBe(1250);
    expect(run.metadata).toMatchObject({
      strategyPresetId: "rag-with-verification",
      source: "unit-test",
    });
  });

  it("supports custom registries and duplicate id validation", () => {
    const custom = defineStrategyPreset({
      id: "custom-rag",
      name: "Custom RAG",
      tools: ["retrieve_context"],
    });
    const registry = createStrategyRegistry([custom]);

    expect(getStrategyPreset("custom-rag", registry)).toBe(custom);
    expect(listStrategyPresets(registry)).toEqual([custom]);
    expect(() => createStrategyRegistry([custom, custom])).toThrow(
      "Duplicate strategy preset id: custom-rag",
    );
  });

  it("validates preset definitions", () => {
    expect(() => defineStrategyPreset({ id: "", name: "Missing id" })).toThrow(
      "Strategy preset id is required.",
    );
    expect(() => defineStrategyPreset({ id: "bad-tool", name: "Bad tool", tools: [""] })).toThrow(
      "Strategy preset bad-tool has an empty tool name.",
    );
    expect(
      builtInStrategyPresets.every((preset) => preset.createVariant().adapter !== undefined),
    ).toBe(true);
  });
});
