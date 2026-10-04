import { createHash } from "node:crypto";
import type {
  EnvironmentAction,
  EnvironmentState,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import type { QTableEntry } from "./q-learning";

export interface PolicyArtifactBody {
  schemaVersion: 1;
  algorithm: "tabular-q" | "linear-q";
  encoder: { id: string; version: number; parameters: Record<string, unknown> };
  actions: string[];
  hyperparameters: { alpha: number; gamma: number; epsilon: number };
  seeds: number[];
  provenance: { reference: string; mode: "real" | "synthetic"; fingerprint: string };
  rewardConfigId: string;
  evaluationReportId: string;
  parameters: QTableEntry[] | Record<string, number[]>;
}
export interface PolicyArtifact extends PolicyArtifactBody {
  id: string;
}
export interface PolicyRuntime {
  encoder: PolicyArtifactBody["encoder"];
  actions: readonly string[];
  encodeState(state: EnvironmentState): string | number[];
  bindAction?(state: EnvironmentState, action: EnvironmentAction): EnvironmentAction;
}

/** Stable checksum, not an authenticity signature. Reject non-JSON values rather than dropping them. */
export function canonicalPolicyJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonicalPolicyJson).join(",")}]`;
  if (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalPolicyJson(item)}`)
      .join(",")}}`;
  }
  throw new Error("Artifact must contain only finite JSON values.");
}
function digest(body: unknown): string {
  return createHash("sha256").update(canonicalPolicyJson(body)).digest("hex");
}
function required(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort()))
    throw new Error("Unknown or missing artifact fields.");
}

export function createPolicyArtifact(body: PolicyArtifactBody): PolicyArtifact {
  const artifact = { ...structuredClone(body), id: digest(body) };
  return parsePolicyArtifact(artifact);
}

export function parsePolicyArtifact(input: unknown): PolicyArtifact {
  if (!record(input)) throw new Error("Policy artifact must be an object.");
  exactKeys(input, [
    "id",
    "schemaVersion",
    "algorithm",
    "encoder",
    "actions",
    "hyperparameters",
    "seeds",
    "provenance",
    "rewardConfigId",
    "evaluationReportId",
    "parameters",
  ]);
  if (input.schemaVersion !== 1 || !["tabular-q", "linear-q"].includes(String(input.algorithm)))
    throw new Error("Unsupported policy schema or algorithm.");
  if (
    !record(input.encoder) ||
    !required(input.encoder.id) ||
    !Number.isSafeInteger(input.encoder.version) ||
    Number(input.encoder.version) <= 0 ||
    !record(input.encoder.parameters)
  )
    throw new Error("Invalid encoder descriptor.");
  exactKeys(input.encoder, ["id", "version", "parameters"]);
  if (
    !Array.isArray(input.actions) ||
    input.actions.length === 0 ||
    !input.actions.every(required) ||
    new Set(input.actions).size !== input.actions.length
  )
    throw new Error("Invalid action registry.");
  if (!record(input.hyperparameters)) throw new Error("Missing hyperparameters.");
  exactKeys(input.hyperparameters, ["alpha", "gamma", "epsilon"]);
  for (const name of ["alpha", "gamma", "epsilon"]) {
    const value = input.hyperparameters[name];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1 ||
      (name === "alpha" && value === 0)
    )
      throw new Error("Invalid hyperparameters.");
  }
  if (
    !Array.isArray(input.seeds) ||
    input.seeds.length === 0 ||
    !input.seeds.every(Number.isSafeInteger)
  )
    throw new Error("Invalid seeds.");
  if (
    !record(input.provenance) ||
    !required(input.provenance.reference) ||
    !required(input.provenance.fingerprint) ||
    !["real", "synthetic"].includes(String(input.provenance.mode))
  )
    throw new Error("Invalid provenance.");
  exactKeys(input.provenance, ["reference", "fingerprint", "mode"]);
  if (!required(input.rewardConfigId) || !required(input.evaluationReportId))
    throw new Error("Missing reward or evaluation reference.");
  validateParameters(input.parameters, input.algorithm, input.actions as string[]);
  const { id, ...body } = input;
  if (!required(id) || id !== digest(body)) throw new Error("Policy checksum mismatch.");
  return structuredClone(input) as unknown as PolicyArtifact;
}

function validateParameters(parameters: unknown, algorithm: unknown, actions: string[]): void {
  if (algorithm === "tabular-q") {
    if (!Array.isArray(parameters)) throw new Error("Invalid Q table.");
    const states = new Set<string>();
    for (const entry of parameters) {
      if (
        !record(entry) ||
        !required(entry.state) ||
        states.has(entry.state) ||
        !record(entry.values)
      )
        throw new Error("Invalid Q table state.");
      exactKeys(entry, ["state", "values"]);
      states.add(entry.state);
      for (const [action, value] of Object.entries(entry.values))
        if (!actions.includes(action) || typeof value !== "number" || !Number.isFinite(value))
          throw new Error("Invalid Q table value.");
    }
    return;
  }
  if (!record(parameters)) throw new Error("Invalid linear weights.");
  exactKeys(parameters, actions);
  const vectors = Object.values(parameters);
  const dimension = Array.isArray(vectors[0]) ? vectors[0].length : 0;
  if (
    dimension === 0 ||
    vectors.some(
      (vector) =>
        !Array.isArray(vector) ||
        vector.length !== dimension ||
        vector.some((value) => typeof value !== "number" || !Number.isFinite(value)),
    )
  )
    throw new Error("Invalid linear dimensions or weights.");
}

export function loadPolicyArtifact(input: unknown, runtime: PolicyRuntime): Policy {
  const artifact = parsePolicyArtifact(input);
  if (
    canonicalPolicyJson(artifact.encoder) !== canonicalPolicyJson(runtime.encoder) ||
    canonicalPolicyJson([...artifact.actions].sort()) !==
      canonicalPolicyJson([...runtime.actions].sort())
  )
    throw new Error("Incompatible encoder or action registry.");
  const table =
    artifact.algorithm === "tabular-q"
      ? new Map((artifact.parameters as QTableEntry[]).map((entry) => [entry.state, entry.values]))
      : null;
  const weights = artifact.parameters as Record<string, number[]>;
  return {
    async chooseAction(state, actions) {
      if (
        actions.length === 0 ||
        new Set(actions.map((action) => action.name)).size !== actions.length ||
        actions.some((action) => !artifact.actions.includes(action.name))
      )
        throw new Error("Invalid available action registry.");
      const encoded = runtime.encodeState(state);
      const score = (action: EnvironmentAction): number => {
        if (table) {
          if (!required(encoded)) throw new Error("Invalid encoded state.");
          const values = table.get(encoded);
          return values && Object.hasOwn(values, action.name) ? (values[action.name] ?? 0) : 0;
        }
        const vector = weights[action.name];
        if (
          !vector ||
          !Array.isArray(encoded) ||
          encoded.length !== vector.length ||
          Array.from(encoded).some((value) => !Number.isFinite(value))
        )
          throw new Error("Incompatible feature vector.");
        const value = vector.reduce(
          (sum, weight, index) => sum + weight * (encoded[index] ?? 0),
          0,
        );
        if (!Number.isFinite(value)) throw new Error("Non-finite policy value.");
        return value;
      };
      const ranked = actions
        .map((action) => ({ action, value: score(action) }))
        .sort((a, b) => b.value - a.value || a.action.name.localeCompare(b.action.name));
      const selected = ranked[0]?.action;
      if (!selected) throw new Error("No available action.");
      const bound = runtime.bindAction
        ? runtime.bindAction(state, { ...selected })
        : { ...selected };
      if (bound.name !== selected.name) throw new Error("Action binder changed selected action.");
      return bound;
    },
  };
}
