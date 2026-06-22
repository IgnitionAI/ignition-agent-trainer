# @ignitionai/agent-trainer-core

Shared TypeScript primitives for Ignition Agent Trainer.

Use this package when defining datasets, agent adapters, traces, usage metrics, reward results and experiment result shapes.

## Current API

```ts
import {
  createDataset,
  createMockAdapter,
  normalizeRunResult,
  toAgentInput,
  weightedAverage,
} from "@ignitionai/agent-trainer-core";
```

Main exports:

- dataset helpers: `createDataset`, `assertDatasetItem`,
- adapter helpers: `createMockAdapter`, `normalizeRunResult`, `toAgentInput`,
- score helpers: `clampScore`, `weightedAverage`,
- shared types for datasets, adapters, traces, rewards, cases, leaderboards and experiment reports.

## Alpha Readiness Status

This package is foundational but still partial for alpha readiness.

Known gaps:

- no dedicated package-level tests yet,
- no runtime schema validation for serialized reports,
- no compatibility policy beyond the current monorepo usage.

## Non-goals

This package does not run experiments, evaluate rewards, export reports, call LLM providers or persist data.
