# Project Audit

This audit reflects the repository state through the current post-#20 roadmap work.

PR #22 added missing package READMEs and package manifest metadata. Stability labels still depend on tests, examples and implementation maturity.

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

### `@ignitionai/adapter-ignitionrag`

- Purpose: define the package-level contract IgnitionRAG can implement to call Ignition Agent Trainer.
- Main exports: `IgnitionRagCollectionReference`, `IgnitionRagWorkflowReference`, `IgnitionRagAgentReference`, `IgnitionRagExperimentExecutionRequest`, `IgnitionRagExperimentExecutionResult`, `IgnitionRagAdapterContract`.
- Stability level: partial.
- Tests present: yes.
- Example present: yes, package README shows the boundary.
- Known limitations: type-level contract only; no IgnitionRAG runtime, database, auth, billing or frontend integration.

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

- Purpose: run typed experiment modules locally and write JSON/Markdown reports or report bundles.
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
- Known limitations: no dedicated package tests, no schema serialization helpers beyond TypeScript types.

### `@ignitionai/environment`

- Purpose: early state/action/reward/policy environment loop primitives.
- Main exports: `runEpisode`, `AgentEnvironment`, `EnvironmentState`, `EnvironmentAction`, `Policy`, `EpisodeResult`.
- Stability level: prototype.
- Tests present: no.
- Example present: no.
- Known limitations: no tests, no rollout recorder, no production policy evaluation.

### `@ignitionai/evals`

- Purpose: reward functions and trace helpers for scoring agent outputs.
- Main exports: `exactMatch`, `containsAll`, `containsText`, `jsonValidity`, `citationPresence`, `toolUsagePenalty`, `toolCallCountPenalty`, `latencyPenalty`, `costPenalty`, `compositeReward`, `customReward`, trace helpers.
- Stability level: partial.
- Tests present: yes.
- Example present: yes, used by current examples.
- Known limitations: reward set is intentionally small; RAG presets live in `@ignitionai/preset-rag`.

### `@ignitionai/experiments`

- Purpose: run experiments, define typed experiment modules, compare regression gates and store local JSONL history.
- Main exports: `createExperiment`, `defineExperiment`, `compareExperimentResults`, `assertNoRegression`, `appendExperimentHistory`, `readExperimentHistory`, `getLatestExperimentResult`, report helpers.
- Stability level: stable for local deterministic experiments.
- Tests present: yes.
- Example present: yes, `basic-eval`, `callable-adapter` and `context-engineering`.
- Known limitations: no remote execution, no database, no hosted reporting.

### `@ignitionai/exporters`

- Purpose: convert `ExperimentResult` into stable JSON and Markdown report shapes and local report bundles.
- Main exports: `exportExperimentResult`, `toJsonReport`, `toMarkdownReport`, `writeReportBundle`.
- Stability level: stable for current report shape.
- Tests present: yes.
- Example present: partial, used through CLI report output in `examples/context-engineering`.
- Known limitations: does not compare baselines, store reports remotely or create hosted report surfaces.

### `@ignitionai/preset-rag`

- Purpose: compose existing deterministic rewards into reusable RAG and agentic RAG presets.
- Main exports: `citationQualityPreset`, `ragQualityPreset`, `agenticRagPreset`.
- Stability level: partial.
- Tests present: yes.
- Example present: yes, documented mocked usage in package README.
- Known limitations: no live retrieval, vector database integration, document ingestion or model-graded scoring.

### `@ignitionai/preset-strategies`

- Purpose: register reusable deterministic context/workflow strategy presets.
- Main exports: `defineStrategyPreset`, `createStrategyRegistry`, `getStrategyPreset`, `listStrategyPresets`.
- Stability level: partial.
- Tests present: yes.
- Example present: yes, documented variant creation in package README.
- Known limitations: no real retrieval, reranking, provider calls, persistence or hosted registry.

### `@ignitionai/rl`

- Purpose: experimental RL-inspired utilities, deterministic policy selection helpers, fixed-strategy/contextual bandit prototypes, offline policy evaluation, GRPO-style candidate selection and PPO interface skeletons.
- Main exports: `Policy`, `PolicyContext`, `PolicyDecision`, `createStaticPolicy`, `createScoreBasedPolicy`, `Trajectory`, `TrajectoryStep`, `recordTrajectory`, `summarizeTrajectory`, `EpsilonGreedyBandit`, `RandomPolicy`, `ExperimentalBanditStrategySelector`, `ContextualBanditStrategySelector`, `ContextFeatures`, `scoreContextMatch`, `evaluatePolicyOffline`, `PolicyEvaluationResult`, `selectGroupRelativeBest`, `rankCandidateGroup`, `GroupRelativeSelectionResult`, `PPOConfig`, `PPOTrainer`, `PPOTrainingBatch`, `PPOTrainingResult`, `UnimplementedPPOTrainer`, `createUnimplementedPPOTrainer`.
- Stability level: prototype.
- Tests present: yes for policy helpers, trajectories, fixed-strategy bandit, contextual bandit, offline policy evaluation, GRPO-style selection and PPO skeletons.
- Example present: no.
- Known limitations: no PPO optimization, no GRPO model training, no production routing.

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

### `examples/ci-regression-gate`

- Demonstrates: comparing a current experiment result against a committed baseline in CI.
- Command: `bun run --filter './examples/ci-regression-gate' dev`.
- Mocked or live: mocked.
- Product concept: CI regression gates with pass/fail behavior and report bundle artifact export.

## Current Capabilities Matrix

| Capability | Status | Package/File | Stable? | Notes |
|---|---|---|---|---|
| core primitives | partial | `packages/core` | No | Core types and helpers exist, but package lacks dedicated tests. |
| IgnitionRAG adapter contract | partial | `packages/adapter-ignitionrag` | No | Type-level contract only; no runtime IgnitionRAG integration. |
| evals/rewards | partial | `packages/evals` | No | Tests and README exist, but reward set is intentionally small. |
| RAG presets | partial | `packages/preset-rag` | No | Deterministic presets compose text, citation, latency, cost and tool-use rewards. |
| strategy presets | partial | `packages/preset-strategies` | No | Deterministic registry maps strategy presets to mocked experiment variants. |
| experiment runner | done | `packages/experiments` | Yes | Local deterministic runner with tests and docs. |
| trainer recommendations | done | `packages/trainer` | Yes | Deterministic recommendation and objective ranking are tested and documented. |
| callable adapter | done | `packages/adapter-callable` | Yes | Tested, documented and covered by an example. |
| context engineering example | done | `examples/context-engineering` | Yes | Mocked strategy comparison plus CLI module. |
| exporters | done | `packages/exporters` | Yes | Stable JSON/Markdown export shape and local report bundle writer. |
| typed experiment definitions | done | `packages/experiments/src/definition.ts` | Yes | Used by the CLI example. |
| CLI runner | partial | `packages/cli` | Yes | Current command works; history, baselines and regression gates are not CLI flags yet. |
| regression gates | done | `packages/experiments/src/regression-gates.ts` | Yes | Tested comparison helpers plus a copyable CI example. |
| ecosystem adapters | partial | `packages/adapter-*` | No | Structural adapters exist with tests/docs, but dedicated examples and deeper framework coverage are missing. |
| simple search optimization | done | `packages/trainer/src/search.ts` | Yes | Deterministic grid search over manual parameter grids. |
| IgnitionRAG design | done | `docs/10-ignitionrag-integration-design.md` | Yes | Design-only; no IgnitionRAG runtime integration. |
| file-based history | done | `packages/experiments/src/history.ts` | Yes | JSONL local history helpers, no CLI flag yet. |
| policy abstraction | partial | `packages/rl/src/policy.ts` | No | Deterministic static and score-based selection only; no training loop. |
| trajectory recorder | partial | `packages/rl/src/trajectory.ts` | No | Local state/action/reward/outcome records with deterministic summaries. |
| bandit prototype | prototype | `packages/rl/src/strategy-bandit.ts` | No | Clearly experimental, fixed arms only, no PPO. |
| contextual bandit prototype | prototype | `packages/rl/src/contextual-bandit.ts` | No | Deterministic fixed-feature scoring over task type, citation need, cost sensitivity, latency sensitivity and risk level. |
| offline policy evaluation | prototype | `packages/rl/src/offline-policy-evaluation.ts` | No | Deterministic replay over local records or observed trajectory steps; no live traffic path. |
| GRPO-style selection | prototype | `packages/rl/src/group-relative-selection.ts` | No | Group-relative ranking for fixed prompt/workflow/strategy candidates; no gradient training. |
| PPO interface skeletons | prototype | `packages/rl/src/ppo.ts` | No | Type boundary and throwing placeholder only; no PPO optimization algorithm. |

## Current Limitations

- No frontend.
- No database.
- No SaaS runtime.
- No real LLM calls by default.
- No hosted IgnitionRAG integration code.
- IgnitionRAG integration is design-only.
- Core and environment need dedicated tests before alpha-stable status.
- Ecosystem adapters are minimal and structural.
- CLI does not yet support history, baseline selection or fail-on-regression flags.
- Bandit support is prototype-only.
- No GRPO model training.
- No PPO optimization implementation.
- No model training.
