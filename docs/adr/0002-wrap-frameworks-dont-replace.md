# ADR 0002 — Wrap frameworks, do not replace them

## Status

Accepted.

## Context

The TypeScript AI ecosystem already contains agent frameworks: LangChain, LangGraph, Mastra and the Vercel AI SDK.

Competing directly on `createAgent()` is less attractive than becoming the measurement and optimization layer above those tools.

## Decision

Ignition Agent Trainer will use adapters.

```txt
Existing agent framework → Ignition adapter → canonical AgentRun
```

## Consequences

Positive:

- Easier adoption.
- Larger addressable market.
- Less framework lock-in.
- Stronger positioning.

Negative:

- Adapter maintenance burden.
- Trace normalization complexity.

## Notes

IgnitionRAG can still use the core packages internally with a first-party adapter.
