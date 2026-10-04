import type { EnvironmentState } from "@ignitionai/agent-trainer-environment";

export interface ObservationFeatureSchema {
  id: string;
  version: number;
  numeric: readonly string[];
  categorical: Readonly<Record<string, readonly string[]>>;
}

export interface FeatureNormalization {
  name: string;
  mean: number;
  scale: number;
}

export interface FeatureEncoderDescriptor {
  schema: ObservationFeatureSchema;
  normalization: FeatureNormalization[];
  featureNames: string[];
}

export interface StateFeatureEncoder {
  descriptor: FeatureEncoderDescriptor;
  encode(state: EnvironmentState): number[];
}

/** Fits numeric statistics on calibration observations, never evaluation data. */
export function fitObservationFeatureEncoder(
  schema: ObservationFeatureSchema,
  trainingStates: readonly EnvironmentState[],
): StateFeatureEncoder {
  if (!schema.id.trim() || !Number.isSafeInteger(schema.version) || schema.version <= 0)
    throw new Error("Feature encoder id and positive version are required.");
  if (trainingStates.length === 0)
    throw new Error("Feature fitting requires training observations.");
  const keys = [...schema.numeric, ...Object.keys(schema.categorical)];
  if (keys.some((key) => !key.trim()) || new Set(keys).size !== keys.length)
    throw new Error("Feature fields must be nonempty and unique.");
  for (const values of Object.values(schema.categorical)) {
    if (values.some((value) => !value.trim()) || new Set(values).size !== values.length)
      throw new Error("Feature categories must be nonempty and unique.");
  }
  const definition = structuredClone(schema);
  const normalization = definition.numeric.map((name) => fitNumeric(name, trainingStates));
  const featureNames = [
    "bias",
    ...normalization.flatMap(({ name }) => [`numeric:${name}`, `missing:${name}`]),
    ...Object.entries(definition.categorical).flatMap(([name, values]) => [
      ...values.map((value) => `category:${name}:${value}`),
      `unknown:${name}`,
    ]),
  ];
  const descriptor = { schema: definition, normalization, featureNames };
  return {
    descriptor: structuredClone(descriptor),
    encode(state) {
      return [
        1,
        ...normalization.flatMap((stats) => encodeNumeric(state, stats)),
        ...Object.entries(definition.categorical).flatMap(([name, values]) => {
          const observed = state.observation[name];
          return [
            ...values.map((value) => (observed === value ? 1 : 0)),
            typeof observed === "string" && values.includes(observed) ? 0 : 1,
          ];
        }),
      ];
    },
  };
}

function fitNumeric(name: string, states: readonly EnvironmentState[]): FeatureNormalization {
  const values = states
    .map((state) => state.observation[name])
    .filter((value): value is number => typeof value === "number");
  if (values.some((value) => !Number.isFinite(value)))
    throw new Error(`Non-finite training feature: ${name}`);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const variance = values.length
    ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    : 0;
  const scale = Math.sqrt(variance) || 1;
  if (!Number.isFinite(mean) || !Number.isFinite(scale))
    throw new Error(`Feature statistics must be finite: ${name}`);
  return { name, mean, scale };
}

function encodeNumeric(state: EnvironmentState, stats: FeatureNormalization): number[] {
  const value = state.observation[stats.name];
  if (typeof value !== "number") return [0, 1];
  if (!Number.isFinite(value)) throw new Error(`Non-finite observed feature: ${stats.name}`);
  return [Math.max(-3, Math.min(3, (value - stats.mean) / stats.scale)), 0];
}
