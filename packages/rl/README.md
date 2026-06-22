# @ignitionai/rl

Experimental reinforcement-learning-inspired utilities for Ignition Agent Trainer.

This package is prototype-only today. It does not train model weights, route live production traffic, implement PPO or implement GRPO.

## Policy Selection

Use the policy helpers to choose among fixed strategy candidates before introducing bandits or rollout training.

```ts
import { createScoreBasedPolicy, createStaticPolicy } from "@ignitionai/rl";

const staticPolicy = createStaticPolicy("rag-basic");
const scorePolicy = createScoreBasedPolicy();

const decision = await scorePolicy.decide({
  candidates: [
    { id: "direct-answer", action: { strategyId: "direct-answer" }, score: 0.42 },
    { id: "rag-basic", action: { strategyId: "rag-basic" }, score: 0.82 },
  ],
});
```

`PolicyContext` and `PolicyDecision` model strategy selection only. They do not train a model, mutate prompts or update workflow state.

## Trajectories

Use `recordTrajectory()` and `summarizeTrajectory()` when you need a local record of state, action, reward and outcome steps.

```ts
import { recordTrajectory, summarizeTrajectory } from "@ignitionai/rl";

const trajectory = recordTrajectory(
  [
    {
      state: { task: "support", risk: "medium" },
      action: { id: "rag-basic" },
      reward: 0.82,
    },
  ],
  { id: "support-policy-run", policyId: "score-policy" },
);

const summary = summarizeTrajectory(trajectory);
```

Trajectories are plain JSON-compatible records. They are not an external tracing service and they do not imply a training loop.

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

## Contextual Bandit Prototype

Use `ContextualBanditStrategySelector` when fixed strategy arms should be scored against deterministic task features before any deeper policy optimization exists.

```ts
import { ContextualBanditStrategySelector } from "@ignitionai/rl";

const selector = new ContextualBanditStrategySelector([
  {
    id: "direct-answer",
    strategy: { workflow: "direct" },
    preferredContext: {
      taskType: "faq",
      citationNeed: "none",
      costSensitivity: "high",
      latencySensitivity: "high",
      riskLevel: "low",
    },
  },
  {
    id: "rag-with-verification",
    strategy: { workflow: "rag-verify" },
    preferredContext: {
      taskType: "policy-analysis",
      citationNeed: "required",
      costSensitivity: "medium",
      latencySensitivity: "low",
      riskLevel: "high",
    },
  },
]);

const selected = selector.select({
  taskType: "policy-analysis",
  citationNeed: "required",
  costSensitivity: "medium",
  latencySensitivity: "low",
  riskLevel: "high",
});
```

The contextual bandit is a prototype over developer-supplied features and fixed strategies. It does not learn embeddings, train neural policies, mutate prompts or route live production traffic.

## Offline Policy Evaluation

Use `evaluatePolicyOffline()` to replay a policy against local records that contain candidates and known rewards. This is for deterministic analysis only; it does not route live traffic.

```ts
import { createScoreBasedPolicy, evaluatePolicyOffline } from "@ignitionai/rl";

const result = await evaluatePolicyOffline(createScoreBasedPolicy(), [
  {
    id: "case-1",
    context: {
      candidates: [
        { id: "direct", action: { strategyId: "direct" }, score: 0.45 },
        { id: "rag-basic", action: { strategyId: "rag-basic" }, score: 0.82 },
      ],
    },
    rewardByCandidateId: {
      direct: 0.45,
      "rag-basic": 0.82,
    },
    expectedCandidateId: "rag-basic",
  },
]);
```

`createOfflinePolicyRecordsFromTrajectories()` can convert recorded trajectories into observed-action records. Those records only know the reward for the logged action unless you provide richer offline records yourself.

## Current Guarantees

- static and score-based policies are deterministic,
- trajectories are plain local records,
- arms are fixed and supplied by the developer,
- selection is epsilon-greedy,
- exploitation tie-breaking is deterministic by average reward, pulls, then arm id,
- contextual selection uses deterministic feature and reward scoring,
- offline policy evaluation replays local records deterministically,
- tests use fixed random values,
- no external APIs are called.

## Non-goals

This package does not implement:

- PPO,
- GRPO,
- model training,
- neural policies,
- workflow mutation,
- external tracing service,
- live traffic routing,
- production SaaS integration.
