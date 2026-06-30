import { describe, expect, it } from "vitest";
import {
  assertDatasetItem,
  clampScore,
  createDataset,
  createMockAdapter,
  normalizeRunResult,
  toAgentInput,
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
  });
});
