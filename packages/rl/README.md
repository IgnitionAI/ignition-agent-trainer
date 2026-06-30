# @ignitionai/agent-trainer-rl

Experimental reinforcement-learning-inspired utilities for Ignition Agent Trainer.

This package is prototype-only today. It does not train model weights, route live production traffic, implement PPO or implement full GRPO training.

## Policy Selection

Use the policy helpers to choose among fixed strategy candidates before introducing bandits or rollout training.

```ts
import { createScoreBasedPolicy, createStaticPolicy } from "@ignitionai/agent-trainer-rl";

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
import { recordTrajectory, summarizeTrajectory } from "@ignitionai/agent-trainer-rl";

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

Environment episodes from `@ignitionai/agent-trainer-environment` can be converted directly:

```ts
import {
  exportTrajectoryReport,
  recordEpisodeTrajectory,
  toMarkdownTrajectoryReport,
} from "@ignitionai/agent-trainer-rl";

const trajectory = recordEpisodeTrajectory(episode, {
  id: "rag-environment-episode",
});
const report = exportTrajectoryReport(trajectory);
const markdown = toMarkdownTrajectoryReport(report);
```

See `examples/rag-environment-episode` for a complete mocked RAG episode that runs:

```txt
search -> rerank -> verify -> answer
```

The same episode module can be run through the local CLI:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- environment run ./examples/rag-environment-episode/src/index.ts \
  --json reports/rag-trajectory.json \
  --markdown reports/rag-trajectory.md \
  --offline-records
```

## Experimental Fixed-Strategy Bandit

Use `ExperimentalBanditStrategySelector` to choose among fixed, developer-supplied strategies and update their rewards from observed experiment outcomes.

```ts
import { ExperimentalBanditStrategySelector } from "@ignitionai/agent-trainer-rl";

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
import { ContextualBanditStrategySelector } from "@ignitionai/agent-trainer-rl";

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
import { createScoreBasedPolicy, evaluatePolicyOffline } from "@ignitionai/agent-trainer-rl";

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

The same helper works with trajectories created from environment episodes:

```ts
const trajectory = recordEpisodeTrajectory(episode);
const records = createOfflinePolicyRecordsFromTrajectories([trajectory], {
  experimentName: "rag-environment",
});
```

## GRPO-Style Candidate Selection

Use `selectGroupRelativeBest()` when prompt, workflow or strategy candidates should be ranked by their advantage relative to other candidates in the same group.

```ts
import { selectGroupRelativeBest } from "@ignitionai/agent-trainer-rl";

const result = selectGroupRelativeBest([
  {
    id: "prompt-group",
    kind: "prompt",
    candidates: [
      { id: "prompt-basic", score: 0.7 },
      { id: "prompt-cited", score: 0.9 },
    ],
  },
  {
    id: "workflow-group",
    kind: "workflow",
    candidates: [
      { id: "workflow-basic", score: 0.6 },
      { id: "workflow-rerank", score: 0.95 },
    ],
  },
]);
```

This is group-relative selection only. It does not update model weights, compute gradients, require GPUs or implement a real GRPO trainer.

## PPO Interface Skeletons

Use the PPO types only as a future integration boundary. `UnimplementedPPOTrainer` exists to fail clearly if a caller tries to run PPO before a real trainer is designed.

```ts
import { UnimplementedPPOTrainer, type PPOConfig, type PPOTrainingBatch } from "@ignitionai/agent-trainer-rl";

const config: PPOConfig = {
  clipRatio: 0.2,
  discountFactor: 0.99,
  gaeLambda: 0.95,
  learningRate: 0.0003,
  epochs: 4,
  batchSize: 32,
};

const batch: PPOTrainingBatch = {
  samples: [
    {
      state: { task: "support" },
      action: { id: "rag-basic" },
      reward: 0.82,
      advantage: 0.1,
      returnEstimate: 0.92,
    },
  ],
};

new UnimplementedPPOTrainer().train(batch, config);
```

This throws by design. The package defines PPO-facing types only; it does not implement PPO optimization.

## Current Guarantees

- static and score-based policies are deterministic,
- trajectories are plain local records,
- arms are fixed and supplied by the developer,
- selection is epsilon-greedy,
- exploitation tie-breaking is deterministic by average reward, pulls, then arm id,
- contextual selection uses deterministic feature and reward scoring,
- offline policy evaluation replays local records deterministically,
- GRPO-style candidate selection ranks fixed groups deterministically,
- PPO exports are interface skeletons only and throw if invoked through the placeholder trainer,
- tests use fixed random values,
- no external APIs are called.

## Non-goals

This package does not implement:

- PPO optimization,
- full GRPO training,
- model training,
- neural policies,
- workflow mutation,
- external tracing service,
- live traffic routing,
- production SaaS integration.
