# Alpha Readiness Checklist

This checklist tracks what must be true before Ignition Agent Trainer can be treated as an alpha-quality developer tool.

Status values:

- `ready`: acceptable for alpha.
- `partial`: usable, but known gaps remain.
- `prototype`: exploratory; not alpha-stable.
- `missing`: not implemented.

## Versioning Policy

The internal alpha tag uses `0.1.0-alpha.0` across the root package and every workspace package.

This version prepares the repository for an internal Git tag only. It does not imply npm publication, public API stability or production readiness.

All packages declare `license: MIT`, matching the root `LICENSE` file.

## Package Readiness

| Package | Manifest metadata | README | Tests | Build output verified | Alpha status | Notes |
|---|---|---|---|---|---|---|
| `@ignitionai/agent-trainer-adapter-callable` | ready | ready | ready | ready | ready | Generic callable adapter has docs, tests and an example. |
| `@ignitionai/agent-trainer-adapter-ignitionrag` | ready | ready | ready | ready | partial | Type-level contract only; no runtime IgnitionRAG integration. |
| `@ignitionai/agent-trainer-adapter-langchain` | ready | ready | ready | ready | partial | Structural adapter with mocked example coverage; no deep LangChain internals. |
| `@ignitionai/agent-trainer-adapter-langgraph` | ready | ready | ready | ready | partial | Structural adapter with mocked example coverage; no persistence, streaming or graph internals. |
| `@ignitionai/agent-trainer-adapter-mastra` | ready | ready | ready | ready | partial | Structural adapter with mocked example coverage; no memory, tool or full Mastra coverage. |
| `@ignitionai/agent-trainer-adapter-vercel-ai` | ready | ready | ready | ready | partial | Structural adapter with mocked example coverage; no streaming, tools or live provider calls. |
| `@ignitionai/agent-trainer-cli` | ready | ready | ready | ready | partial | Runs typed experiments, writes reports/bundles, records local history, selects baselines and runs regression checks; no watch mode or remote execution. |
| `@ignitionai/agent-trainer-core` | ready | ready | ready | ready | partial | Foundational helpers have dedicated tests; runtime schema validation remains outside the current helper surface. |
| `@ignitionai/agent-trainer-environment` | ready | ready | ready | ready | partial | Tested episode runner with safety guards and a deterministic RAG episode example; no production runtime or optimization loop. |
| `@ignitionai/agent-trainer-evals` | ready | ready | ready | ready | partial | Current rewards are tested; RAG presets and richer scoring are still missing. |
| `@ignitionai/agent-trainer-experiments` | ready | ready | ready | ready | ready | Local runner, definitions, gates and JSONL history are tested and documented. |
| `@ignitionai/agent-trainer-exporters` | ready | ready | ready | ready | ready | JSON/Markdown report shape and local report bundles are tested. |
| `@ignitionai/agent-trainer-preset-rag` | ready | ready | ready | ready | partial | RAG presets compose existing deterministic rewards; no live retrieval or model-graded scoring. |
| `@ignitionai/agent-trainer-preset-strategies` | ready | ready | ready | ready | partial | Strategy registry provides deterministic mocked variants; no real retrieval, reranking or provider calls. |
| `@ignitionai/agent-trainer-rl` | ready | ready | partial | ready | prototype | Deterministic policy helpers, trajectory recorder, fixed-strategy bandits, offline policy evaluation, GRPO-style selection and PPO interface skeletons are tested; deeper RL is intentionally absent. |
| `@ignitionai/agent-trainer` | ready | ready | ready | ready | ready | Deterministic recommendation, candidate evaluation and grid search are tested. |

## Verified Through PR #44

- Package names use the `@ignitionai/*` scope.
- Root and workspace package versions are aligned on `0.1.0-alpha.0`.
- Root and workspace package manifests declare `license: MIT`.
- Every package exports from `src/index.ts`.
- Every package builds to `dist` through `tsup`.
- Every package manifest declares `main`, `module`, `types`, `exports` and `files`.
- Every package now has a package description and repository directory metadata.
- Every package now has a README.
- `bun install`, `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build` pass locally.
- The alpha dogfood experiment runs locally and through the CLI.
- The alpha dogfood regression gate passes against its committed baseline.
- `@ignitionai/agent-trainer-core` has dedicated package-level tests for dataset helpers, adapter helpers and score helpers.

## Known Work After Internal Alpha

- Dogfood the alpha inside IgnitionRAG and collect trajectory/reward evidence.
- Add a lightweight policy optimization loop after real dogfood produces trajectory data.
- Decide any next-step publishing automation policy before a future public release workflow.

## Explicit Non-goals

Alpha readiness does not:

- publish packages to npm,
- redesign public APIs,
- add runtime features,
- add real provider calls,
- add database or hosted services,
- implement PPO, GRPO or model training.
