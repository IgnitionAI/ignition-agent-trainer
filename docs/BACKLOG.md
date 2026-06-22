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

- completed

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

- completed

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

## Post-#20 backlog

### PR #21 - `docs: add post-20 roadmap and project audit`

Status:

- completed

Branch:

```txt
docs/post-20-roadmap
```

Goal:

Audit current repo state and define the post-#20 roadmap.

Scope:

- add `docs/PROJECT_AUDIT.md`,
- add `docs/POST_20_ROADMAP.md`,
- update backlog, milestones, runbook and README,
- distinguish done, partial, prototype and missing capabilities.

Out of scope:

- runtime code,
- new features,
- tooling changes,
- RL implementation.

Required APIs / files:

- `docs/PROJECT_AUDIT.md`,
- `docs/POST_20_ROADMAP.md`,
- `docs/BACKLOG.md`,
- `docs/MILESTONES.md`,
- `docs/CODEX_RUNBOOK.md`,
- `README.md`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- current packages and examples are audited from repository contents,
- post-#20 phases are documented,
- backlog #21 through #35 is defined,
- runbook warns not to jump directly to PPO.

Next PR:

- PR #22 - `chore: prepare alpha package readiness`

### PR #22 - `chore: prepare alpha package readiness`

Status:

- completed

Branch:

```txt
chore/alpha-package-readiness
```

Goal:

Prepare packages for an eventual alpha release.

Scope:

- verify package names,
- verify exports,
- verify package README files,
- verify build outputs,
- add package metadata where missing,
- add alpha readiness checklist.

Out of scope:

- publishing to npm,
- runtime feature changes,
- API redesign.

Required APIs / files:

- package manifests,
- package README files,
- alpha readiness checklist under `docs/`.

Acceptance:

```bash
bun install
bun run typecheck
bun run test
bun run build
```

Definition of done:

- every package has clear readiness status,
- missing package docs/metadata are documented or fixed in scope,
- no runtime behavior changes are introduced.

Next PR:

- PR #23 - `feat: add report bundle output`

### PR #23 - `feat: add report bundle output`

Status:

- completed

Branch:

```txt
feat/report-bundle-output
```

Goal:

Bundle experiment outputs into a local report artifact.

Scope:

- JSON report,
- Markdown report,
- optional metadata file,
- timestamped local output folder,
- use existing exporters/history if available,
- add one example or CLI usage if the CLI is the right integration point.

Out of scope:

- database,
- remote storage,
- dashboard,
- SaaS report UI.

Required APIs / files:

```ts
writeReportBundle()
ReportBundleOptions
ReportBundleResult
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- a local report bundle can be written deterministically,
- bundle output is tested with temporary files,
- docs explain path structure and generated files.

Next PR:

- PR #24 - `feat: add CI regression gate example`

### PR #24 - `feat: add CI regression gate example`

Status:

- completed

Branch:

```txt
feat/ci-regression-gate-example
```

Goal:

Show how to use regression gates in GitHub Actions.

Scope:

- example workflow,
- sample baseline,
- sample experiment command,
- docs explaining pass/fail behavior.

Out of scope:

- changing real project CI behavior unless explicitly isolated,
- database,
- remote reporting.

Required APIs / files:

- example GitHub Actions workflow or documented sample,
- sample baseline fixture,
- docs for regression gate behavior.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- a developer can copy the example into CI,
- pass and fail behavior is documented,
- no production CI behavior is changed accidentally.

Next PR:

- PR #25 - `feat: add RAG evaluation presets`

### PR #25 - `feat: add RAG evaluation presets`

Status:

- completed

Branch:

```txt
feat/rag-evaluation-presets
```

Goal:

Provide reusable evaluation presets for RAG and agentic RAG.

Scope:

- create a focused preset package if appropriate,
- compose existing rewards/metrics,
- document mocked RAG usage,
- add tests for preset composition.

Out of scope:

- real vector DB integration,
- real document ingestion,
- real LLM calls,
- IgnitionRAG runtime integration.

Required APIs / files:

```ts
ragQualityPreset()
citationQualityPreset()
agenticRagPreset()
```

Suggested package:

```txt
packages/preset-rag
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- presets compose existing reward functions,
- mocked usage is documented,
- no live RAG infrastructure is required.

Next PR:

- PR #26 - `feat: add strategy preset registry`

### PR #26 - `feat: add strategy preset registry`

Status:

- completed

Branch:

```txt
feat/strategy-preset-registry
```

Goal:

Create a registry for reusable context/workflow strategies.

Scope:

- define strategy preset types,
- implement a small registry,
- add built-in mocked strategy definitions,
- add tests for lookup/listing behavior.

Out of scope:

- real retrieval,
- real reranking,
- real LLM calls,
- SaaS UI.

Required APIs / files:

```ts
defineStrategyPreset()
createStrategyRegistry()
getStrategyPreset()
listStrategyPresets()
```

Example strategies:

- `direct-answer`,
- `rag-basic`,
- `rag-rerank`,
- `rag-with-verification`.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- strategy presets are deterministic and reusable,
- registry behavior is tested,
- docs explain how presets map to experiment variants.

Next PR:

- PR #27 - `feat: add IgnitionRAG adapter contract`

### PR #27 - `feat: add IgnitionRAG adapter contract`

Status:

- completed

Branch:

```txt
feat/ignitionrag-adapter-contract
```

Goal:

Define the package-level contract IgnitionRAG will use to call Ignition Agent Trainer.

Scope:

- TypeScript interfaces only or mostly interfaces,
- collection reference,
- workflow reference,
- agent reference,
- experiment execution request,
- report result.

Out of scope:

- actual IgnitionRAG repo changes,
- database integration,
- auth,
- billing,
- frontend.

Required APIs / files:

- suggested package: `packages/adapter-ignitionrag`,
- IgnitionRAG collection/workflow/agent reference interfaces,
- experiment request/result interfaces.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- contract compiles without IgnitionRAG runtime code,
- docs explain the boundary,
- tests or type-level assertions cover the main shapes.

Next PR:

- PR #28 - `docs: add IgnitionRAG implementation handoff`

### PR #28 - `docs: add IgnitionRAG implementation handoff`

Status:

- completed

Branch:

```txt
docs/ignitionrag-implementation-handoff
```

Goal:

Turn the existing IgnitionRAG design into an implementation handoff.

Scope:

- packages to consume,
- API boundary,
- first IgnitionRAG feature: Evaluation Center,
- second feature: Experiment Lab,
- third feature: Context Engineering Recommendations,
- data model suggestions,
- rollout order.

Out of scope:

- runtime code,
- SaaS implementation,
- database migrations,
- UI code.

Required APIs / files:

- implementation handoff doc under `docs/`,
- links to existing IgnitionRAG design docs.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- handoff names concrete packages and boundaries,
- rollout order is clear,
- no runtime source changes are included.

Next PR:

- PR #29 - `feat: add policy abstraction layer`

### PR #29 - `feat: add policy abstraction layer`

Status:

- completed

Branch:

```txt
feat/policy-abstraction-layer
```

Goal:

Represent strategy selection as a policy without implementing deep RL.

Scope:

- define policy context and decision types,
- add static policy helper,
- add score-based policy helper,
- add deterministic tests.

Out of scope:

- PPO,
- GRPO,
- model training,
- neural network policy.

Required APIs / files:

```ts
Policy
PolicyContext
PolicyDecision
createStaticPolicy()
createScoreBasedPolicy()
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- policy abstractions are deterministic and tested,
- no deep RL training loop is introduced,
- docs distinguish policy selection from model training.

Next PR:

- PR #30 - `feat: add rollout and trajectory recorder`

### PR #30 - `feat: add rollout and trajectory recorder`

Status:

- completed

Branch:

```txt
feat/trajectory-recorder
```

Goal:

Record agent decisions, actions, rewards and outcomes as trajectories.

Scope:

- define trajectory and step types,
- implement recorder helper,
- implement summarizer helper,
- add deterministic tests.

Out of scope:

- PPO,
- GRPO,
- training loop,
- external tracing service.

Required APIs / files:

```ts
Trajectory
TrajectoryStep
recordTrajectory()
summarizeTrajectory()
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- trajectories can represent state/action/reward records,
- summaries are deterministic,
- no external tracing service is required.

Next PR:

- PR #31 - `feat: add contextual bandit prototype`

### PR #31 - `feat: add contextual bandit prototype`

Status:

- completed

Branch:

```txt
feat/contextual-bandit-prototype
```

Goal:

Extend the simple bandit idea to use context features.

Scope:

- define context feature shape,
- extend fixed strategy arm selection with context,
- keep behavior deterministic in tests,
- document prototype status.

Out of scope:

- PPO,
- GRPO,
- deep learning,
- model fine-tuning.

Required APIs / files:

- contextual bandit prototype APIs under `@ignitionai/rl`,
- examples of task type, citation need, cost sensitivity, latency sensitivity and risk level features.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- contextual selection works over fixed features,
- empty/tied behavior is tested,
- docs clearly label the feature prototype.

Next PR:

- PR #32 - `feat: add offline policy evaluation`

### PR #32 - `feat: add offline policy evaluation`

Status:

- completed

Branch:

```txt
feat/offline-policy-evaluation
```

Goal:

Evaluate a policy against recorded experiment history or trajectories.

Scope:

- define offline policy evaluation result shape,
- evaluate a policy against local records,
- support deterministic summaries,
- add tests with mocked history or trajectories.

Out of scope:

- online learning,
- live traffic routing,
- production serving.

Required APIs / files:

```ts
evaluatePolicyOffline()
PolicyEvaluationResult
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- offline evaluation consumes recorded data,
- deterministic tests cover ranking/summary behavior,
- no live traffic path exists.

Next PR:

- PR #33 - `feat: add GRPO-style candidate selection`

### PR #33 - `feat: add GRPO-style candidate selection`

Status:

- completed

Branch:

```txt
feat/grpo-style-candidate-selection
```

Goal:

Prototype group-relative candidate selection for prompts/workflows/strategies.

Scope:

- rank candidate groups relative to each other,
- select group-relative best candidates,
- document that this is selection only,
- add deterministic tests.

Out of scope:

- LLM weight updates,
- gradient training,
- PPO,
- real GRPO trainer,
- GPU training.

Required APIs / files:

```ts
selectGroupRelativeBest()
rankCandidateGroup()
GroupRelativeSelectionResult
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- candidate groups can be ranked deterministically,
- docs state this is not GRPO model training,
- no gradient or GPU training code exists.

Next PR:

- PR #34 - `docs: add RL architecture decision record`

### PR #34 - `docs: add RL architecture decision record`

Status:

- completed

Branch:

```txt
docs/rl-architecture-decision-record
```

Goal:

Document how RL concepts map to agent context engineering.

Scope:

- state,
- action,
- reward,
- policy,
- trajectory,
- environment,
- bandits,
- GRPO-style selection,
- PPO later.

Out of scope:

- runtime implementation,
- PPO implementation,
- GRPO implementation.

Required APIs / files:

- ADR under `docs/adr/` or a dedicated docs file,
- links to existing RL concept docs.

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- ADR explains the design sequence,
- PPO is explicitly deferred,
- no runtime source changes are included.

Next PR:

- PR #35 - `feat: add PPO interface skeletons`

### PR #35 - `feat: add PPO interface skeletons`

Status:

- completed

Branch:

```txt
feat/ppo-interface-skeletons
```

Goal:

Add type-level skeletons for PPO without implementing the algorithm.

Scope:

- define PPO config and batch types,
- define trainer interface or a throwing skeleton,
- document non-implementation status,
- add tests that prove calls fail clearly if a concrete class is present.

Out of scope:

- actual PPO optimization,
- neural network training,
- GPU support,
- model fine-tuning.

Required APIs / files:

```ts
PPOConfig
PPOTrainer
PPOTrainingBatch
PPOTrainingResult
```

Acceptance:

```bash
bun run typecheck
bun run test
bun run build
```

Definition of done:

- PPO interfaces compile,
- no PPO algorithm exists,
- docs clearly state this is a skeleton only.

Next PR:

- Future phase - only after alpha readiness, IgnitionRAG bridge and policy foundations are reviewed.

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

## Alpha validation sequence

### PR #36 - `docs: add alpha validation plan`

Status:

- completed

Branch:

```txt
docs/alpha-validation-plan
```

Goal:

Define the realistic alpha validation plan before adding more runtime features.

Scope:

- add `docs/ALPHA_VALIDATION_PLAN.md`,
- define the alpha objective,
- define the IgnitionRAG-style document assistant scenario,
- define dataset, variants, rewards, expected outputs, CLI shape and regression threshold,
- define alpha usability criteria,
- update docs links and future backlog sequence.

Out of scope:

- runtime source code,
- public API changes,
- new package APIs,
- frontend,
- database,
- real provider calls,
- PPO implementation,
- GRPO training,
- model fine-tuning.

Required APIs / files:

- `docs/ALPHA_VALIDATION_PLAN.md`,
- `docs/BACKLOG.md`,
- `docs/MILESTONES.md`,
- `docs/CODEX_RUNBOOK.md`,
- `README.md`.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- alpha plan answers the nine required validation questions,
- PR #37 through #40 are scoped with goal, scope, out of scope, acceptance commands and definition of done,
- docs make clear this is not PPO, GRPO training, SaaS integration or live provider work,
- no runtime source code is modified.

Next PR:

- PR #37 - `feat: add alpha dogfood experiment`

### PR #37 - `feat: add alpha dogfood experiment`

Status:

- completed

Branch:

```txt
feat/alpha-dogfood-experiment
```

Goal:

Add the runnable alpha dogfood experiment for an IgnitionRAG-style document assistant.

Scope:

- add `examples/alpha-dogfood`,
- create a 20 to 50 question deterministic dataset,
- add `direct-answer`, `rag-basic`, `rag-rerank`, `rag-with-verification` and `agentic-rag` variants,
- use contains, citation, groundedness-like, latency and cost rewards,
- generate leaderboard, recommendation, JSON report, Markdown report, regression result and local history entry.

Out of scope:

- real LLM calls,
- frontend,
- database,
- production IgnitionRAG integration,
- PPO implementation,
- GRPO training,
- model fine-tuning.

Required APIs / files:

- `examples/alpha-dogfood`,
- alpha dogfood experiment module,
- deterministic baseline and regression gate,
- example README.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run --filter './examples/alpha-dogfood' dev
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --bundle reports/alpha-dogfood
```

Definition of done:

- dogfood experiment runs end to end,
- no API key is required,
- report outputs are generated,
- regression gate behavior is documented.

Next PR:

- PR #38 - `chore: prepare v0.1.0-alpha.0 readiness`

### PR #38 - `chore: prepare v0.1.0-alpha.0 readiness`

Status:

- completed

Branch:

```txt
chore/v0.1.0-alpha.0-readiness
```

Goal:

Prepare the repository for a first internal alpha tag.

Scope:

- audit package versions and package metadata,
- document alpha tag criteria,
- update release notes or changelog docs,
- confirm alpha validation commands pass.

Out of scope:

- npm publication,
- runtime feature work,
- API redesign,
- production deployment.

Required APIs / files:

- release or alpha readiness docs.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- alpha readiness criteria are explicit,
- package metadata is internally consistent,
- tag process is documented.

Next PR:

- PR #39 - `docs: add IgnitionRAG Evaluation Center integration checklist`

### PR #39 - `docs: add IgnitionRAG Evaluation Center integration checklist`

Status:

- current

Branch:

```txt
docs/ignitionrag-evaluation-center-checklist
```

Goal:

Translate the alpha dogfood workflow into an IgnitionRAG Evaluation Center implementation checklist.

Scope:

- define Evaluation Center user flow,
- map datasets, variants, rewards, reports and regression gates to IgnitionRAG concepts,
- list backend worker responsibilities,
- list data required from IgnitionRAG,
- identify open integration risks.

Out of scope:

- IgnitionRAG repo changes,
- database migrations,
- frontend implementation,
- auth,
- billing.

Required APIs / files:

- IgnitionRAG Evaluation Center checklist doc.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- checklist is actionable for an IgnitionRAG implementation PR,
- open risks are explicit,
- no runtime source code is modified.

Next PR:

- PR #40 - `feat: add IgnitionRAG evaluation bridge prototype`

### PR #40 - `feat: add IgnitionRAG evaluation bridge prototype`

Status:

- planned

Branch:

```txt
feat/ignitionrag-evaluation-bridge-prototype
```

Goal:

Create a minimal bridge prototype showing how IgnitionRAG-shaped records can become an Ignition Agent Trainer experiment.

Scope:

- add a small prototype module or example,
- map IgnitionRAG-style dataset and workflow records to `Dataset` and `AgentVariant`,
- run the alpha-style evaluation loop locally,
- keep the bridge deterministic and provider-free.

Out of scope:

- production IgnitionRAG integration,
- database access,
- auth,
- SaaS UI,
- real provider calls,
- PPO implementation,
- GRPO training.

Required APIs / files:

- bridge prototype module or example,
- docs describing data mapping and limitations.

Acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- bridge prototype proves the data mapping,
- no IgnitionRAG app code is required,
- limitations are documented.

Next PR:

- Future phase - only after the alpha dogfood and bridge prototype are reviewed.
