# Autonomous implementation plan

## Project thesis

Ignition Agent Trainer is an evaluation, experimentation and optimization layer for TypeScript AI agents.

It does not replace LangChain, LangGraph, Mastra or the Vercel AI SDK. It wraps agents and workflows that developers already have, normalizes their inputs and outputs, and makes their behavior measurable, comparable and improvable.

The product helps developers:

- measure agent quality,
- compare context and workflow strategies,
- recommend the best strategy,
- export results,
- run experiments from a CLI,
- later optimize prompts and workflows,
- much later add RL policy optimization.

The first useful product is not a model trainer. It is a reliable loop for measuring and improving agent behavior with deterministic experiments.

## Current state

Completed:

- core primitives,
- evals and rewards,
- experiment runner,
- basic eval example,
- context engineering example,
- trainer recommendations,
- generic callable adapter.

These foundations prove that a TypeScript project can define datasets, wrap agent variants, score runs, aggregate results, and recommend a stronger strategy without depending on a specific agent framework.

## Current product loop

```txt
Dataset
-> Agent variants
-> Rewards
-> Experiment runner
-> Leaderboard
-> Recommendation
```

This loop is the center of the project. Every new package should either make the loop easier to run, easier to integrate, easier to report, safer to use in CI, or easier to connect to existing TypeScript agent frameworks.

## Core product thesis

```txt
We improve agents without retraining the LLM.
We optimize context, tools, retrieval, prompts, workflow and verification strategy.
```

The near-term optimization surface is context engineering:

- prompt variants,
- retrieval parameters,
- reranking choices,
- tool selection,
- tool order,
- verification steps,
- workflow routing,
- stop conditions.

Rewards provide the reinforcement signal, but the first versions should remain deterministic and easy to inspect. Bandits, GRPO and PPO come only after the experiment loop, reports, CLI, adapters and regression gates are stable.

## Explicitly out of scope for now

- frontend,
- database,
- auth,
- billing,
- real SaaS,
- PPO,
- GRPO,
- bandits before PR #20,
- real LLM API calls,
- full LangChain or Mastra integrations before generic developer experience is stable.

## Implementation order

The project should move in small PRs that compound:

1. Stabilize project workflow docs.
2. Fix lint/tooling separately.
3. Export experiment results.
4. Define typed reusable experiments.
5. Add a CLI runner.
6. Add regression gates.
7. Add minimal ecosystem adapters.
8. Add deterministic optimization primitives.
9. Add local experiment history.
10. Prototype bandits.
11. Defer RL until the product foundation is useful without it.

## Operating system for future Codex sessions

Future implementation sessions should treat these files as the source of truth:

- [CODEX_RUNBOOK.md](./CODEX_RUNBOOK.md) - startup protocol, continuation prompt, report format and blocker handling.
- [PR_PLAYBOOK.md](./PR_PLAYBOOK.md) - PR workflow, scope control, public API, tests, examples and CI rules.
- [BACKLOG.md](./BACKLOG.md) - exact PR sequence, branch names, scope, out-of-scope rules, acceptance and next PR.
- [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) - strict completion criteria for docs, runtime and tooling PRs.
- [MILESTONES.md](./MILESTONES.md) - product milestones and exit criteria.

Codex must implement only the next uncompleted PR from [BACKLOG.md](./BACKLOG.md), unless the user explicitly asks otherwise. It must not skip PRs, combine PRs, silently shrink scope, or mark completion unless every acceptance criterion is satisfied or explicitly documented as impossible.
