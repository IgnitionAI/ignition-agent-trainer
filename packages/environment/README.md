# @ignitionai/agent-trainer-environment

State/action/reward environment loop primitives for future policy work.

Use this package when modeling deterministic agent strategy episodes before deeper RL or policy optimization. It is not a production RL runtime and it does not train models.

## Current API

```ts
import { defineEnvironmentEpisode, runEpisode } from "@ignitionai/agent-trainer-environment";
```

Main exports:

- environment types: `AgentEnvironment`, `EnvironmentState`, `EnvironmentAction`, `EnvironmentStepResult`,
- policy type: `Policy`,
- episode types: `EpisodeStep`, `EpisodeResult`,
- runner helper: `runEpisode`,
- reusable module helper: `defineEnvironmentEpisode`.

`runEpisode(environment, policy, options)` supports:

- `seed` passed to `environment.reset(seed)`,
- `maxSteps` safety guard,
- `policyId` and `metadata` copied onto the episode result.

Episode steps include the previous state, action, next state, reward, done flag and optional step metadata. The result includes total reward, average reward and final state.

## Example

```ts
const episode = await runEpisode(environment, policy, {
  seed: 7,
  maxSteps: 10,
  policyId: "scripted-rag-policy",
});
```

See `examples/rag-environment-episode` for a full deterministic sequence:

```txt
search -> rerank -> verify -> answer
```

That example records an episode trajectory through `@ignitionai/agent-trainer-rl` and converts it into offline policy records.

Episode modules can be exported for the CLI:

```ts
export default defineEnvironmentEpisode({
  name: "rag-environment-episode",
  environment: () => environment,
  policy: () => policy,
  options: {
    seed: 7,
    maxSteps: 10,
    policyId: "scripted-rag-policy",
  },
});
```

## Alpha Readiness Status

This package is partial alpha-level.

Known gaps:

- no production environment implementation,
- no durable rollout store,
- no automatic policy optimization loop,
- CLI integration is local-only and loads deterministic episode modules.

## Non-goals

This package does not implement PPO, GRPO, contextual bandits, model training, production routing or external tracing.
