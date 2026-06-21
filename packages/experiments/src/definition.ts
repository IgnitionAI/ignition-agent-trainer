import type { ExperimentReport } from "@ignitionai/core";
import { createExperiment, type Experiment, type ExperimentConfig } from "./experiment";

export interface ExperimentDefinition extends ExperimentConfig {
  readonly kind: "ignition.experiment-definition";
  create(): Experiment;
  run(): Promise<ExperimentReport>;
}

export function defineExperiment(config: ExperimentConfig): ExperimentDefinition {
  createExperiment(config);

  return {
    ...config,
    kind: "ignition.experiment-definition",
    create() {
      return createExperiment(config);
    },
    run() {
      return createExperiment(config).run();
    },
  };
}
