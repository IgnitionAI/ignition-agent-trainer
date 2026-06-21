# Backlog

This backlog is the stable PR sequence for Ignition Agent Trainer. Complete one PR at a time and keep each branch focused on the stated scope.

## Stable PR sequence

### PR #5 - `docs: add autonomous implementation plan`

Current PR.

Goal:

- add implementation plan,
- add PR playbook,
- add backlog,
- add PR template.

No runtime code.

### PR #6 - `chore: align Biome config with installed version`

Goal:

- fix `bun run lint`,
- align Biome config with installed package version,
- add lint to CI only after it works,
- do not change product code.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

### PR #7 - `feat: add experiment result exporters`

Goal:

Add reusable exporters for experiment results.

Suggested package:

```txt
packages/exporters
```

Required exports:

```ts
exportExperimentResult
toJsonReport
toMarkdownReport
```

The exporter should support:

- experiment name,
- dataset size,
- variants,
- leaderboard,
- reward summaries,
- recommendation if provided,
- metadata,
- timestamp.

No filesystem writing yet unless very small and isolated.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Add or update an example if useful.

### PR #8 - `feat: add typed experiment definitions`

Goal:

Make experiments reusable by defining them as typed modules.

Required API:

```ts
defineExperiment()
```

Example:

```ts
export default defineExperiment({
  name: "context-engineering-strategies",
  dataset,
  variants,
  rewards
});
```

This prepares the CLI.

Do not implement the CLI yet.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

### PR #9 - `feat: add CLI experiment runner`

Goal:

Implement a basic CLI command.

Package:

```txt
packages/cli
```

Expected command:

```bash
ignition eval run ./path/to/experiment.ts
```

The CLI should:

- dynamically load a typed experiment definition,
- run it,
- print leaderboard,
- print recommendation if available,
- optionally output JSON/Markdown reports using exporters.

No DB, no remote service.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

Adjust the exact command to fit package scripts.

### PR #10 - `feat: add regression gates`

Goal:

Allow developers to compare current experiment results against a previous baseline.

Required APIs:

```ts
compareExperimentResults()
assertNoRegression()
```

Support:

- minimum score threshold,
- max latency threshold,
- max cost threshold,
- variant-level regression,
- markdown summary.

This is important for CI usage.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

### PR #11 - `feat: add minimal LangChain adapter`

Goal:

Add the first real ecosystem adapter using the callable adapter internally.

Package:

```txt
packages/adapter-langchain
```

Use structural typing where possible.

Support simple LangChain Runnable-like objects:

```ts
{
  invoke(input): Promise<unknown>
}
```

Do not require a hard LangChain dependency unless necessary.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

No real API calls.

### PR #12 - `feat: add minimal LangGraph adapter`

Goal:

Add a LangGraph-style adapter.

Support graph-like objects with an `invoke` method.

Use `@ignitionai/adapter-callable` internally.

No real API calls.

### PR #13 - `feat: add minimal Mastra adapter`

Goal:

Add a Mastra-style adapter.

Use structural typing or optional peer dependency.

No real API calls.

### PR #14 - `feat: add Vercel AI SDK adapter foundation`

Goal:

Add a minimal adapter for Vercel AI SDK-style functions.

No real API calls.

### PR #15 - `feat: add optimization primitives`

Goal:

Start deterministic optimization, not RL.

Required APIs:

```ts
selectBestByObjective()
rankVariants()
suggestNextExperiment()
```

Support objectives:

- quality-first,
- cost-first,
- latency-first,
- balanced.

No prompt mutation yet.

### PR #16 - `feat: add prompt and workflow candidate evaluation`

Goal:

Allow a developer to evaluate multiple prompt/workflow candidates.

Still no LLM-based generation.

The user provides candidates manually.

The framework evaluates and ranks them.

### PR #17 - `feat: add simple search optimization`

Goal:

Add simple deterministic search over parameters.

Example:

```txt
topK: [3, 5, 10]
rerank: [true, false]
verify: [true, false]
```

The framework runs combinations and selects the best.

This is still not RL.

### PR #18 - `docs: add IgnitionRAG integration design`

Goal:

Write the integration design before coding it.

Explain how IgnitionRAG will consume the packages to provide:

- Evaluation Center,
- Experiment Lab,
- Context Engineering Recommendations,
- Regression checks,
- future Agent Trainer.

No IgnitionRAG implementation yet.

### PR #19 - `feat: add file-based experiment history`

Goal:

Add local JSONL or JSON result history.

No database.

This enables comparing previous runs locally and in CI.

### PR #20 - `feat: add bandit strategy prototype`

Goal:

Only after evals, CLI, exporters, configs and regression gates are stable.

Add a simple multi-armed bandit for choosing among strategies.

No PPO.

No GRPO.

No model training.

### Future phase - RL

Only after the above foundation exists.

RL package should eventually support:

- environment,
- action,
- state,
- reward,
- trajectory,
- policy,
- bandits,
- GRPO-style candidate selection,
- PPO later.

RL is not the next milestone.
