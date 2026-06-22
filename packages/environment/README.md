# @ignitionai/environment

Prototype state/action/reward environment loop primitives for future policy work.

Use this package only when experimenting with agent strategy environments. It is not a production RL runtime.

## Current API

```ts
import { runEpisode } from "@ignitionai/environment";
```

Main exports:

- environment types: `AgentEnvironment`, `EnvironmentState`, `EnvironmentAction`, `EnvironmentStepResult`,
- policy type: `Policy`,
- episode types: `EpisodeStep`, `EpisodeResult`,
- runner helper: `runEpisode`.

## Alpha Readiness Status

This package is prototype-level.

Known gaps:

- no dedicated tests,
- no example,
- no trajectory recorder,
- no policy evaluation tooling,
- no production environment implementation.

## Non-goals

This package does not implement PPO, GRPO, contextual bandits, model training, production routing or external tracing.
