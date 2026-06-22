# @ignitionai/agent-trainer-preset-strategies

Reusable strategy preset registry for Ignition Agent Trainer experiments.

Use this package when an experiment needs deterministic context/workflow strategy variants without wiring every mocked variant by hand.

```ts
import { createExperiment } from "@ignitionai/agent-trainer-experiments";
import { ragQualityPreset } from "@ignitionai/agent-trainer-preset-rag";
import { getStrategyPreset } from "@ignitionai/agent-trainer-preset-strategies";

const variants = ["direct-answer", "rag-basic", "rag-with-verification"].map((id) => {
  const preset = getStrategyPreset(id);
  if (preset === null) throw new Error(`Missing strategy preset: ${id}`);
  return preset.createVariant();
});

const experiment = createExperiment({
  name: "strategy-preset-comparison",
  dataset,
  variants,
  rewards: ragQualityPreset(),
});
```

## Current API

- `defineStrategyPreset(config)` creates a reusable strategy preset.
- `createStrategyRegistry(presets?)` creates an immutable lookup/list registry.
- `getStrategyPreset(id, registry?)` returns a preset or `null`.
- `listStrategyPresets(registry?)` returns presets in registry order.

## Built-in Strategies

- `direct-answer`: no retrieval tools.
- `rag-basic`: retrieves context before answering.
- `rag-rerank`: retrieves and reranks context before answering.
- `rag-with-verification`: retrieves context and verifies grounding before answering.

Each built-in preset can create a deterministic mocked `AgentVariant`. The variant uses expected terms and citations from the dataset item to produce stable local outputs.

## Non-goals

This package does not retrieve documents, rerank real chunks, call LLM providers, persist registry entries, expose SaaS UI, or integrate with IgnitionRAG runtime.
