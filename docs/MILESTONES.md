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

## Post-#20 Milestones

### Milestone 6 - Alpha Readiness

Goal:

```txt
Make the framework usable by a developer outside the project.
```

Included PRs:

```txt
PR #21 - docs: add post-20 roadmap and project audit
PR #22 - chore: prepare alpha package readiness
PR #23 - feat: add report bundle output
PR #24 - feat: add CI regression gate example
```

Exit criteria:

```txt
A developer can install the monorepo, run an experiment, export a report, compare a baseline, and understand failures.
```

Explicit non-goals:

```txt
No SaaS UI, hosted runtime, database, real provider calls or deep RL.
```

### Milestone 7 - IgnitionRAG Bridge

Goal:

```txt
Prepare the framework to be consumed by IgnitionRAG through stable package APIs.
```

Included PRs:

```txt
PR #25 - feat: add RAG evaluation presets
PR #26 - feat: add strategy preset registry
PR #27 - feat: add IgnitionRAG adapter contract
PR #28 - docs: add IgnitionRAG implementation handoff
```

Exit criteria:

```txt
IgnitionRAG can call the engine through documented contracts without copying internal implementation details.
```

Explicit non-goals:

```txt
No IgnitionRAG repo changes, database migrations, auth, billing or frontend implementation.
```

### Milestone 8 - Policy Optimization Foundation

Goal:

```txt
Represent strategy selection as policies and trajectories before deeper RL work.
```

Included PRs:

```txt
PR #29 - feat: add policy abstraction layer
PR #30 - feat: add rollout and trajectory recorder
PR #31 - feat: add contextual bandit prototype
PR #32 - feat: add offline policy evaluation
```

Exit criteria:

```txt
The project can model state/action/reward trajectory data and evaluate simple policies offline.
```

Explicit non-goals:

```txt
No PPO, GRPO trainer, neural policies, live traffic routing or model fine-tuning.
```

### Milestone 9 - RL Exploration

Goal:

```txt
Explore group-relative strategy selection and prepare PPO interfaces without implementing PPO.
```

Included PRs:

```txt
PR #33 - feat: add GRPO-style candidate selection
PR #34 - docs: add RL architecture decision record
PR #35 - feat: add PPO interface skeletons
```

Exit criteria:

```txt
The repo has clear RL architecture boundaries and type-level PPO skeletons only.
```

Primary architecture reference:

```txt
docs/adr/0003-rl-foundation-sequence.md
```

Explicit non-goals:

```txt
No PPO optimization, GPU training, model weight updates or production RL serving.
```

### Milestone 10 - Alpha Validation

Goal:

```txt
Prove the framework is usable end to end on a realistic IgnitionRAG-style document assistant evaluation.
```

Included PRs:

```txt
PR #36 - docs: add alpha validation plan
PR #37 - feat: add alpha dogfood experiment
PR #38 - chore: prepare v0.1.0-alpha.0 readiness
PR #39 - docs: add IgnitionRAG Evaluation Center integration checklist
PR #40 - feat: add IgnitionRAG evaluation bridge prototype
```

Exit criteria:

```txt
A developer can run the alpha dogfood experiment locally, export reports, compare a baseline, and understand the recommended RAG strategy without reading source code.
```

Primary validation reference:

```txt
docs/ALPHA_VALIDATION_PLAN.md
```

Explicit non-goals:

```txt
No frontend, database, SaaS integration, real provider calls, PPO implementation, GRPO training, model fine-tuning or production IgnitionRAG integration.
```
