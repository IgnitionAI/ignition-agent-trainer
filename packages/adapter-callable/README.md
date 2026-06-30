# @ignitionai/agent-trainer-adapter-callable

Generic callable adapter for Ignition Agent Trainer.

Use this package when you already have an agent-like TypeScript function and want to evaluate it with the standard dataset, rewards, experiment and trainer loop.

```ts
import { createCallableAdapter } from "@ignitionai/agent-trainer-adapter-callable";

const adapter = createCallableAdapter({
  name: "support-agent-v1",
  run: async ({ input }) => ({
    output: `Answer to: ${input}`,
    metadata: {
      costUsd: 0.01,
    },
  }),
});
```

The adapter conforms to the shared `AgentAdapter` interface from `@ignitionai/agent-trainer-core`, so it can be used as a normal experiment variant.

## What It Bridges

`@ignitionai/agent-trainer-adapter-callable` is the first generic bridge from real user code into Ignition Agent Trainer:

- custom functions,
- local service wrappers,
- API route calls,
- lightweight in-house agents,
- future framework-specific adapters.

Framework adapters for LangChain, LangGraph, Mastra and Vercel AI SDK can reuse the same normalization idea later.

## Behavior

The adapter:

- passes `{ input, item, context }` to the callable,
- supports string and structured object outputs,
- preserves traces when provided,
- preserves metadata,
- maps `metadata.costUsd` and `metadata.latencyMs` into usage metrics,
- measures latency automatically when no latency is provided,
- lets the experiment runner record thrown errors as failed cases without crashing the whole experiment.

## Context Engineering

Callable adapters make it easy to compare custom context and workflow strategies:

```txt
custom callable -> AgentAdapter -> Experiment -> Rewards -> Leaderboard -> Recommendation
```

That is the bridge from mocked examples to real IgnitionRAG workflows and customer-owned agents.
