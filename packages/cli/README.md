# @ignitionai/cli

Local CLI for running typed Ignition Agent Trainer experiment modules.

## Run a Typed Experiment

```bash
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

The experiment file must default export an `ExperimentDefinition` created with `defineExperiment()`:

```ts
import { defineExperiment } from "@ignitionai/experiments";

export default defineExperiment({
  name: "context-engineering-strategies",
  dataset,
  variants,
  rewards,
});
```

The command prints:

- experiment name,
- dataset size,
- variant names,
- leaderboard,
- recommendation when a winner is available.

## Write Reports

Use `--json` and `--markdown` to persist exporter output:

```bash
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --json reports/context-engineering.json \
  --markdown reports/context-engineering.md
```

Both reports include the leaderboard and recommendation.

## Write Report Bundles

Use `--bundle` when CI or local runs should keep JSON, Markdown and bundle metadata together:

```bash
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --bundle reports
```

The command writes a timestamped folder:

```txt
reports/
└─ context-engineering-strategies-2026-01-01T00-02-00-000Z/
   ├─ report.json
   ├─ report.md
   └─ metadata.json
```

## Non-goals

The CLI does not implement watch mode, remote execution, hosted dashboards, auth, provider keys, persistent history or regression gates.
