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

## Non-goals

The CLI does not implement watch mode, remote execution, hosted dashboards, auth, provider keys, persistent history or regression gates.
