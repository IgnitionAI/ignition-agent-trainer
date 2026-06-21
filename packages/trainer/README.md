# @ignitionai/trainer

Deterministic recommendation primitives for Ignition Agent Trainer experiment results.

The trainer package does not train model weights today. It interprets an `ExperimentResult` and answers:

```txt
Which variant won?
Why did it win?
What are the tradeoffs?
How confident are we?
Which alternatives are close?
```

## Current API

```ts
import {
  rankVariants,
  recommendVariant,
  selectBestByObjective,
  selectBestVariant,
  suggestNextExperiment,
} from "@ignitionai/trainer";

const winner = selectBestVariant(result);
const recommendation = recommendVariant(result);
const costWinner = selectBestByObjective(result, "cost-first");
const ranking = rankVariants(result, "balanced");
const next = suggestNextExperiment(result, "quality-first");
```

`recommendVariant()` returns a structured recommendation with:

- winner name,
- score,
- summary,
- reasons,
- tradeoffs,
- confidence,
- alternatives.

Optimization primitives are deterministic and support four objectives:

- `quality-first`,
- `cost-first`,
- `latency-first`,
- `balanced`.

They use only the experiment leaderboard data already present in an `ExperimentResult`.

## Why This Supports Context Engineering

Ignition Agent Trainer compares prompts, tools, retrieval strategies, verification steps and workflow variants without retraining the underlying LLM.

The trainer layer turns a leaderboard into a product-facing decision:

```txt
Experiment result -> Recommendation -> Strategy selection
```

## Not RL Yet

This package is intentionally rule-based in the MVP. It does not implement PPO, GRPO, prompt mutation, bandits or learned routing policies.

Future versions can build on the same experiment and recommendation data to add:

- prompt and workflow candidate search,
- generic optimization loops,
- bandit strategy routing,
- GRPO-style candidate selection,
- PPO only after the environment and rollout abstractions are mature.
