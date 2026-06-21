# @ignitionai/exporters

Reusable exporters for Ignition Agent Trainer experiment results.

Use this package when you want a stable JSON or Markdown report from an `ExperimentResult` without adding a CLI, filesystem writer, database or hosted service.

```ts
import { exportExperimentResult, toJsonReport, toMarkdownReport } from "@ignitionai/exporters";

const stableReport = exportExperimentResult(result, {
  recommendation,
  metadata: { source: "local-ci" },
});

const json = toJsonReport(result, { recommendation });
const markdown = toMarkdownReport(result, { recommendation });
```

## Current API

- `exportExperimentResult(result, options?)` returns a stable report object.
- `toJsonReport(result, options?)` returns pretty JSON.
- `toMarkdownReport(result, options?)` returns a Markdown summary.

## Stable Report Shape

The exported report includes:

- schema version,
- timestamp,
- experiment name and timing,
- dataset size,
- variant summaries,
- leaderboard rows,
- reward summaries,
- recommendation when provided,
- metadata when provided.

## Non-goals

This package does not write files, compare baselines, run experiments, call providers, or implement a CLI. Those capabilities belong in later backlog PRs.
