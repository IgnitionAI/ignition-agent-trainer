# @ignitionai/agent-trainer-preset-rag

Reusable RAG evaluation presets for Ignition Agent Trainer.

Use this package when a mocked or local RAG experiment needs a standard set of rewards without wiring every scorer by hand.

```ts
import { createExperiment } from "@ignitionai/agent-trainer-experiments";
import { agenticRagPreset, ragQualityPreset } from "@ignitionai/agent-trainer-preset-rag";

const ragExperiment = createExperiment({
  name: "rag-strategy-comparison",
  dataset,
  variants,
  rewards: ragQualityPreset({
    maxLatencyMs: 1500,
    maxCostUsd: 0.006,
  }),
});

const agenticRagExperiment = createExperiment({
  name: "agentic-rag-strategy-comparison",
  dataset,
  variants,
  rewards: agenticRagPreset({
    maxToolCalls: 4,
  }),
});
```

## Current API

- `citationQualityPreset(options?)` returns one composite reward for required terms plus citations.
- `ragQualityPreset(options?)` returns quality, latency and cost rewards.
- `agenticRagPreset(options?)` returns RAG quality rewards plus tool-call efficiency.

## Expected Dataset Shape

The presets rely on the existing `@ignitionai/agent-trainer-evals` reward functions:

```ts
const item = {
  id: "case-1",
  input: "Explain the answer with citations.",
  expected: {
    contains: ["retrieval", "grounded"],
    citations: ["docs.md#rag"],
  },
};
```

No vector database, document ingestion pipeline or live LLM call is required.

## Non-goals

This package does not retrieve documents, ingest files, call providers, grade with an LLM, integrate with IgnitionRAG runtime, or define hosted product behavior.
