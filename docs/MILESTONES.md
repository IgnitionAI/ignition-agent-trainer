# Milestones

## Milestone 0 - Foundation

Completed:

```txt
- core primitives
- evals/rewards
- experiment runner
- basic eval example
- context engineering example
- trainer recommendations
- generic callable adapter
```

Exit criteria:

```txt
The repo can compare deterministic agent variants over a dataset and produce a leaderboard/recommendation.
```

## Milestone 1 - Developer Tooling

Goal:

```txt
Make the framework usable from local dev and CI.
```

Includes:

```txt
- docs runbook
- Biome/lint fix
- exporters
- typed experiment definitions
- CLI runner
- regression gates
- local result history
```

Exit criteria:

```txt
A developer can define an experiment, run it from CLI, export a report, and fail CI on regression.
```

## Milestone 2 - Ecosystem Adapters

Goal:

```txt
Wrap popular TypeScript agent frameworks.
```

Includes:

```txt
- LangChain adapter
- LangGraph adapter
- Mastra adapter
- Vercel AI SDK adapter
```

Exit criteria:

```txt
A developer can plug a Runnable/graph/agent-like object into experiments without rewriting it.
```

## Milestone 3 - Deterministic Optimization

Goal:

```txt
Optimize context/workflow strategies without RL.
```

Includes:

```txt
- objective-based ranking
- prompt/workflow candidate evaluation
- parameter grid search
- recommendation improvements
```

Exit criteria:

```txt
A developer can test multiple context engineering strategies and get a deterministic recommendation.
```

## Milestone 4 - IgnitionRAG Integration Design

Goal:

```txt
Prepare integration into IgnitionRAG.
```

Includes:

```txt
- Evaluation Center design
- Experiment Lab design
- Regression checks design
- Agent Trainer design
```

Exit criteria:

```txt
IgnitionRAG has a clear integration plan before SaaS implementation begins.
```

## Milestone 5 - RL Exploration

Only after Milestones 1-4.

Current status:

```txt
PR #20 starts RL exploration with an experimental fixed-strategy bandit prototype only.
```

Includes:

```txt
- bandits
- GRPO-style candidate selection
- policy/environment abstractions
- PPO later
```

Explicit constraint:

```txt
RL is not a near-term dependency for product value.
```
