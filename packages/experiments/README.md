# @ignitionai/experiments

Experiment runner and typed experiment definitions for Ignition Agent Trainer.

Use this package to compare agent variants over a dataset with rewards and produce an `ExperimentReport`.

## Run an Experiment Directly

```ts
import { createExperiment } from "@ignitionai/experiments";

const result = await createExperiment({
  name: "support-agent-eval",
  dataset,
  variants,
  rewards,
}).run();
```

## Define a Reusable Experiment Module

`defineExperiment()` wraps the same config in a typed, importable module shape. This prepares experiments for future CLI loading without implementing the CLI in this package.

```ts
import { defineExperiment } from "@ignitionai/experiments";

export default defineExperiment({
  name: "context-engineering-strategies",
  dataset,
  variants,
  rewards,
});
```

The returned `ExperimentDefinition` includes:

- the original experiment config,
- `kind: "ignition.experiment-definition"`,
- `create()` for a fresh `Experiment`,
- `run()` for direct execution.

## Non-goals

This package does not dynamically load files, implement a CLI, write reports to disk, call external LLMs, or store results in a database.
