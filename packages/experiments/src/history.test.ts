import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExperimentResult, VariantSummary } from "@ignitionai/agent-trainer-core";
import { describe, expect, it } from "vitest";
import {
  appendExperimentHistory,
  createExperimentHistoryEntry,
  EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION,
  getLatestExperimentResult,
  readExperimentHistory,
  writeExperimentHistory,
} from "./history";

describe("experiment history", () => {
  it("appends and reads JSONL experiment history entries", async () => {
    await withHistoryFile(async (filePath) => {
      await appendExperimentHistory(filePath, result("alpha", 0.8), {
        recordedAt: "2026-01-01T00:00:00.000Z",
        metadata: { source: "baseline" },
      });
      await appendExperimentHistory(filePath, result("alpha", 0.9), {
        recordedAt: "2026-01-02T00:00:00.000Z",
      });

      const entries = await readExperimentHistory(filePath);

      expect(entries.map((entry) => entry.id)).toEqual([
        "alpha-2026-01-01T00-00-00-000Z",
        "alpha-2026-01-02T00-00-00-000Z",
      ]);
      expect(entries[0]?.metadata).toEqual({ source: "baseline" });
      expect(entries.map((entry) => entry.result.leaderboard[0]?.score)).toEqual([0.8, 0.9]);
    });
  });

  it("writes history entries and preserves insertion order", async () => {
    await withHistoryFile(async (filePath) => {
      const newer = createExperimentHistoryEntry(result("alpha", 0.9), {
        recordedAt: "2026-01-02T00:00:00.000Z",
      });
      const older = createExperimentHistoryEntry(result("alpha", 0.8), {
        recordedAt: "2026-01-01T00:00:00.000Z",
      });

      await writeExperimentHistory(filePath, [newer, older]);

      const entries = await readExperimentHistory(filePath);
      expect(entries.map((entry) => entry.recordedAt)).toEqual([
        "2026-01-02T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      ]);
    });
  });

  it("returns an empty array for a missing history file", async () => {
    await withHistoryFile(async (filePath) => {
      await expect(readExperimentHistory(filePath)).resolves.toEqual([]);
    });
  });

  it("reports invalid JSONL with the line number", async () => {
    await withHistoryFile(async (filePath) => {
      await writeFile(filePath, '{"ok":true}\nnot-json\n', "utf8");

      await expect(readExperimentHistory(filePath)).rejects.toThrow(
        "Invalid experiment history entry at line 1.",
      );

      await writeFile(filePath, "not-json\n", "utf8");
      await expect(readExperimentHistory(filePath)).rejects.toThrow(
        "Invalid experiment history JSONL at line 1:",
      );
    });
  });

  it("rejects invalid history entries", async () => {
    await withHistoryFile(async (filePath) => {
      await writeFile(
        filePath,
        `${JSON.stringify({ schemaVersion: EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION })}\n`,
        "utf8",
      );

      await expect(readExperimentHistory(filePath)).rejects.toThrow(
        "Invalid experiment history entry at line 1.",
      );
    });
  });

  it("gets the latest experiment result by insertion order and optional name", async () => {
    const entries = [
      createExperimentHistoryEntry(result("alpha", 0.7), {
        recordedAt: "2026-01-01T00:00:00.000Z",
      }),
      createExperimentHistoryEntry(result("beta", 0.95), {
        recordedAt: "2026-01-02T00:00:00.000Z",
      }),
      createExperimentHistoryEntry(result("alpha", 0.85), {
        recordedAt: "2026-01-03T00:00:00.000Z",
      }),
    ];

    expect(getLatestExperimentResult(entries)?.name).toBe("alpha");
    expect(getLatestExperimentResult(entries, "alpha")?.leaderboard[0]?.score).toBe(0.85);
    expect(getLatestExperimentResult(entries, "missing")).toBeNull();
  });

  it("writes an empty history file deterministically", async () => {
    await withHistoryFile(async (filePath) => {
      await writeExperimentHistory(filePath, []);

      await expect(readFile(filePath, "utf8")).resolves.toBe("");
      await expect(readExperimentHistory(filePath)).resolves.toEqual([]);
    });
  });
});

async function withHistoryFile(run: (filePath: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "ignition-history-"));
  try {
    await run(join(directory, "history.jsonl"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function result(name: string, score: number): ExperimentResult {
  return {
    name,
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    leaderboard: [variant(name, score)],
    cases: [],
    failedCases: [],
  };
}

function variant(id: string, score: number): VariantSummary {
  return {
    variantId: id,
    name: id,
    score,
    totalCases: 1,
    failedCases: 0,
    rewardAverages: { quality: score },
  };
}
