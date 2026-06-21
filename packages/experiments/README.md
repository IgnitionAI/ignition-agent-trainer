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

## Add Regression Gates

Use `compareExperimentResults()` when you want an inspectable comparison, and `assertNoRegression()` when CI should fail on meaningful regressions.

```ts
import { assertNoRegression, compareExperimentResults } from "@ignitionai/experiments";

const baseline = await baselineExperiment.run();
const current = await currentExperiment.run();

assertNoRegression(current, baseline, {
  maxScoreDrop: 0.03,
  maxLatencyIncreaseMs: 250,
  maxCostIncreaseUsd: 0.002,
});
```

The comparison checks the leaderboard winner plus matching variant IDs. It returns a Markdown summary that can be printed in CI logs:

```ts
const comparison = compareExperimentResults(current, baseline, {
  maxScoreDrop: 0.03,
});

console.log(comparison.markdown);
```

## Non-goals

This package does not dynamically load files, implement a CLI, write reports to disk, call external LLMs, store results in a database, or create hosted reporting surfaces.
