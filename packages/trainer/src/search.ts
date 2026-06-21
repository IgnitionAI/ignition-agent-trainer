import type {
  AgentVariant,
  Dataset,
  ExperimentResult,
  Metadata,
  Primitive,
  RewardFunction,
} from "@ignitionai/core";
import { createExperiment, type ExperimentOptions } from "@ignitionai/experiments";
import { type OptimizationObjective, type RankedVariant, rankVariants } from "./optimization";

export type ParameterValue = Primitive;
export type ParameterMap = Record<string, ParameterValue>;
export type ParameterGrid = Record<string, readonly ParameterValue[]>;

export interface SearchCombination {
  id: string;
  name: string;
  parameters: ParameterMap;
}

export interface GridSearchConfig {
  name: string;
  dataset: Dataset;
  grid: ParameterGrid;
  rewards: RewardFunction[];
  createVariant(combination: SearchCombination): AgentVariant;
  objective?: OptimizationObjective;
  options?: ExperimentOptions;
  metadata?: Metadata;
}

export interface SelectedSearchCombination {
  ranking: RankedVariant[];
  best: RankedVariant | null;
  bestCombination: SearchCombination | null;
}

export interface GridSearchResult extends SelectedSearchCombination {
  combinations: SearchCombination[];
  report: ExperimentResult;
}

export function generateParameterCombinations(grid: ParameterGrid): SearchCombination[] {
  const keys = Object.keys(grid).sort((a, b) => a.localeCompare(b));

  if (keys.length === 0) {
    return [
      {
        id: "default",
        name: "default",
        parameters: {},
      },
    ];
  }

  if (keys.some((key) => grid[key]?.length === 0)) return [];

  const combinations: SearchCombination[] = [];

  function visit(index: number, parameters: ParameterMap): void {
    if (index === keys.length) {
      combinations.push(createSearchCombination(parameters));
      return;
    }

    const key = keys[index];
    if (key === undefined) return;

    for (const value of grid[key] ?? []) {
      visit(index + 1, { ...parameters, [key]: value });
    }
  }

  visit(0, {});
  return combinations;
}

export function createGridSearchVariants(
  combinations: SearchCombination[],
  createVariant: (combination: SearchCombination) => AgentVariant,
): AgentVariant[] {
  return combinations.map((combination) => {
    const variant = createVariant(combination);
    return {
      ...variant,
      id: combination.id,
      name: variant.name || combination.name,
      config: {
        ...variant.config,
        gridSearch: {
          id: combination.id,
          parameters: combination.parameters,
        },
      },
    };
  });
}

export function selectBestCombination(
  input: ExperimentResult,
  combinations: SearchCombination[],
  objective: OptimizationObjective = "balanced",
): SelectedSearchCombination {
  const ranking = rankVariants(input, objective);
  const best = ranking[0] ?? null;
  const bestCombination =
    best === null
      ? null
      : (combinations.find((combination) => combination.id === best.variantId) ?? null);

  return {
    ranking,
    best,
    bestCombination,
  };
}

export async function runGridSearch(config: GridSearchConfig): Promise<GridSearchResult> {
  const combinations = generateParameterCombinations(config.grid);

  if (combinations.length === 0) {
    const report = emptyExperimentResult(config.name, config.metadata);
    return {
      combinations,
      report,
      ranking: [],
      best: null,
      bestCombination: null,
    };
  }

  const report = await createExperiment({
    name: config.name,
    dataset: config.dataset,
    variants: createGridSearchVariants(combinations, config.createVariant),
    rewards: config.rewards,
    ...(config.options !== undefined ? { options: config.options } : {}),
    ...(config.metadata !== undefined ? { metadata: config.metadata } : {}),
  }).run();

  return {
    combinations,
    report,
    ...selectBestCombination(report, combinations, config.objective ?? "balanced"),
  };
}

function createSearchCombination(parameters: ParameterMap): SearchCombination {
  const entries = Object.entries(parameters);
  const id = entries
    .map(([key, value]) => `${slugSegment(key)}-${slugSegment(parameterValueToString(value))}`)
    .join("__");
  const name = entries.map(([key, value]) => `${key}=${parameterValueToString(value)}`).join(", ");

  return {
    id,
    name,
    parameters,
  };
}

function parameterValueToString(value: ParameterValue): string {
  return value === null ? "null" : String(value);
}

function slugSegment(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "value"
  );
}

function emptyExperimentResult(name: string, metadata?: Metadata): ExperimentResult {
  const now = new Date().toISOString();
  return {
    name,
    startedAt: now,
    endedAt: now,
    leaderboard: [],
    cases: [],
    failedCases: [],
    ...(metadata !== undefined ? { metadata } : {}),
  };
}
