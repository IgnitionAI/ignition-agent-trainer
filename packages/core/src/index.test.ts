import { describe, expect, it } from "vitest";
import {
  assertAgentVariant,
  assertDatasetItem,
  assertJsonValue,
  assertMetricResult,
  assertNormalizedScore,
  assertRunResult,
  assertTrace,
  assertUsageMetrics,
  clampScore,
  createDataset,
  createMockAdapter,
  normalizeRunResult,
  toAgentInput,
  validateAgentVariant,
  validateDataset,
  validateRunResult,
  weightedAverage,
} from "./index";

describe("@ignitionai/agent-trainer-core", () => {
  describe("datasets", () => {
    it("creates a default named dataset from items and preserves item fields", () => {
      const dataset = createDataset([
        {
          id: "case-1",
          input: "Summarize the contract.",
          expected: { contains: ["termination"] },
          metadata: { source: "contract.pdf" },
        },
      ]);

      expect(dataset).toEqual({
        name: "dataset",
        items: [
          {
            id: "case-1",
            input: "Summarize the contract.",
            expected: { contains: ["termination"] },
            metadata: { source: "contract.pdf" },
          },
        ],
      });
    });

    it("accepts a named dataset object with metadata", () => {
      const dataset = createDataset({
        name: "rag-eval",
        description: "RAG evaluation set",
        metadata: { owner: "evals" },
        items: [{ id: "case-1", input: "Find the citation." }],
      });

      expect(dataset.name).toBe("rag-eval");
      expect(dataset.description).toBe("RAG evaluation set");
      expect(dataset.metadata).toEqual({ owner: "evals" });
    });

    it("rejects unsafe dataset definitions", () => {
      expect(() => createDataset({ name: " ", items: [] })).toThrow("Dataset name is required.");
      expect(() =>
        createDataset([
          { id: "case-1", input: "A" },
          { id: "case-1", input: "B" },
        ]),
      ).toThrow("Duplicate dataset item id: case-1");
      expect(() => assertDatasetItem({ id: " ", input: "A" })).toThrow(
        "Dataset item id is required.",
      );
      expect(() => assertDatasetItem({ id: "case-1", input: " " })).toThrow(
        "Dataset item case-1 input is required.",
      );
    });

    it("validates dataset shapes without throwing when requested", () => {
      const valid = validateDataset({
        name: "runtime-dataset",
        items: [{ id: "case-1", input: "Question?", expected: { json: { ok: true } } }],
      });

      expect(valid.ok).toBe(true);
      if (!valid.ok) return;
      expect(valid.value.items[0]?.id).toBe("case-1");

      const invalid = validateDataset({
        name: "runtime-dataset",
        items: [{ id: "case-1", input: "Question?", expected: { json: { bad: undefined } } }],
      });

      expect(invalid.ok).toBe(false);
      if (invalid.ok) return;
      expect(invalid.error.message).toContain(
        "Dataset item 0 expected json.bad must be JSON-compatible.",
      );
    });
  });

  describe("agent adapters", () => {
    it("converts dataset items into agent inputs without dropping expected output or metadata", () => {
      const input = toAgentInput({
        id: "case-1",
        input: "Answer with JSON.",
        expected: { json: { ok: true } },
        metadata: { priority: "high" },
      });

      expect(input).toEqual({
        id: "case-1",
        input: "Answer with JSON.",
        expected: { json: { ok: true } },
        metadata: { priority: "high" },
      });
    });

    it("normalizes raw adapter outputs into run results with an empty trace", () => {
      expect(normalizeRunResult("plain output")).toEqual({
        output: "plain output",
        trace: { steps: [] },
      });
    });

    it("normalizes structured adapter outputs while preserving trace, usage and metadata", () => {
      const result = normalizeRunResult({
        output: { answer: "A" },
        trace: {
          steps: [{ type: "decision", action: "answer", confidence: 0.9 }],
          metadata: { policy: "scripted" },
        },
        usage: { totalTokens: 12 },
        metadata: { model: "mock" },
      });

      expect(result).toEqual({
        output: { answer: "A" },
        trace: {
          steps: [{ type: "decision", action: "answer", confidence: 0.9 }],
          metadata: { policy: "scripted" },
        },
        usage: { totalTokens: 12 },
        metadata: { model: "mock" },
      });
    });

    it("runs static mock adapters with fallback trace and default usage", async () => {
      const adapter = createMockAdapter("answer", {
        name: "static-agent",
        trace: { steps: [{ type: "message", role: "assistant", content: "answer" }] },
        usage: { inputTokens: 5, totalTokens: 7 },
      });

      const result = await adapter.run({ id: "case-1", input: "Question?" }, {});

      expect(adapter.name).toBe("static-agent");
      expect(result).toEqual({
        output: "answer",
        trace: { steps: [{ type: "message", role: "assistant", content: "answer" }] },
        usage: { inputTokens: 5, totalTokens: 7 },
      });
    });

    it("runs functional mock adapters with caller input/context and preserves explicit traces", async () => {
      const adapter = createMockAdapter(
        (input, context) => ({
          output: `${context.variantId}:${input.input}`,
          trace: { steps: [{ type: "decision", action: "answer", reason: "scripted" }] },
          usage: { outputTokens: 3 },
        }),
        {
          trace: { steps: [{ type: "message", role: "system", content: "fallback" }] },
          usage: { inputTokens: 4, outputTokens: 1 },
        },
      );

      const result = await adapter.run(
        { id: "case-1", input: "Question?" },
        { variantId: "agent-v1" },
      );

      expect(result).toEqual({
        output: "agent-v1:Question?",
        trace: { steps: [{ type: "decision", action: "answer", reason: "scripted" }] },
        usage: { inputTokens: 4, outputTokens: 3 },
      });
    });

    it("validates variants and run results at runtime", () => {
      const adapter = createMockAdapter("answer");

      expect(() => assertAgentVariant({ name: "valid-agent", adapter })).not.toThrow();
      expect(validateAgentVariant({ name: "broken-agent" })).toMatchObject({
        ok: false,
        error: { message: "Agent variant requires an adapter or run function." },
      });

      const validRun = validateRunResult({
        output: "answer",
        trace: { steps: [{ type: "message", role: "assistant", content: "" }] },
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, latencyMs: 10, costUsd: 0 },
      });

      expect(validRun.ok).toBe(true);
      expect(() =>
        assertRunResult({
          output: "answer",
          trace: { steps: [{ type: "decision", action: "answer", confidence: 1.2 }] },
        }),
      ).toThrow("Trace step 0 confidence must be between 0 and 1.");
    });

    it("rejects unsafe trace and usage metrics", () => {
      expect(() => assertTrace({ steps: [{ type: "tool_call", name: "" }] })).toThrow(
        "Trace step 0 name is required.",
      );
      expect(() => assertUsageMetrics({ inputTokens: 1.5 })).toThrow(
        "Usage metrics inputTokens must be a non-negative integer.",
      );
      expect(() => createMockAdapter("answer", { usage: { latencyMs: -1 } })).toThrow(
        "Usage metrics latencyMs must be a non-negative finite number.",
      );
    });
  });

  describe("scores", () => {
    it("clamps invalid and out-of-range scores to the normalized reward range", () => {
      expect(clampScore(Number.NaN)).toBe(0);
      expect(clampScore(-0.25)).toBe(0);
      expect(clampScore(0.75)).toBe(0.75);
      expect(clampScore(1.5)).toBe(1);
    });

    it("computes a clamped weighted average and treats missing weights as one", () => {
      const score = weightedAverage([
        { name: "quality", score: 1, weight: 2 },
        { name: "latency", score: 0.25 },
        { name: "cost", score: 2, weight: 1 },
      ]);

      expect(score).toBe(0.8125);
    });

    it("returns zero when total score weight is zero", () => {
      expect(weightedAverage([{ name: "disabled", score: 1, weight: 0 }])).toBe(0);
    });

    it("asserts normalized score and metric result boundaries", () => {
      expect(() => assertNormalizedScore(1, "Reward score")).not.toThrow();
      expect(() => assertNormalizedScore(1.1, "Reward score")).toThrow(
        "Reward score must be between 0 and 1.",
      );
      expect(() => assertMetricResult({ name: "quality", score: 0.8, weight: 1 })).not.toThrow();
      expect(() => assertMetricResult({ name: "quality", score: Number.NaN })).toThrow(
        "Metric result score must be a finite number.",
      );
    });

    it("asserts JSON-compatible values for serialized fields", () => {
      expect(() => assertJsonValue({ ok: true, nested: [1, "two", null] })).not.toThrow();
      expect(() => assertJsonValue({ bad: Number.POSITIVE_INFINITY })).toThrow(
        "JSON value.bad number must be finite.",
      );
    });
  });
});
