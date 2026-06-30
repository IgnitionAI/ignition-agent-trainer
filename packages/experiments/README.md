# @ignitionai/agent-trainer-experiments

Experiment runner and typed experiment definitions for Ignition Agent Trainer.

Use this package to compare agent variants over a dataset with rewards and produce an `ExperimentReport`.

## Run an Experiment Directly

```ts
import { createExperiment } from "@ignitionai/agent-trainer-experiments";

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
import { defineExperiment } from "@ignitionai/agent-trainer-experiments";

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
import { assertNoRegression, compareExperimentResults } from "@ignitionai/agent-trainer-experiments";

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

For a copyable GitHub Actions example with a committed baseline fixture, see:

```txt
examples/ci-regression-gate
```

## Keep Local Experiment History

Use JSONL history helpers when you want to keep local runs without adding a database or hosted storage.

```ts
import {
  appendExperimentHistory,
  compareExperimentResults,
  getLatestExperimentResult,
  readExperimentHistory,
} from "@ignitionai/agent-trainer-experiments";

const historyPath = ".ignition/experiment-history.jsonl";
const history = await readExperimentHistory(historyPath);
const baseline = getLatestExperimentResult(history, "context-engineering-strategies");
const current = await experiment.run();

if (baseline !== null) {
  const comparison = compareExperimentResults(current, baseline, {
    maxScoreDrop: 0.03,
  });
  console.log(comparison.markdown);
}

await appendExperimentHistory(historyPath, current, {
  metadata: { source: "local-dev" },
});
```

The history format is newline-delimited JSON. Each line is an `ExperimentHistoryEntry`:

```json
{
  "schemaVersion": "ignition.experiment-history-entry.v1",
  "id": "context-engineering-strategies-2026-01-01T00-00-00-000Z",
  "recordedAt": "2026-01-01T00:00:00.000Z",
  "result": {
    "name": "context-engineering-strategies",
    "startedAt": "2026-01-01T00:00:00.000Z",
    "endedAt": "2026-01-01T00:00:01.000Z",
    "leaderboard": [],
    "cases": [],
    "failedCases": []
  }
}
```

Missing history files read as an empty array. Invalid JSONL fails with the line number so CI logs point to the bad entry.

## Non-goals

This package does not dynamically load files, implement a CLI, write exporter reports to disk, call external LLMs, store results in a database, or create hosted reporting surfaces. Local history is an explicit JSONL file helper only.
