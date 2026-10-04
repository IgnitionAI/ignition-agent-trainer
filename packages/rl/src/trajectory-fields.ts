import type { JsonRecord } from "@ignitionai/agent-trainer-core";
import type { AllowedObservationFields } from "./trajectory-import";

export function redactTrajectoryFields(
  input: Record<string, unknown>,
  fields: AllowedObservationFields,
): JsonRecord {
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
