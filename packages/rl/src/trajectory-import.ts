import { createHash, createHmac } from "node:crypto";
import type { JsonRecord } from "@ignitionai/agent-trainer-core";

export type AllowedObservationFields = Readonly<
  Record<string, "number" | "boolean" | readonly string[]>
>;
export interface TrajectoryImportOptions {
  pseudonymSalt: string;
  actionNames: readonly string[];
  observationFields: AllowedObservationFields;
  argumentFields: AllowedObservationFields;
}

export interface ImportedTransition {
  state: JsonRecord;
  action: { name: string; input: JsonRecord };
  observation: JsonRecord;
  reward: number;
  done: boolean;
  costUsd?: number;
  latencyMs?: number;
}

export interface ImportedEpisode {
  runId: string;
  episodeId: string;
  taskId: string;
  workflowSnapshotId: string;
  policyId: string;
  collectedAt: string;
  done: boolean;
  truncated: boolean;
  qualityScore: number;
  transitions: ImportedTransition[];
}

export interface TrajectoryImportResult {
  schemaVersion: "ignition.imported-trajectories.v1";
  evidenceMode: "real" | "synthetic";
  sourceFingerprint: string;
  environmentId: string;
  authorizationReference: string;
  rewardConfigId: string;
  exportedAt: string;
  episodes: ImportedEpisode[];
  rejected: Array<{ index: number; reason: string }>;
}

/** Pseudonymous identifiers require a private, stable salt; no raw id mapping is returned. */
export function pseudonymizeTrajectoryId(value: string, salt: string): string {
  if (salt.length < 16) throw new Error("Pseudonym salt must contain at least 16 characters.");
  return createHmac("sha256", salt).update(value).digest("hex");
}

export function importIgnitionRagTrajectories(
  input: unknown,
  options: TrajectoryImportOptions,
): TrajectoryImportResult {
  const root = record(input);
  if (root.schemaVersion !== "ignitionrag.trajectory-export.v1" || root.source !== "ignitionrag")
    throw new Error("Unsupported IgnitionRAG trajectory export.");
  if (root.evidenceMode !== "real" && root.evidenceMode !== "synthetic")
    throw new Error("Export must declare real or synthetic evidence.");
  if (!Array.isArray(root.episodes)) throw new Error("Export episodes must be an array.");
  const hashId = (value: unknown) =>
    pseudonymizeTrajectoryId(requiredString(value), options.pseudonymSalt);
  const result: TrajectoryImportResult = {
    schemaVersion: "ignition.imported-trajectories.v1",
    evidenceMode: root.evidenceMode,
    sourceFingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    environmentId: hashId(root.environmentId),
    authorizationReference: hashId(root.authorizationReference),
    rewardConfigId: hashId(root.rewardConfigId),
    exportedAt: timestamp(root.exportedAt),
    episodes: [],
    rejected: [],
  };
  const ids = new Set<string>();
  for (const [index, raw] of root.episodes.entries()) {
    try {
      const episode = readEpisode(raw, options, hashId);
      const key = `${episode.runId}:${episode.episodeId}`;
      if (ids.has(key)) throw new Error("Duplicate run/episode identity.");
      ids.add(key);
      result.episodes.push(episode);
    } catch (error) {
      result.rejected.push({
        index,
        reason: error instanceof Error ? error.message : "Invalid episode.",
      });
    }
  }
  return result;
}

function readEpisode(
  input: unknown,
  options: TrajectoryImportOptions,
  hashId: (value: unknown) => string,
): ImportedEpisode {
  const row = record(input);
  if (
    typeof row.done !== "boolean" ||
    typeof row.truncated !== "boolean" ||
    row.done === row.truncated
  )
    throw new Error("Episode must be terminal or truncated, exclusively.");
  if (!Array.isArray(row.steps) || row.steps.length === 0)
    throw new Error("Episode transitions are required.");
  const transitions = row.steps.map((value) => readTransition(value, options));
  if (
    transitions.some(
      (step, index) =>
        index > 0 &&
        JSON.stringify(step.state) !== JSON.stringify(transitions[index - 1]?.observation),
    )
  )
    throw new Error("Observed transition states are not contiguous after redaction.");
  if (
    transitions.some((step, index) => step.done && index !== transitions.length - 1) ||
    transitions.at(-1)?.done !== row.done
  )
    throw new Error("Transition terminal flags disagree with episode status.");
  const qualityScore = finite(row.qualityScore);
  if (qualityScore < 0 || qualityScore > 1) throw new Error("Quality score must be in [0, 1].");
  return {
    runId: hashId(row.runId),
    episodeId: hashId(row.episodeId),
    taskId: hashId(row.taskId),
    workflowSnapshotId: hashId(row.workflowSnapshotId),
    policyId: hashId(row.policyId),
    collectedAt: timestamp(row.collectedAt),
    done: row.done,
    truncated: row.truncated,
    qualityScore,
    transitions,
  };
}

function readTransition(input: unknown, options: TrajectoryImportOptions): ImportedTransition {
  const step = record(input);
  const action = record(step.action);
  const name = requiredString(action.name);
  if (!options.actionNames.includes(name))
    throw new Error("Action is not in the authorized registry.");
  if (typeof step.done !== "boolean") throw new Error("Transition done flag is required.");
  const usage = step.usage === undefined ? {} : record(step.usage);
  const costUsd = optionalMetric(usage.costUsd);
  const latencyMs = optionalMetric(usage.latencyMs);
  return {
    state: redact(record(step.state), options.observationFields),
    action: {
      name,
      input: redact(action.input === undefined ? {} : record(action.input), options.argumentFields),
    },
    observation: redact(record(step.observation), options.observationFields),
    reward: finite(step.reward),
    done: step.done,
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(latencyMs !== undefined ? { latencyMs } : {}),
  };
}

function redact(input: Record<string, unknown>, fields: AllowedObservationFields): JsonRecord {
  const output: JsonRecord = {};
  for (const [name, kind] of Object.entries(fields)) {
    if (name === "__proto__" || name === "constructor" || name === "prototype")
      throw new Error("Unsafe observation field name.");
    const value = input[name];
    if (kind === "number" && typeof value === "number" && !Number.isFinite(value))
      throw new Error("Allowed numeric observation must be finite.");
    if (kind === "number" && typeof value === "number" && Number.isFinite(value))
      output[name] = value;
    else if (kind === "boolean" && typeof value === "boolean") output[name] = value;
    else if (Array.isArray(kind) && typeof value === "string" && kind.includes(value))
      output[name] = value;
  }
  return output;
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected an object.");
  return input as Record<string, unknown>;
}

function requiredString(input: unknown): string {
  if (typeof input !== "string" || !input.trim() || input.length > 500)
    throw new Error("Required identifier is missing or too long.");
  return input;
}

function finite(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input))
    throw new Error("Required numeric observation must be finite.");
  return input;
}

function optionalMetric(input: unknown): number | undefined {
  if (input === undefined) return undefined;
  const value = finite(input);
  if (value < 0) throw new Error("Measured usage must be nonnegative.");
  return value;
}

function timestamp(input: unknown): string {
  const value = requiredString(input);
  if (!Number.isFinite(Date.parse(value))) throw new Error("Invalid collection/export timestamp.");
  return new Date(value).toISOString();
}
