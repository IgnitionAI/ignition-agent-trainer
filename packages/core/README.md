# @ignitionai/agent-trainer-core

Shared TypeScript primitives for Ignition Agent Trainer.

Use this package when defining datasets, agent adapters, traces, usage metrics, reward results and experiment result shapes.

## Current API

```ts
import {
  assertRunResult,
  createDataset,
  createMockAdapter,
  normalizeRunResult,
  toAgentInput,
  validateDataset,
  weightedAverage,
} from "@ignitionai/agent-trainer-core";
```

Main exports:

- dataset helpers: `createDataset`, `assertDatasetItem`,
- runtime validation helpers: `assertDataset`, `validateDataset`, `assertAgentVariant`, `validateAgentVariant`, `assertRunResult`, `validateRunResult`, `assertUsageMetrics`, `validateUsageMetrics`, `assertTrace`, `validateTrace`, `assertMetricResult`, `validateMetricResult`, `assertRewardResult`, `assertNormalizedScore`, `assertJsonValue`,
- adapter helpers: `createMockAdapter`, `normalizeRunResult`, `toAgentInput`,
- score helpers: `clampScore`, `weightedAverage`,
- shared types for datasets, adapters, traces, rewards, cases, leaderboards and experiment reports.

The `assert*` helpers throw clear errors and narrow TypeScript types. The `validate*` helpers return `{ ok: true, value }` or `{ ok: false, error }` when callers need non-throwing validation.

## Alpha Readiness Status

This package is foundational and covered by dedicated package-level tests for the current helper surface.

Known gaps:

- runtime validation covers core datasets, variants, run results, usage, traces and scores; full serialized experiment report schema validation remains outside the current helper surface,
- no compatibility policy beyond the current monorepo usage.

## Non-goals

This package does not run experiments, evaluate rewards, export reports, call LLM providers or persist data.
