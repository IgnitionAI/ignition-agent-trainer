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

This package is foundational and covered by dedicated package-level tests for the current helper surface.

Known gaps:

- no runtime schema validation for serialized reports,
- no compatibility policy beyond the current monorepo usage.

## Non-goals

This package does not run experiments, evaluate rewards, export reports, call LLM providers or persist data.
