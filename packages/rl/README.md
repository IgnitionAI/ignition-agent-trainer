# @ignitionai/rl

Experimental reinforcement-learning-inspired utilities for Ignition Agent Trainer.

This package is prototype-only today. It does not train model weights, route live production traffic, implement PPO or implement GRPO.

## Experimental Fixed-Strategy Bandit

Use `ExperimentalBanditStrategySelector` to choose among fixed, developer-supplied strategies and update their rewards from observed experiment outcomes.

```ts
import { ExperimentalBanditStrategySelector } from "@ignitionai/rl";

const selector = new ExperimentalBanditStrategySelector(
  [
    { id: "simple", strategy: { workflow: "simple-rag" } },
    { id: "rerank", strategy: { workflow: "rag-rerank" } },
    { id: "verify", strategy: { workflow: "rag-rerank-verify" } },
  ],
  { epsilon: 0.1 },
);

const selected = selector.select();

// Run the selected strategy through your existing experiment loop.
// Then update the bandit from measured rewards.
selector.update(selected.id, 0.92);
```

You can also update matching arms from an `ExperimentResult` leaderboard:

```ts
selector.updateFromExperimentResult(result);
```

By default, the variant score is used as the reward. Pass `rewardFromVariant` when a different objective should drive selection:

```ts
selector.updateFromExperimentResult(result, {
  rewardFromVariant: (variant) => 1 - (variant.totalCostUsd ?? 0),
});
```

## Current Guarantees

- arms are fixed and supplied by the developer,
- selection is epsilon-greedy,
- exploitation tie-breaking is deterministic by average reward, pulls, then arm id,
- tests use fixed random values,
- no external APIs are called.

## Non-goals

This package does not implement:

- PPO,
- GRPO,
- model training,
- neural policies,
- live traffic routing,
- production SaaS integration.
