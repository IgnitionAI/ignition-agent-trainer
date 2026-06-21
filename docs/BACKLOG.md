# Backlog

This backlog is the stable PR sequence for Ignition Agent Trainer. Complete one PR at a time and keep each branch focused on the stated scope.

Status values:

- `completed`: merged into `main`.
- `current`: active PR branch.
- `planned`: not started.

## Stable PR sequence

### PR #5 - `docs: add autonomous implementation plan`

Status:

- completed

Branch:

```txt
docs/autonomous-implementation-plan
```

Goal:

Make the repository self-guiding for future autonomous implementation sessions.

Scope:

- add implementation plan,
- add Codex runbook,
- add PR playbook,
- add Definition of Done,
- add milestones,
- add backlog,
- add PR template,
- link these docs from README.

Out of scope:

- runtime source code,
- package API changes,
- Biome/lint fix,
- product features.

Required APIs / files:

- `docs/IMPLEMENTATION_PLAN.md`,
- `docs/CODEX_RUNBOOK.md`,
- `docs/PR_PLAYBOOK.md`,
- `docs/BACKLOG.md`,
- `docs/DEFINITION_OF_DONE.md`,
- `docs/MILESTONES.md`,
- `.github/pull_request_template.md`,
- `README.md`.

Exact package(s) likely affected:

- none; docs/process only.

Explicit do not implement:

- no runtime package edits,
- no generated build output,
- no lint/tooling migration,
- no new examples.

Expected tests:

- no new tests required because this is docs-only.

Expected docs update:

- all listed docs must link together where useful,
- README must point future sessions to `docs/CODEX_RUNBOOK.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- all required docs/files exist,
- startup protocol is documented,
- strict completion rules are documented,
- every future PR #6 through #20 has scope, out-of-scope, commands and next PR,
- README links to the autonomous implementation docs,
- no runtime source code modified,
- PR #5 remains a draft until reviewed.

Next PR:

- PR #6 - `chore: align Biome config with installed version`

### PR #6 - `chore: align Biome config with installed version`

Status:

- completed

Branch:

```txt
chore/align-biome-config
```

Goal:

Make `bun run lint` work with the installed Biome version and add lint to CI only after it works locally.

Scope:

- inspect current Biome package version and config schema,
- update Biome config to match the installed version,
- update `package.json` scripts only if required,
- add lint to CI after local lint passes,
- document the tooling fix in the PR body.

Out of scope:

- product code changes,
- package API changes,
- formatting unrelated files beyond what Biome requires,
- feature work.

Required APIs / files:

- `biome.json` or equivalent Biome config,
- `package.json`,
- `.github/workflows/ci.yml`,
- docs note only if the lint command changes.

Exact package(s) likely affected:

- root tooling only.

Explicit do not implement:

- no runtime behavior changes,
- no new packages,
- no adapters,
- no exporters,
- no CLI work.

Expected tests:

- no product tests required beyond existing suite,
- capture before/after command behavior for `bun run lint`.

Expected docs update:

- update `docs/PR_PLAYBOOK.md` only if lint status changes from blocked to required.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- `bun run lint` passes locally,
- CI runs lint after install,
- no runtime code changed,
- playbook no longer says lint is blocked or clearly reflects the new status.

Next PR:

- PR #7 - `feat: add experiment result exporters`

### PR #7 - `feat: add experiment result exporters`

Status:

- completed

Branch:

```txt
feat/experiment-result-exporters
```

Goal:

Add reusable exporters for experiment results so local runs and future CLI commands can produce stable JSON and Markdown reports.

Scope:

- create `packages/exporters`,
- define a stable report shape,
- implement JSON and Markdown export helpers,
- add package exports and tests,
- add package README,
- add or update a deterministic example if useful.

Out of scope:

- CLI command implementation,
- filesystem persistence unless very small and isolated,
- regression gates,
- database,
- external APIs.

Required APIs / files:

```ts
toJsonReport()
toMarkdownReport()
exportExperimentResult()
```

The stable report shape must support:

- experiment name,
- dataset size,
- variants,
- leaderboard,
- reward summaries,
- recommendation if provided,
- metadata,
- timestamp.

Exact package(s) likely affected:

- `packages/exporters`,
- root workspace config if needed,
- examples only if a small deterministic exporter example is added.

Explicit do not implement:

- no CLI package work,
- no baseline comparison,
- no live API calls,
- no prompt generation,
- no RL.

Expected tests:

- JSON output includes stable required fields,
- Markdown output includes experiment summary and leaderboard,
- recommendation is included when provided,
- empty leaderboard or missing optional fields are handled deterministically.

Expected docs update:

- `packages/exporters/README.md`,
- README or example docs only if a new example is added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- exporter package builds,
- public exports are available,
- report shape is documented,
- tests cover success and empty/optional cases.

Next PR:

- PR #8 - `feat: add typed experiment definitions`

### PR #8 - `feat: add typed experiment definitions`

Status:

- completed

Branch:

```txt
feat/typed-experiment-definitions
```

Goal:

Make experiments reusable by defining them as typed modules that future CLI commands can load.

Scope:

- add a typed experiment definition API,
- support static experiment config modules,
- prepare examples for CLI loading,
- add tests for valid and invalid definitions,
- update docs.

Out of scope:

- CLI runner,
- dynamic filesystem loading,
- report exporting beyond using existing types,
- database,
- external APIs.

Required APIs / files:

```ts
defineExperiment()
ExperimentDefinition
```

Example target:

```ts
export default defineExperiment({
  name: "context-engineering-strategies",
  dataset,
  variants,
  rewards
});
```

Exact package(s) likely affected:

- `packages/experiments`,
- examples that should expose typed experiment modules.

Explicit do not implement:

- no `ignition eval run` command,
- no file watcher,
- no exporters changes unless integration types require a tiny adjustment,
- no live API calls.

Expected tests:

- valid definition returns a runnable experiment definition,
- invalid or missing fields fail predictably if runtime validation exists,
- type-level coverage where practical,
- example definition compiles.

Expected docs update:

- `packages/experiments/README.md` or equivalent docs,
- relevant example README if an example module is added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- typed definitions can be imported by another module,
- examples compile,
- CLI prerequisites are documented but CLI is not implemented.

Next PR:

- PR #9 - `feat: add CLI experiment runner`

### PR #9 - `feat: add CLI experiment runner`

Status:

- completed

Branch:

```txt
feat/cli-experiment-runner
```

Goal:

Implement a basic local CLI command for running typed experiment files.

Scope:

- create or complete `packages/cli`,
- implement the command `ignition eval run ./path/to/experiment.ts`,
- dynamically load a typed experiment definition,
- run the experiment,
- print leaderboard,
- print recommendation if available,
- optionally output JSON/Markdown reports using exporters,
- add an example experiment file.

Out of scope:

- remote service,
- database,
- auth,
- watch mode,
- hosted dashboard,
- live LLM calls.

Required APIs / files:

- `packages/cli`,
- CLI entrypoint,
- example experiment module,
- integration with `defineExperiment()`,
- integration with `toJsonReport()` and `toMarkdownReport()` when output flags exist.

Exact package(s) likely affected:

- `packages/cli`,
- `examples/context-engineering` or a new deterministic CLI example,
- root package scripts only if needed for local dev.

Explicit do not implement:

- no regression gates,
- no persistent experiment history,
- no SaaS auth,
- no provider keys.

Expected tests:

- command parses valid path,
- command reports missing file clearly,
- command runs a deterministic experiment and prints a leaderboard,
- JSON/Markdown output path behavior if output flags are implemented.

Expected docs update:

- `packages/cli/README.md`,
- root README quick command if stable,
- example README.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

Adjust the exact command only if package scripts require it, and document the final command.

Definition of done:

- CLI runs one typed experiment locally,
- errors are readable,
- exporters are used when report output is requested,
- deterministic example works without external services.

Next PR:

- PR #10 - `feat: add regression gates`

### PR #10 - `feat: add regression gates`

Status:

- completed

Branch:

```txt
feat/regression-gates
```

Goal:

Allow developers to compare current experiment results against a previous baseline and fail CI on meaningful regressions.

Scope:

- implement result comparison,
- implement assertion helper for CI,
- support score, latency and cost thresholds,
- support variant-level regression checks,
- return a Markdown summary,
- add pass/fail tests.

Out of scope:

- file-based history,
- CLI baseline flags unless very small and explicitly in scope,
- database,
- dashboards,
- live APIs.

Required APIs / files:

```ts
compareExperimentResults()
assertNoRegression()
RegressionGateOptions
```

Exact package(s) likely affected:

- `packages/experiments` or a focused package if the existing package boundaries suggest one,
- `packages/exporters` only if Markdown summary reuses exporter utilities.

Explicit do not implement:

- no persistent storage,
- no GitHub check annotations,
- no hosted reporting,
- no RL.

Expected tests:

- pass when current result meets thresholds,
- fail when score drops below threshold,
- fail when latency exceeds threshold,
- fail when cost exceeds threshold,
- deterministic ordering of regression messages.

Expected docs update:

- package README,
- CI usage snippet if stable.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- CI-friendly assertion throws on regression,
- comparison result is inspectable without throwing,
- pass/fail behavior is covered by tests.

Next PR:

- PR #11 - `feat: add minimal LangChain adapter`

### PR #11 - `feat: add minimal LangChain adapter`

Status:

- completed

Branch:

```txt
feat/adapter-langchain-minimal
```

Goal:

Add the first real ecosystem adapter using the callable adapter internally.

Scope:

- add or complete `packages/adapter-langchain`,
- support simple LangChain Runnable-like objects,
- normalize outputs to existing agent adapter shapes,
- use structural typing first,
- add tests with fake objects.

Out of scope:

- hard LangChain dependency unless necessary,
- real provider calls,
- streaming,
- tool trace extraction beyond minimal metadata,
- full LangChain coverage.

Required APIs / files:

Runnable-like support:

```ts
{
  invoke(input): Promise<unknown>
}
```

The adapter must use `@ignitionai/adapter-callable` internally.

Exact package(s) likely affected:

- `packages/adapter-langchain`,
- root workspace config only if package is new.

Explicit do not implement:

- no OpenAI keys,
- no network calls,
- no LangGraph behavior,
- no Mastra behavior.

Expected tests:

- fake Runnable returns text output,
- fake Runnable returns object output,
- thrown errors flow to experiment failure path,
- adapter works inside `createExperiment`.

Expected docs update:

- `packages/adapter-langchain/README.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- adapter wraps a fake Runnable-like object,
- no hard dependency unless justified,
- tests prove integration with experiment runner.

Next PR:

- PR #12 - `feat: add minimal LangGraph adapter`

### PR #12 - `feat: add minimal LangGraph adapter`

Status:

- completed

Branch:

```txt
feat/adapter-langgraph-minimal
```

Goal:

Add a minimal LangGraph-style adapter for graph-like objects.

Scope:

- add or complete `packages/adapter-langgraph`,
- support graph-like objects with an `invoke` method,
- map graph output into the standard adapter output shape,
- use `@ignitionai/adapter-callable` internally,
- add tests with fake graph objects.

Out of scope:

- hard LangGraph dependency unless necessary,
- graph state persistence,
- streaming events,
- real API calls,
- full graph introspection.

Required APIs / files:

- `packages/adapter-langgraph`,
- adapter factory for graph-like objects,
- fake graph tests.

Exact package(s) likely affected:

- `packages/adapter-langgraph`.

Explicit do not implement:

- no LangChain adapter changes except shared typing if unavoidable,
- no Mastra or Vercel AI SDK work,
- no database,
- no network calls.

Expected tests:

- fake graph returns text output,
- fake graph returns structured object output,
- error propagation works,
- adapter works inside `createExperiment`.

Expected docs update:

- `packages/adapter-langgraph/README.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- graph-like object can run in experiments,
- implementation uses callable adapter internally,
- tests are deterministic and mocked.

Next PR:

- PR #13 - `feat: add minimal Mastra adapter`

### PR #13 - `feat: add minimal Mastra adapter`

Status:

- completed

Branch:

```txt
feat/adapter-mastra-minimal
```

Goal:

Add a minimal Mastra-style adapter.

Scope:

- add or complete `packages/adapter-mastra`,
- support Mastra-like agent objects through structural typing,
- normalize text/object outputs,
- use `@ignitionai/adapter-callable` internally,
- add tests with fake Mastra-like objects.

Out of scope:

- hard Mastra dependency unless necessary,
- real model calls,
- tool execution,
- memory/persistence integration,
- full Mastra API coverage.

Required APIs / files:

- `packages/adapter-mastra`,
- adapter factory for Mastra-like generate/run methods,
- fake object tests.

Exact package(s) likely affected:

- `packages/adapter-mastra`.

Explicit do not implement:

- no LangChain/LangGraph changes,
- no Vercel AI SDK work,
- no external API keys,
- no database.

Expected tests:

- fake Mastra-like object returns text,
- fake Mastra-like object returns structured output,
- thrown errors flow to experiment failure path,
- adapter works inside `createExperiment`.

Expected docs update:

- `packages/adapter-mastra/README.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- Mastra-like object can run in experiments without real Mastra dependency,
- tests prove standard failure behavior,
- docs show minimal usage.

Next PR:

- PR #14 - `feat: add Vercel AI SDK adapter foundation`

### PR #14 - `feat: add Vercel AI SDK adapter foundation`

Status:

- completed

Branch:

```txt
feat/adapter-vercel-ai-foundation
```

Goal:

Add a minimal foundation for adapting Vercel AI SDK-style functions.

Scope:

- add or complete `packages/adapter-vercel-ai`,
- support function-style calls that return text or structured output,
- normalize outputs and usage metadata when provided,
- use `@ignitionai/adapter-callable` internally,
- add tests with fake functions.

Out of scope:

- hard Vercel AI SDK dependency unless necessary,
- streaming,
- tool calling integration,
- real provider calls,
- prompt generation.

Required APIs / files:

- `packages/adapter-vercel-ai`,
- adapter factory for Vercel AI SDK-style callables,
- fake function tests.

Exact package(s) likely affected:

- `packages/adapter-vercel-ai`.

Explicit do not implement:

- no network calls,
- no provider-specific auth,
- no UI,
- no LangChain/Mastra changes.

Expected tests:

- fake callable returns text,
- fake callable returns structured data,
- usage metadata is preserved when provided,
- adapter works inside `createExperiment`.

Expected docs update:

- `packages/adapter-vercel-ai/README.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- Vercel AI SDK-style function can run in experiments,
- no real API call is required,
- docs show deterministic fake usage.

Next PR:

- PR #15 - `feat: add optimization primitives`

### PR #15 - `feat: add optimization primitives`

Status:

- completed

Branch:

```txt
feat/optimization-primitives
```

Goal:

Start deterministic optimization primitives, not RL.

Scope:

- add objective-based selection helpers,
- add ranking helpers,
- add next-experiment suggestion helper,
- support quality, cost, latency and balanced objectives,
- add tests for deterministic ordering and tie behavior.

Out of scope:

- RL,
- bandits,
- prompt mutation,
- LLM-generated suggestions,
- external APIs.

Required APIs / files:

```ts
selectBestByObjective()
rankVariants()
suggestNextExperiment()
```

Supported objectives:

- `quality-first`,
- `cost-first`,
- `latency-first`,
- `balanced`.

Exact package(s) likely affected:

- `packages/trainer` or a focused optimization package if the codebase indicates one.

Explicit do not implement:

- no GRPO,
- no PPO,
- no model training,
- no generated prompts,
- no provider calls.

Expected tests:

- objective-specific ranking,
- deterministic tie-breaking,
- missing cost/latency behavior,
- suggestion output for common tradeoffs.

Expected docs update:

- package README,
- example docs if a deterministic example is added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- helper APIs are exported,
- objective behavior is documented,
- deterministic tests cover ordering.

Next PR:

- PR #16 - `feat: add prompt and workflow candidate evaluation`

### PR #16 - `feat: add prompt and workflow candidate evaluation`

Status:

- completed

Branch:

```txt
feat/prompt-workflow-candidate-evaluation
```

Goal:

Allow a developer to evaluate multiple manually supplied prompt or workflow candidates.

Scope:

- define candidate types for prompts/workflows,
- convert candidates into experiment variants,
- rank candidates with existing experiment/reward results,
- keep all candidates user-provided and deterministic,
- add tests and a mocked example if useful.

Out of scope:

- LLM-generated prompts,
- prompt mutation,
- automatic workflow synthesis,
- RL,
- external APIs.

Required APIs / files:

- candidate evaluation helper names should match existing package style,
- integration with `createExperiment`,
- optional example under `examples/`.

Exact package(s) likely affected:

- `packages/trainer` or `packages/experiments`,
- examples if added.

Explicit do not implement:

- no provider keys,
- no live prompt generation,
- no grid search yet,
- no bandits.

Expected tests:

- evaluates two or more prompt candidates,
- evaluates workflow-like candidates,
- preserves deterministic ranking,
- handles empty candidate list.

Expected docs update:

- package README,
- example README if added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- manually provided candidates can be evaluated and ranked,
- no external LLM calls exist,
- docs explain candidate ownership.

Next PR:

- PR #17 - `feat: add simple search optimization`

### PR #17 - `feat: add simple search optimization`

Status:

- completed

Branch:

```txt
feat/simple-search-optimization
```

Goal:

Add deterministic search over parameter combinations for context engineering experiments.

Scope:

- define a small parameter grid API,
- generate combinations deterministically,
- run or prepare variants from combinations,
- select the best result using existing objective helpers,
- add tests for combination order and empty grids.

Out of scope:

- RL,
- bandits,
- Bayesian optimization,
- LLM-generated search spaces,
- external APIs.

Required APIs / files:

Parameter examples:

```txt
topK: [3, 5, 10]
rerank: [true, false]
verify: [true, false]
```

Exact package(s) likely affected:

- `packages/trainer` or a focused optimization package,
- optional deterministic example.

Explicit do not implement:

- no PPO,
- no GRPO,
- no model training,
- no automatic prompt generation,
- no database persistence.

Expected tests:

- deterministic Cartesian product generation,
- stable combination IDs or names,
- empty/single-value grid behavior,
- best-combination selection from mocked results.

Expected docs update:

- package README,
- example README if added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- grid search remains deterministic,
- results can feed existing recommendation helpers,
- docs clearly state this is not RL.

Next PR:

- PR #18 - `docs: add IgnitionRAG integration design`

### PR #18 - `docs: add IgnitionRAG integration design`

Status:

- completed

Branch:

```txt
docs/ignitionrag-integration-design
```

Goal:

Write the IgnitionRAG integration design before coding any SaaS integration.

Scope:

- describe how IgnitionRAG consumes the packages,
- design Evaluation Center,
- design Experiment Lab,
- design Context Engineering Recommendations,
- design regression checks,
- design future Agent Trainer,
- list data contracts and open questions.

Out of scope:

- IgnitionRAG implementation,
- database schema migrations,
- frontend,
- auth,
- billing,
- live provider calls.

Required APIs / files:

- new or updated docs under `docs/`,
- references to existing packages and CLI/exporter/regression gate capabilities.

Exact package(s) likely affected:

- none; docs/design only.

Explicit do not implement:

- no app code,
- no SaaS code,
- no DB tables,
- no UI,
- no API routes.

Expected tests:

- no new tests required because this is docs-only.

Expected docs update:

- integration design doc,
- README link if the design becomes a primary doc.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- integration design names concrete product surfaces,
- contracts and open questions are documented,
- no runtime source code changed.

Next PR:

- PR #19 - `feat: add file-based experiment history`

### PR #19 - `feat: add file-based experiment history`

Status:

- current

Branch:

```txt
feat/file-based-experiment-history
```

Goal:

Add local file-based experiment history for comparing previous runs without a database.

Scope:

- define a local JSON or JSONL history format,
- write experiment results to a local file when requested,
- read previous runs for comparison,
- integrate with exporters/regression gates where appropriate,
- add tests using temporary files.

Out of scope:

- database,
- hosted storage,
- auth,
- dashboard,
- cloud sync.

Required APIs / files:

- file history helper APIs matching existing package style,
- tests with temporary directories/files,
- docs for local usage.

Exact package(s) likely affected:

- `packages/experiments`, `packages/exporters` or a focused history package depending on package boundaries,
- CLI only if a small flag is already available and in scope.

Explicit do not implement:

- no SQLite/Postgres,
- no web UI,
- no remote service,
- no RL.

Expected tests:

- append/write history,
- read history,
- missing history file behavior,
- invalid JSON/JSONL behavior,
- deterministic ordering by timestamp or insertion order.

Expected docs update:

- package README,
- CLI docs if CLI flags are added.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- local result history works without a DB,
- invalid/missing file behavior is tested,
- docs explain path and format.

Next PR:

- PR #20 - `feat: add bandit strategy prototype`

### PR #20 - `feat: add bandit strategy prototype`

Status:

- planned

Branch:

```txt
feat/bandit-strategy-prototype
```

Goal:

Prototype a simple multi-armed bandit for choosing among fixed strategies after the deterministic tooling foundation exists.

Scope:

- add a prototype bandit strategy selector,
- support fixed strategy arms,
- update rewards from observed experiment outcomes,
- keep the API small and clearly experimental,
- add deterministic tests with seeded or fixed behavior.

Out of scope:

- PPO,
- GRPO,
- model training,
- neural policies,
- live traffic routing,
- production SaaS integration.

Required APIs / files:

- package/API location should follow existing `@ignitionai/rl` or trainer boundaries,
- prototype docs must label the feature experimental.

Exact package(s) likely affected:

- `packages/rl` and possibly `packages/trainer` for integration helpers.

Explicit do not implement:

- no PPO,
- no GRPO,
- no base model training,
- no external APIs,
- no online production router.

Expected tests:

- deterministic arm selection with fixed seed or fixed policy,
- reward update behavior,
- handles empty arms,
- handles tied arms.

Expected docs update:

- package README,
- milestone note that RL exploration has begun only as prototype.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- bandit is clearly marked prototype,
- no PPO/GRPO/model training is present,
- deterministic tests cover selection and update behavior.

Next PR:

- Future phase - RL design refinement only after PR #20 is reviewed and the product foundation remains stable.

## Future phase - RL

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
