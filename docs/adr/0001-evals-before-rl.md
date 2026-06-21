# ADR 0001 — Evals before RL

## Status

Accepted.

## Context

The project is inspired by reinforcement learning for agents, but production users first need to measure and compare behavior.

Building PPO first would require a mature environment, trusted rewards and a large rollout store. Those do not exist at project start.

## Decision

The implementation order is:

```txt
Evals → Experiments → Optimization → Environment → RL
```

## Consequences

Positive:

- Faster MVP.
- No GPU dependency.
- Immediate IgnitionRAG integration.
- Easier enterprise adoption.

Negative:

- The early product is RL-inspired rather than full RL.
- We must communicate clearly that no model weights are updated in v1.

## Notes

The long-term RL path remains valid once the environment abstraction and rewards are stable.
