# CI Regression Gate Example

This example shows how to fail CI when an experiment regresses against a committed baseline.

It uses the existing context-engineering experiment:

```txt
examples/context-engineering/experiment.ts
```

The baseline fixture is:

```txt
examples/ci-regression-gate/baseline.context-engineering.json
```

## Run Locally

```bash
bun run --filter './examples/ci-regression-gate' dev
```

The command:

- runs the current context-engineering experiment,
- compares the current result against the baseline,
- fails the process if score drops too much, latency increases too much, cost increases too much, or a baseline variant disappears,
- prints a Markdown regression gate summary.

## Gate Thresholds

The sample gate allows:

```txt
maxScoreDrop: 0.03
maxLatencyIncreaseMs: 150
maxCostIncreaseUsd: 0.001
```

Pass behavior:

```txt
exit code 0
Result: pass
Failures: 0
```

Fail behavior:

```txt
exit code 1
Result: fail
Failures: one or more regression messages
```

## GitHub Actions

Copy `github-actions.yml` into `.github/workflows/ignition-regression-gate.yml` in a consuming project.

The sample workflow runs:

```bash
bun run --filter './examples/ci-regression-gate' dev
```

It also exports the current experiment as a report bundle for debugging:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts --bundle reports
```

This example workflow is intentionally not installed under `.github/workflows`, so it does not change this repository's production CI behavior.
