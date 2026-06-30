# @ignitionai/agent-trainer-cli

Local CLI for running typed Ignition Agent Trainer experiment modules.

## Run a Typed Experiment

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

The experiment file must default export an `ExperimentDefinition` created with `defineExperiment()`:

```ts
import { defineExperiment } from "@ignitionai/agent-trainer-experiments";

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
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --json reports/context-engineering.json \
  --markdown reports/context-engineering.md
```

Both reports include the leaderboard and recommendation.

## Write Report Bundles

Use `--bundle` when CI or local runs should keep JSON, Markdown and bundle metadata together:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
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

## Keep Local History

Use `--history` with `--record-history` to append the result to a local JSONL history file:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --history .ignition/experiment-history.jsonl \
  --record-history
```

List recent entries:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval history list .ignition/experiment-history.jsonl \
  --experiment context-engineering-strategies \
  --limit 5
```

Inspect the latest entry for an experiment:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval history show .ignition/experiment-history.jsonl latest \
  --experiment context-engineering-strategies
```

The history file is newline-delimited JSON using `ignition.experiment-history-entry.v1`.

## Run Regression Checks

Use `--baseline latest` to compare the current run against the latest matching history entry.
`--regression` makes the command fail when the comparison exceeds the allowed thresholds:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --history .ignition/experiment-history.jsonl \
  --baseline latest \
  --regression \
  --max-score-drop 0.03 \
  --max-latency-increase-ms 250 \
  --max-cost-increase-usd 0.002 \
  --regression-markdown reports/regression.md
```

You can also pass a concrete history entry id instead of `latest`:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --history .ignition/experiment-history.jsonl \
  --baseline context-engineering-strategies-2026-01-01T00-00-00-000Z \
  --regression
```

Use `--variant <id>` one or more times when only specific variants should be checked.

## Non-goals

The CLI does not implement watch mode, remote execution, hosted dashboards, auth, provider keys, hosted history or provider-backed regression scoring.
