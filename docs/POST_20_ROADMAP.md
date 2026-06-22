# Post-#20 Roadmap

## Post-#20 Objective

The initial foundation backlog is complete through PR #20. The project now moves into three deliberate phases:

```txt
Alpha readiness
IgnitionRAG bridge
RL exploration
```

The point of this phase is to avoid confusing a working prototype with a production-ready training system.

## Product Principle

The next phase should not jump directly into PPO.

The framework must first become usable as a reliable local and CI developer tool. RL remains an exploration layer on top of evals, rewards, experiments, traces, policies and trusted reports.

## Phase A - Alpha Readiness

Goal:

```txt
Make the framework usable by a developer outside the project.
```

Includes:

- package readiness,
- report bundles,
- CI examples,
- stronger documentation,
- stable examples,
- clean install/build/test flow.

Exit criteria:

```txt
A developer can install the monorepo, run an experiment, export a report, compare a baseline, and understand failures.
```

## Phase B - IgnitionRAG Bridge

Goal:

```txt
Prepare the framework to be consumed by IgnitionRAG.
```

Includes:

- RAG evaluation presets,
- strategy preset registry,
- IgnitionRAG adapter contract,
- handoff design for Evaluation Center and Experiment Lab.

Exit criteria:

```txt
IgnitionRAG can call the engine through stable package APIs without copying internal implementation details.
```

## Phase C - RL Exploration

Goal:

```txt
Move from deterministic optimization to policy-based strategy selection.
```

Includes:

- policy abstraction,
- rollout / trajectory recorder,
- contextual bandits,
- offline policy evaluation,
- GRPO-style candidate selection,
- PPO interfaces later.

Exit criteria:

```txt
The project can model agent strategy selection as state/action/reward trajectories without retraining an LLM.
```

PPO implementation is not part of the immediate roadmap.

## Phase Sequence

```txt
PR #21 - docs: add post-20 roadmap and project audit
PR #22 - chore: prepare alpha package readiness
PR #23 - feat: add report bundle output
PR #24 - feat: add CI regression gate example
PR #25 - feat: add RAG evaluation presets
PR #26 - feat: add strategy preset registry
PR #27 - feat: add IgnitionRAG adapter contract
PR #28 - docs: add IgnitionRAG implementation handoff
PR #29 - feat: add policy abstraction layer
PR #30 - feat: add rollout and trajectory recorder
PR #31 - feat: add contextual bandit prototype
PR #32 - feat: add offline policy evaluation
PR #33 - feat: add GRPO-style candidate selection
PR #34 - docs: add RL architecture decision record
PR #35 - feat: add PPO interface skeletons
```

PR #35 must add interfaces only. It must not implement PPO optimization, neural network training, GPU support or model fine-tuning.
