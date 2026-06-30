# Architecture

## Core idea

Everything becomes a variant that can be run against a dataset and scored.

A variant can be:

- a LangChain agent,
- a LangGraph graph,
- a Mastra agent,
- a Vercel AI SDK function,
- an IgnitionRAG workflow,
- a plain TypeScript function.

## Canonical flow

```txt
DatasetItem
  ↓
AgentVariant.run()
  ↓
AgentRun
  ↓
RewardFunction[]
  ↓
ExperimentReport
  ↓
Trainer / optimizer
```

## Packages

### `@ignitionai/agent-trainer-core`

Owns shared types:

- dataset,
- expected output,
- agent adapter,
- agent run,
- trace,
- reward result,
- experiment result.

### `@ignitionai/agent-trainer-evals`

Scorers and reward functions:

- correctness,
- groundedness,
- citation coverage,
- tool efficiency,
- cost,
- latency.

### `@ignitionai/agent-trainer-experiments`

Runs variants over datasets and creates reports.

### `@ignitionai/agent-trainer`

Optimizes candidates:

- prompts,
- workflows,
- retrieval configs,
- routing strategies.

### `@ignitionai/agent-trainer-environment`

Defines state/action/reward loops for multi-step agent behavior.

### `@ignitionai/agent-trainer-rl`

Contains actual policy optimization algorithms.

### Adapter packages

Framework-specific wrappers:

- `@ignitionai/agent-trainer-adapter-langchain`,
- `@ignitionai/agent-trainer-adapter-langgraph`,
- `@ignitionai/agent-trainer-adapter-mastra`,
- `@ignitionai/agent-trainer-adapter-vercel-ai`.

## Trace model

The trace should be framework-neutral:

```ts
{
  steps: [
    { type: "message", role: "user", content: "..." },
    { type: "tool_call", name: "search", input: { q: "..." }, output: [...] },
    { type: "tool_call", name: "rerank", input: {...}, output: [...] },
    { type: "message", role: "assistant", content: "..." }
  ]
}
```

## Storage strategy

MVP:

- JSON files.

IgnitionRAG integration:

- PostgreSQL tables for datasets, experiment runs, traces, scores.
- Object storage for large trace payloads.

## Observability strategy

The framework should not replace LangSmith, Langfuse or OpenTelemetry. It should export normalized run events so those systems can observe them.

## Design principle

The framework must be useful with a plain function.

If it only works with one agent framework, it becomes too coupled.
