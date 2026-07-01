# @ignitionai/agent-trainer

Deterministic recommendation primitives for Ignition Agent Trainer experiment results.

The trainer package does not train model weights today. It interprets an `ExperimentResult` and answers:

```txt
Was a comparison available?
Which variant won when alternatives were evaluated?
What baseline was measured when only one variant was evaluated?
Why did the recommendation choose that wording?
What are the tradeoffs?
How confident are we?
Which alternatives are close?
```

## Current API

```ts
import {
  generateParameterCombinations,
  rankVariants,
  recommendVariant,
  runGridSearch,
  selectBestByObjective,
  selectBestVariant,
  suggestNextExperiment,
} from "@ignitionai/agent-trainer";

const winner = selectBestVariant(result);
const recommendation = recommendVariant(result);
const costWinner = selectBestByObjective(result, "cost-first");
const ranking = rankVariants(result, "balanced");
const next = suggestNextExperiment(result, "quality-first");
const combinations = generateParameterCombinations({
  topK: [3, 5, 10],
  rerank: [true, false],
  verify: [true, false],
});
```

`recommendVariant()` returns a structured recommendation with:

- winner name for comparative runs, or the measured baseline variant name for single-variant runs,
- score,
- summary,
- reasons,
- tradeoffs,
- confidence,
- `comparisonAvailable`,
- `recommendationKind`,
- alternatives.

When an experiment has only one variant, the recommendation is intentionally non-comparative:

```ts
const recommendation = recommendVariant(singleVariantResult);

recommendation?.comparisonAvailable; // false
recommendation?.recommendationKind; // "baseline"
recommendation?.confidence; // "low"
recommendation?.summary;
// "Baseline measured for current-agent. No alternative variants were evaluated, so no comparative winner is available."
```

Consumers should treat this as a baseline measurement, not as a winning strategy. Add another variant before showing winner, best variant or promotion language.

Optimization primitives are deterministic and support four objectives:

- `quality-first`,
- `cost-first`,
- `latency-first`,
- `balanced`.

They use only the experiment leaderboard data already present in an `ExperimentResult`.

## Evaluate User-Provided Candidates

Prompt and workflow candidates are manually supplied by the developer. The trainer can convert them into experiment variants, run the existing evaluation loop and rank the result:

```ts
import { evaluateCandidates } from "@ignitionai/agent-trainer";

const result = await evaluateCandidates({
  name: "candidate-comparison",
  dataset,
  rewards,
  objective: "quality-first",
  candidates: [
    {
      id: "concise-prompt",
      kind: "prompt",
      prompt: "Answer concisely with citations.",
      run: ({ item }) => runMyAgent(item.input),
    },
  ],
});
```

The package does not generate, mutate or synthesize candidates. It evaluates the candidates you provide.

## Simple Search Optimization

Use `runGridSearch()` when a context engineering strategy has a small, manually defined parameter grid:

```ts
import { runGridSearch } from "@ignitionai/agent-trainer";

const search = await runGridSearch({
  name: "retrieval-grid",
  dataset,
  rewards,
  objective: "quality-first",
  grid: {
    topK: [3, 5, 10],
    rerank: [true, false],
    verify: [true, false],
  },
  createVariant(combination) {
    return {
      name: combination.name,
      run: ({ input }) =>
        runMyAgent(input, {
          topK: combination.parameters.topK,
          rerank: combination.parameters.rerank,
          verify: combination.parameters.verify,
        }),
    };
  },
});

console.log(search.bestCombination?.parameters);
```

The grid search API is deterministic:

- parameter keys are sorted before combinations are generated,
- combination IDs are stable,
- empty grids run a single `default` combination,
- a grid axis with no values returns no combinations.

It does not infer search spaces, generate prompts, call providers or train a model.

## Why This Supports Context Engineering

Ignition Agent Trainer compares prompts, tools, retrieval strategies, verification steps and workflow variants without retraining the underlying LLM.

The trainer layer turns a leaderboard into a product-facing decision:

```txt
Experiment result -> Recommendation -> Strategy selection
```

For single-variant evaluation runs, the trainer layer turns the leaderboard into a baseline summary instead:

```txt
Experiment result -> Baseline measurement -> Compare against alternatives later
```

## Not RL Yet

This package is intentionally rule-based in the MVP. It does not implement PPO, GRPO, prompt mutation, bandits or learned routing policies.

Future versions can build on the same experiment and recommendation data to add:

- bandit strategy routing,
- GRPO-style candidate selection,
- PPO only after the environment and rollout abstractions are mature.
