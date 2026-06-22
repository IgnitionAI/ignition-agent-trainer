# @ignitionai/exporters

Reusable exporters for Ignition Agent Trainer experiment results.

Use this package when you want a stable JSON or Markdown report from an `ExperimentResult`, either in memory or as a local filesystem bundle.

```ts
import {
  exportExperimentResult,
  toJsonReport,
  toMarkdownReport,
  writeReportBundle,
} from "@ignitionai/exporters";

const stableReport = exportExperimentResult(result, {
  recommendation,
  metadata: { source: "local-ci" },
});

const json = toJsonReport(result, { recommendation });
const markdown = toMarkdownReport(result, { recommendation });

const bundle = await writeReportBundle(result, {
  outputDirectory: "reports",
  generatedAt: "2026-01-01T00:02:00.000Z",
  recommendation,
  includeMetadataFile: true,
});

console.log(bundle.directory);
```

## Current API

- `exportExperimentResult(result, options?)` returns a stable report object.
- `toJsonReport(result, options?)` returns pretty JSON.
- `toMarkdownReport(result, options?)` returns a Markdown summary.
- `writeReportBundle(result, options)` writes a timestamped local report folder.

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

## Report Bundles

`writeReportBundle()` creates a local folder named from the experiment and generation timestamp:

```txt
reports/
└─ context-strategy-report-2026-01-01T00-02-00-000Z/
   ├─ report.json
   ├─ report.md
   └─ metadata.json
```

`metadata.json` is written only when `includeMetadataFile: true` or a custom `metadataFileName` is provided. Pass `generatedAt` or `bundleName` when CI needs deterministic paths.

## Non-goals

This package does not compare baselines, run experiments, call providers, store reports remotely, or create hosted reporting surfaces. Those capabilities belong in other packages or later backlog PRs.
