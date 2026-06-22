# ADR 0003 — RL foundation sequence for agent context engineering

## Status

Accepted.

## Context

Ignition Agent Trainer uses reinforcement-learning language because agent improvement can be modeled as state, action, reward, policy and trajectory data.

That does not mean the project should start with neural policy training. The useful product loop is still:

```txt
Dataset -> variants -> rewards -> experiment -> leaderboard -> recommendation
```

The existing concept doc, [RL concepts for AI agents](../03-rl-concepts-for-agents.md), maps classical RL terms to agentic workflows. [ADR 0001](./0001-evals-before-rl.md) already decides that evals and experiments come before RL algorithms.

PRs #29 through #33 added the first RL-inspired foundation:

- policy selection abstractions,
- trajectory records,
- contextual bandit scoring,
- offline policy evaluation,
- GRPO-style group-relative candidate selection.

This ADR fixes the architecture boundary before adding any PPO-facing types.

## Decision

RL concepts map to agent context engineering as follows:

| RL concept | Ignition Agent Trainer meaning |
|---|---|
| State | JSON-compatible task context, retrieved context, trace state, cost so far, latency so far and risk/citation requirements. |
| Action | A fixed strategy, workflow, prompt candidate, tool choice, retrieval setting or next orchestration step. |
| Reward | Deterministic score from `@ignitionai/evals`, experiment summaries, cost/latency penalties and domain-specific metrics. |
| Policy | A deterministic selector that chooses among fixed candidates or actions. |
| Trajectory | Local state/action/reward/outcome records from one or more decisions. |
| Environment | The agent runtime, tools, dataset cases and reward rules used to produce observations and rewards. |
| Bandit | A lightweight selector over fixed strategy arms. |
| GRPO-style selection | Group-relative ranking of fixed prompt, workflow or strategy candidates. |
| PPO | Future interface boundary only until environments, rewards and rollout data are mature. |

The implementation sequence is:

```txt
1. Evals and experiments
2. Deterministic optimization
3. Policy and trajectory records
4. Fixed-strategy and contextual bandits
5. Offline policy evaluation
6. GRPO-style candidate selection without weight updates
7. PPO interfaces only
8. PPO implementation later, if the data and environment justify it
```

## Boundaries

Near-term RL package code may:

- rank fixed candidates,
- select among fixed strategies,
- record local trajectories,
- evaluate policies offline,
- define future-facing interfaces.

Near-term RL package code must not:

- update model weights,
- compute gradients,
- require GPU runtimes,
- route live production traffic,
- mutate prompts or workflows automatically,
- claim to implement PPO or full GRPO training.

## Consequences

Positive:

- Keeps the alpha product useful without a training stack.
- Preserves deterministic behavior in tests and CI.
- Makes the IgnitionRAG integration easier because outputs are regular experiment artifacts.
- Creates a type path toward PPO without committing to premature algorithm work.

Negative:

- The RL package remains prototype-level.
- Users may expect "GRPO" or "PPO" to mean model training, so docs must keep saying selection-only or interface-only where appropriate.
- Future training work will need a stronger environment contract and durable rollout store.

## PPO deferral rule

PPO can move beyond interfaces only when all of the following are true:

- environment state and action spaces are stable,
- reward functions are trusted enough for optimization,
- trajectory storage is durable and queryable,
- offline policy evaluation covers historical data,
- production routing and safety constraints are explicitly designed.

Until then, PPO belongs in skeleton interfaces and documentation only.
