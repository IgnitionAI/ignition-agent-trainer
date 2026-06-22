#!/usr/bin/env bun

import { pathToFileURL } from "node:url";
import type { ExperimentResult } from "@ignitionai/core";
import {
  assertNoRegression,
  type RegressionGateComparison,
  RegressionGateError,
  type RegressionGateOptions,
} from "@ignitionai/experiments";
import experiment from "../context-engineering/experiment";
import baselineFixture from "./baseline.context-engineering.json";

export const baseline = baselineFixture as ExperimentResult;

export const regressionGateOptions: RegressionGateOptions = {
  maxScoreDrop: 0.03,
  maxLatencyIncreaseMs: 150,
  maxCostIncreaseUsd: 0.001,
};

export async function runRegressionGate(): Promise<RegressionGateComparison> {
  const current = await experiment.run();
  return assertNoRegression(current, baseline, regressionGateOptions);
}

if (isMainModule()) {
  try {
    const comparison = await runRegressionGate();
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
