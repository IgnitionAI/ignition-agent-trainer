#!/usr/bin/env bun

import { pathToFileURL } from "node:url";
import type { ExperimentResult } from "@ignitionai/agent-trainer-core";
import {
  assertNoRegression,
  type RegressionGateComparison,
  RegressionGateError,
  type RegressionGateOptions,
} from "@ignitionai/agent-trainer-experiments";
import baselineFixture from "./baseline.alpha-dogfood.json";
import alphaDogfoodExperiment, { variants } from "./experiment";

export const alphaDogfoodBaseline = baselineFixture as ExperimentResult;

export const alphaDogfoodRegressionGateOptions: RegressionGateOptions = {
  maxScoreDrop: 0.03,
  maxLatencyIncreaseMs: 650,
  maxCostIncreaseUsd: 0.13,
  variantIds: variants.map((variant) => variant.id ?? variant.name),
};

export async function runAlphaDogfoodRegressionGate(
  current?: ExperimentResult,
): Promise<RegressionGateComparison> {
  return assertNoRegression(
    current ?? (await alphaDogfoodExperiment.run()),
    alphaDogfoodBaseline,
    alphaDogfoodRegressionGateOptions,
  );
}

if (isMainModule()) {
  try {
    const comparison = await runAlphaDogfoodRegressionGate();
    console.log(comparison.markdown);
  } catch (error) {
    if (error instanceof RegressionGateError) {
      console.error(error.comparison.markdown);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}
