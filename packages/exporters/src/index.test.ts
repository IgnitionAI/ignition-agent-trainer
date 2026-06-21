import type { ExperimentResult } from "@ignitionai/core";
import { describe, expect, it } from "vitest";
import { exportExperimentResult, toJsonReport, toMarkdownReport } from "./index";

const result: ExperimentResult = {
  name: "context-strategy-report",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:01:00.000Z",
  metadata: { owner: "evals" },
  leaderboard: [
    {
      variantId: "rag-verify",
      name: "RAG + Verify",
      score: 0.91,
      totalCases: 2,
      failedCases: 0,
      averageLatencyMs: 900,
      totalCostUsd: 0.0123,
      rewardAverages: { answer_quality: 0.95, cost: 0.7 },
    },
    {
      variantId: "simple-rag",
      name: "Simple RAG",
      score: 0.75,
      totalCases: 2,
      failedCases: 1,
      averageLatencyMs: 300,
      totalCostUsd: 0.004,
      rewardAverages: { answer_quality: 0.7, cost: 0.95 },
    },
  ],
  cases: [
    {
      caseId: "case-1",
      variantId: "rag-verify",
      variantName: "RAG + Verify",
      output: "answer",
      trace: { steps: [] },
      rewards: [{ name: "answer_quality", score: 1, weight: 1 }],
      score: 1,
      usage: { latencyMs: 800, costUsd: 0.006 },
    },
    {
      caseId: "case-2",
      variantId: "rag-verify",
      variantName: "RAG + Verify",
      output: "answer",
      trace: { steps: [] },
      rewards: [{ name: "answer_quality", score: 0.9, weight: 1 }],
      score: 0.9,
      usage: { latencyMs: 1000, costUsd: 0.0063 },
    },
    {
      caseId: "case-1",
      variantId: "simple-rag",
      variantName: "Simple RAG",
      output: "answer",
      trace: { steps: [] },
      rewards: [{ name: "answer_quality", score: 0.7, weight: 1 }],
      score: 0.7,
      usage: { latencyMs: 300, costUsd: 0.002 },
    },
    {
      caseId: "case-2",
      variantId: "simple-rag",
      variantName: "Simple RAG",
      output: "",
      trace: { steps: [] },
      rewards: [{ name: "answer_quality", score: 0, weight: 1 }],
      score: 0,
      usage: { latencyMs: 300, costUsd: 0.002 },
      error: { message: "failed" },
    },
  ],
  failedCases: [
    {
      caseId: "case-2",
      variantId: "simple-rag",
      variantName: "Simple RAG",
      output: "",
      trace: { steps: [] },
      rewards: [{ name: "answer_quality", score: 0, weight: 1 }],
      score: 0,
      usage: { latencyMs: 300, costUsd: 0.002 },
      error: { message: "failed" },
    },
  ],
};

describe("exportExperimentResult", () => {
  it("exports a stable report shape with dataset, variants, leaderboard and reward summaries", () => {
    const report = exportExperimentResult(result, {
      generatedAt: "2026-01-01T00:02:00.000Z",
      metadata: { source: "unit-test" },
    });

    expect(report).toMatchObject({
      schemaVersion: "ignition.experiment-report.v1",
      generatedAt: "2026-01-01T00:02:00.000Z",
      experiment: {
        name: "context-strategy-report",
        metadata: { owner: "evals" },
      },
      dataset: {
        size: 2,
        caseResultCount: 4,
        failedCaseCount: 1,
      },
      metadata: { source: "unit-test" },
    });
    expect(report.variants).toHaveLength(2);
    expect(report.leaderboard[0]).toMatchObject({
      rank: 1,
      variantId: "rag-verify",
      name: "RAG + Verify",
      score: 0.91,
    });
    expect(report.rewardSummaries.map((summary) => summary.name)).toEqual([
      "answer_quality",
      "cost",
    ]);
  });

  it("includes a recommendation when provided", () => {
    const report = exportExperimentResult(result, {
      generatedAt: "2026-01-01T00:02:00.000Z",
      recommendation: {
        winner: "RAG + Verify",
        score: 0.91,
        summary: "Use verification for better answer quality.",
        confidence: "medium",
      },
    });

    expect(report.recommendation).toEqual({
      winner: "RAG + Verify",
      score: 0.91,
      summary: "Use verification for better answer quality.",
      confidence: "medium",
    });
  });

  it("handles empty leaderboard and missing optional fields deterministically", () => {
    const emptyResult: ExperimentResult = {
      name: "empty-report",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      leaderboard: [],
      cases: [],
      failedCases: [],
    };

    const report = exportExperimentResult(emptyResult, {
      generatedAt: new Date("2026-01-01T00:02:00.000Z"),
    });

    expect(report.dataset).toEqual({ size: 0, caseResultCount: 0, failedCaseCount: 0 });
    expect(report.variants).toEqual([]);
    expect(report.leaderboard).toEqual([]);
    expect(report.rewardSummaries).toEqual([]);
  });
});

describe("report serializers", () => {
  it("serializes the stable report shape as pretty JSON", () => {
    const json = toJsonReport(result, { generatedAt: "2026-01-01T00:02:00.000Z" });
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe("ignition.experiment-report.v1");
    expect(parsed.dataset.size).toBe(2);
    expect(parsed.leaderboard[0].name).toBe("RAG + Verify");
  });

  it("serializes a Markdown summary with leaderboard and recommendation", () => {
    const markdown = toMarkdownReport(result, {
      generatedAt: "2026-01-01T00:02:00.000Z",
      recommendation: {
        winner: "RAG + Verify",
        score: 0.91,
        reasons: ["Best answer quality."],
        tradeoffs: ["Higher latency."],
      },
    });

    expect(markdown).toContain("# Experiment report: context-strategy-report");
    expect(markdown).toContain("| 1 | RAG + Verify | 0.910 | 2 | 0 | 900ms | $0.0123 |");
    expect(markdown).toContain("## Reward summaries");
    expect(markdown).toContain("## Recommendation");
    expect(markdown).toContain("- Best answer quality.");
  });
});
