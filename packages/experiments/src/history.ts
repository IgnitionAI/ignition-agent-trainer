import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ExperimentResult, Metadata } from "@ignitionai/agent-trainer-core";

export const EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION = "ignition.experiment-history-entry.v1";

export interface ExperimentHistoryEntry {
  schemaVersion: typeof EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION;
  id: string;
  recordedAt: string;
  result: ExperimentResult;
  metadata?: Metadata;
}

export interface ExperimentHistoryEntryOptions {
  id?: string;
  recordedAt?: string | Date;
  metadata?: Metadata;
}

export function createExperimentHistoryEntry(
  result: ExperimentResult,
  options: ExperimentHistoryEntryOptions = {},
): ExperimentHistoryEntry {
  const recordedAt = normalizeTimestamp(options.recordedAt);
  return {
    schemaVersion: EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION,
    id: options.id ?? createEntryId(result, recordedAt),
    recordedAt,
    result,
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  };
}

export async function appendExperimentHistory(
  filePath: string,
  result: ExperimentResult,
  options: ExperimentHistoryEntryOptions = {},
): Promise<ExperimentHistoryEntry> {
  const entry = createExperimentHistoryEntry(result, options);
  await ensureParentDirectory(filePath);
  await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export async function writeExperimentHistory(
  filePath: string,
  entries: readonly ExperimentHistoryEntry[],
): Promise<void> {
  await ensureParentDirectory(filePath);
  const contents = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await writeFile(filePath, entries.length === 0 ? "" : `${contents}\n`, "utf8");
}

export async function readExperimentHistory(filePath: string): Promise<ExperimentHistoryEntry[]> {
  let contents: string;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }

  return contents
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => parseHistoryEntry(line, lineNumber));
}

export function getLatestExperimentHistoryEntry(
  entries: readonly ExperimentHistoryEntry[],
  experimentName?: string,
): ExperimentHistoryEntry | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry === undefined) continue;
    if (experimentName === undefined || entry.result.name === experimentName) return entry;
  }
  return null;
}

export function getLatestExperimentResult(
  entries: readonly ExperimentHistoryEntry[],
  experimentName?: string,
): ExperimentResult | null {
  return getLatestExperimentHistoryEntry(entries, experimentName)?.result ?? null;
}

async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

function parseHistoryEntry(line: string, lineNumber: number): ExperimentHistoryEntry {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (error) {
    throw new Error(
      `Invalid experiment history JSONL at line ${lineNumber}: ${errorMessage(error)}`,
    );
  }

  if (!isExperimentHistoryEntry(value)) {
    throw new Error(`Invalid experiment history entry at line ${lineNumber}.`);
  }

  return value;
}

function isExperimentHistoryEntry(value: unknown): value is ExperimentHistoryEntry {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== EXPERIMENT_HISTORY_ENTRY_SCHEMA_VERSION) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.recordedAt !== "string" || !value.recordedAt.trim()) return false;
  if (!isExperimentResult(value.result)) return false;
  return value.metadata === undefined || isRecord(value.metadata);
}

function isExperimentResult(value: unknown): value is ExperimentResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    Array.isArray(value.leaderboard) &&
    Array.isArray(value.cases) &&
    Array.isArray(value.failedCases)
  );
}

function normalizeTimestamp(value: string | Date | undefined): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date().toISOString();
}

function createEntryId(result: ExperimentResult, recordedAt: string): string {
  return `${slugSegment(result.name)}-${slugSegment(recordedAt)}`;
}

function slugSegment(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "value"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
