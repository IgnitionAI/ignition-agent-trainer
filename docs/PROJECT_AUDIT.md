# Project Audit

This audit reflects the repository state after PR #20.

Audit rule:

```txt
A package is not marked stable unless it has package documentation and tests.
If a package exists but is intentionally narrow, minimal or untested, it is partial or prototype.
```

## Current Packages

### `@ignitionai/adapter-callable`

- Purpose: wrap a developer-owned function as an `AgentAdapter`.
- Main exports: `createCallableAdapter`, `CallableAdapterOptions`, `CallableAdapterRun`, `CallableAgentAdapter`.
- Stability level: stable for local deterministic usage.
- Tests present: yes.
- Example present: yes, `examples/callable-adapter`.
- Known limitations: no remote execution, no streaming, no framework-specific behavior.

### `@ignitionai/adapter-langchain`

- Purpose: minimal structural adapter for LangChain Runnable-like objects.
- Main exports: `createLangChainAdapter`, `langChainAdapter`, `LangChainRunnableLike`.
- Stability level: partial.
- Tests present: yes.
- Example present: no dedicated example.
- Known limitations: does not require or inspect LangChain internals, does not stream, does not call providers, and only expects `invoke()`.

### `@ignitionai/adapter-langgraph`

- Purpose: minimal structural adapter for LangGraph-like graph objects.
- Main exports: `createLangGraphAdapter`, `langGraphAdapter`, `LangGraphLike`.
- Stability level: partial.
- Tests present: yes.
- Example present: no dedicated example.
- Known limitations: does not persist graph state, stream events, inspect graph internals or call providers.

### `@ignitionai/adapter-mastra`

- Purpose: minimal structural adapter for Mastra-like agent objects.
- Main exports: `createMastraAdapter`, `mastraAdapter`, `MastraAgentLike`.
- Stability level: partial.
- Tests present: yes.
- Example present: no dedicated example.
- Known limitations: only supports `generate()` or `run()` style objects, no tools, memory, persistence or full Mastra API coverage.

### `@ignitionai/adapter-vercel-ai`

- Purpose: minimal structural adapter for Vercel AI SDK-style generate functions.
- Main exports: `createVercelAiAdapter`, `vercelAiAdapter`, `VercelAiGenerateLike`.
- Stability level: partial.
- Tests present: yes.
- Example present: no dedicated example.
- Known limitations: no real provider calls, no auth, no streaming, no tool integration and no prompt generation.

### `@ignitionai/cli`

- Purpose: run typed experiment modules locally and write JSON/Markdown reports.
- Main exports: `parseCliArgs`, `runCli`, `CliCommand`, `CliEnvironment`.
- Stability level: stable for the current local CLI surface.
- Tests present: yes.
- Example present: yes, `examples/context-engineering/experiment.ts` through the CLI.
- Known limitations: no watch mode, no persistent history flag, no baseline selection flag, no regression-gate command, no remote execution.

### `@ignitionai/core`

- Purpose: shared dataset, adapter, trace, reward, run and experiment result types plus small helpers.
- Main exports: `createDataset`, `createMockAdapter`, `normalizeRunResult`, `toAgentInput`, `clampScore`, `weightedAverage`, shared interfaces.
- Stability level: partial.
- Tests present: no dedicated package tests.
- Example present: yes, used by all current examples.
- Known limitations: no package README, limited direct tests, no schema serialization helpers beyond TypeScript types.

### `@ignitionai/environment`

- Purpose: early state/action/reward/policy environment loop primitives.
- Main exports: `runEpisode`, `AgentEnvironment`, `EnvironmentState`, `EnvironmentAction`, `Policy`, `EpisodeResult`.
- Stability level: prototype.
- Tests present: no.
- Example present: no.
- Known limitations: no README, no tests, no rollout recorder, no production policy evaluation.

### `@ignitionai/evals`

- Purpose: reward functions and trace helpers for scoring agent outputs.
- Main exports: `exactMatch`, `containsAll`, `containsText`, `jsonValidity`, `citationPresence`, `toolUsagePenalty`, `toolCallCountPenalty`, `latencyPenalty`, `costPenalty`, `compositeReward`, `customReward`, trace helpers.
- Stability level: partial.
- Tests present: yes.
- Example present: yes, used by current examples.
- Known limitations: no package README, reward set is small, no RAG-specific preset package yet.

### `@ignitionai/experiments`

- Purpose: run experiments, define typed experiment modules, compare regression gates and store local JSONL history.
- Main exports: `createExperiment`, `defineExperiment`, `compareExperimentResults`, `assertNoRegression`, `appendExperimentHistory`, `readExperimentHistory`, `getLatestExperimentResult`, report helpers.
- Stability level: stable for local deterministic experiments.
- Tests present: yes.
- Example present: yes, `basic-eval`, `callable-adapter` and `context-engineering`.
- Known limitations: no remote execution, no database, no hosted reporting, no first-class report bundle writer yet.

### `@ignitionai/exporters`

- Purpose: convert `ExperimentResult` into stable JSON and Markdown report shapes.
- Main exports: `exportExperimentResult`, `toJsonReport`, `toMarkdownReport`.
- Stability level: stable for current report shape.
- Tests present: yes.
- Example present: partial, used through CLI report output in `examples/context-engineering`.
- Known limitations: does not write files directly, does not bundle artifacts, does not compare baselines.

### `@ignitionai/rl`

- Purpose: experimental RL-inspired utilities and fixed-strategy bandit prototype.
- Main exports: `EpsilonGreedyBandit`, `RandomPolicy`, `ExperimentalBanditStrategySelector`, PPO/GRPO design placeholder interfaces.
- Stability level: prototype.
- Tests present: yes for the strategy bandit prototype.
- Example present: no.
- Known limitations: no PPO, no GRPO, no contextual bandit, no trajectory recorder, no offline policy evaluation, no production routing.

### `@ignitionai/trainer`

- Purpose: deterministic recommendation, ranking, candidate evaluation and grid search helpers.
- Main exports: `recommendVariant`, `selectBestVariant`, `rankVariants`, `selectBestByObjective`, `suggestNextExperiment`, `evaluateCandidates`, `runGridSearch`, `generateParameterCombinations`.
- Stability level: stable for deterministic local optimization helpers.
- Tests present: yes.
- Example present: yes, `basic-eval`, `callable-adapter` and `context-engineering`.
- Known limitations: no generated prompts, no learned routing, no mutation loop, no RL training.

## Current Examples

### `examples/basic-eval`

- Demonstrates: basic dataset, mock adapters, rewards, experiment run and leaderboard.
- Command: `bun run --filter './examples/basic-eval' dev`.
- Mocked or live: mocked.
- Product concept: core evaluation loop.

### `examples/callable-adapter`

- Demonstrates: wrapping two local callable agents, scoring them and recommending a winner.
- Command: `bun run --filter './examples/callable-adapter' dev`.
- Mocked or live: mocked local functions.
- Product concept: user-owned agent function integration.

### `examples/context-engineering`

- Demonstrates: comparing direct answer, basic RAG and verified RAG strategies with the same mocked base model.
- Command: `bun run --filter './examples/context-engineering' dev`.
- CLI command: `bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts`.
- Mocked or live: mocked.
- Product concept: context engineering strategy comparison and CLI-ready typed experiments.

## Current Capabilities Matrix

| Capability | Status | Package/File | Stable? | Notes |
|---|---|---|---|---|
| core primitives | partial | `packages/core` | No | Core types and helpers exist, but package lacks dedicated tests and README. |
| evals/rewards | partial | `packages/evals` | No | Tests exist, README missing, reward set is intentionally small. |
| experiment runner | done | `packages/experiments` | Yes | Local deterministic runner with tests and docs. |
| trainer recommendations | done | `packages/trainer` | Yes | Deterministic recommendation and objective ranking are tested and documented. |
| callable adapter | done | `packages/adapter-callable` | Yes | Tested, documented and covered by an example. |
| context engineering example | done | `examples/context-engineering` | Yes | Mocked strategy comparison plus CLI module. |
| exporters | done | `packages/exporters` | Yes | Stable JSON/Markdown export shape, no file bundle writer yet. |
| typed experiment definitions | done | `packages/experiments/src/definition.ts` | Yes | Used by the CLI example. |
| CLI runner | partial | `packages/cli` | Yes | Current command works; history, baselines and regression gates are not CLI flags yet. |
| regression gates | done | `packages/experiments/src/regression-gates.ts` | Yes | Tested comparison helpers, not yet shown in a CI example. |
| ecosystem adapters | partial | `packages/adapter-*` | No | Structural adapters exist with tests/docs, but dedicated examples and deeper framework coverage are missing. |
| simple search optimization | done | `packages/trainer/src/search.ts` | Yes | Deterministic grid search over manual parameter grids. |
| IgnitionRAG design | done | `docs/10-ignitionrag-integration-design.md` | Yes | Design-only; no IgnitionRAG runtime integration. |
| file-based history | done | `packages/experiments/src/history.ts` | Yes | JSONL local history helpers, no CLI flag yet. |
| bandit prototype | prototype | `packages/rl/src/strategy-bandit.ts` | No | Clearly experimental, fixed arms only, no contextual policy or PPO. |

## Current Limitations

- No frontend.
- No database.
- No SaaS runtime.
- No real LLM calls by default.
- No hosted IgnitionRAG integration code.
- IgnitionRAG integration is design-only.
- Core, evals and environment need stronger package documentation.
- Ecosystem adapters are minimal and structural.
- CLI does not yet support history, baseline selection or fail-on-regression flags.
- Report output is split across JSON/Markdown helpers, but no report bundle artifact exists yet.
- Bandit support is prototype-only.
- No contextual bandits.
- No rollout or trajectory recorder.
- No offline policy evaluation.
- No GRPO implementation.
- No PPO implementation.
- No model training.
