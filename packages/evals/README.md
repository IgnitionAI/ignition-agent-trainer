# @ignitionai/evals

Reward functions and trace helpers for scoring Ignition Agent Trainer runs.

Use this package to evaluate model or agent outputs against expected text, citations, JSON validity, tool usage, latency and cost.

## Current API

```ts
import {
  citationPresence,
  compositeReward,
  containsAll,
  costPenalty,
  exactMatch,
  latencyPenalty,
} from "@ignitionai/evals";
```

Main exports:

- text rewards: `exactMatch`, `containsAll`, `containsText`,
- structure rewards: `jsonValidity`,
- grounding rewards: `citationPresence`,
- efficiency rewards: `toolUsagePenalty`, `toolCallCountPenalty`, `latencyPenalty`, `costPenalty`,
- composition/customization: `compositeReward`, `customReward`,
- trace helpers: `getToolCallNames`, `hasToolCall`, `countToolCalls`.

## Alpha Readiness Status

This package is usable for deterministic local evaluations, but remains partial for alpha readiness.

Known gaps:

- no domain-specific safety or hallucination scorers,
- no model-graded reward support,
- reward set is intentionally small.

## Non-goals

This package does not call external LLMs, retrieve documents, ingest datasets, run experiments or implement hosted evaluation.
