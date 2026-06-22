# Alpha Readiness Checklist

This checklist tracks what must be true before Ignition Agent Trainer can be treated as an alpha-quality developer tool.

Status values:

- `ready`: acceptable for alpha.
- `partial`: usable, but known gaps remain.
- `prototype`: exploratory; not alpha-stable.
- `missing`: not implemented.

## Package Readiness

| Package | Manifest metadata | README | Tests | Build output verified | Alpha status | Notes |
|---|---|---|---|---|---|---|
| `@ignitionai/adapter-callable` | ready | ready | ready | ready | ready | Generic callable adapter has docs, tests and an example. |
| `@ignitionai/adapter-ignitionrag` | ready | ready | ready | ready | partial | Type-level contract only; no runtime IgnitionRAG integration. |
| `@ignitionai/adapter-langchain` | ready | ready | ready | ready | partial | Structural adapter only; no dedicated example or deep framework coverage. |
| `@ignitionai/adapter-langgraph` | ready | ready | ready | ready | partial | Structural adapter only; no persistence, streaming or graph internals. |
| `@ignitionai/adapter-mastra` | ready | ready | ready | ready | partial | Structural adapter only; no memory, tool or full Mastra coverage. |
| `@ignitionai/adapter-vercel-ai` | ready | ready | ready | ready | partial | Structural adapter only; no streaming, tools or live provider calls. |
| `@ignitionai/cli` | ready | ready | ready | ready | partial | Runs typed experiments and writes standalone reports or timestamped bundles; no history/baseline/regression flags yet. |
| `@ignitionai/core` | ready | ready | missing | ready | partial | Foundational types and helpers need dedicated tests before alpha-stable status. |
| `@ignitionai/environment` | ready | ready | missing | ready | prototype | Early environment loop only; no recorder, policy evaluation or tests yet. |
| `@ignitionai/evals` | ready | ready | ready | ready | partial | Current rewards are tested; RAG presets and richer scoring are still missing. |
| `@ignitionai/experiments` | ready | ready | ready | ready | ready | Local runner, definitions, gates and JSONL history are tested and documented. |
| `@ignitionai/exporters` | ready | ready | ready | ready | ready | JSON/Markdown report shape and local report bundles are tested. |
| `@ignitionai/preset-rag` | ready | ready | ready | ready | partial | RAG presets compose existing deterministic rewards; no live retrieval or model-graded scoring. |
| `@ignitionai/preset-strategies` | ready | ready | ready | ready | partial | Strategy registry provides deterministic mocked variants; no real retrieval, reranking or provider calls. |
| `@ignitionai/rl` | ready | ready | partial | ready | prototype | Deterministic policy helpers, trajectory recorder and fixed-strategy bandit are tested; deeper RL is intentionally absent. |
| `@ignitionai/trainer` | ready | ready | ready | ready | ready | Deterministic recommendation, candidate evaluation and grid search are tested. |

## Verified In PR #22

- Package names use the `@ignitionai/*` scope.
- Every package exports from `src/index.ts`.
- Every package builds to `dist` through `tsup`.
- Every package manifest declares `main`, `module`, `types`, `exports` and `files`.
- Every package now has a package description and repository directory metadata.
- Every package now has a README.
- `bun install`, `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build` pass locally.

## Still Required Before Alpha

- Add dedicated tests for `@ignitionai/core`.
- Add dedicated tests for `@ignitionai/environment` or keep it explicitly prototype-only.
- Add CLI history/baseline/regression ergonomics after report bundles and CI examples.
- Decide license/publishing policy before any npm publication.
- Decide whether packages stay at `0.0.0` until the first internal alpha tag.

## Explicit Non-goals

PR #22 does not:

- publish packages to npm,
- redesign public APIs,
- add runtime features,
- add real provider calls,
- add database or hosted services,
- implement PPO, GRPO or model training.
