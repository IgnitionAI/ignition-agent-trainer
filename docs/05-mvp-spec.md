# MVP specification

## Goal

Build a local TypeScript evaluation runner that compares agent variants over a dataset and outputs a leaderboard.

## Non-goals

- No PPO.
- No model fine-tuning.
- No hosted dashboard.
- No universal hallucination detector.
- No heavy dependency on one agent framework.

## User story

As a developer, I want to compare two RAG workflows on a dataset so that I know which one gives better answers with acceptable cost and latency.

## CLI target

```bash
ignition-agent-trainer eval run \
  --dataset ./datasets/contracts.json \
  --variant ./variants/simple-rag.ts \
  --variant ./variants/rag-rerank-verify.ts \
  --out ./reports/contracts-eval.json
```

## TypeScript API target

```ts
const report = await createExperiment({
  name: "contracts-rag",
  dataset,
  variants,
  rewards,
}).run();
```

## Required MVP features

### Dataset

- JSON dataset format.
- `id`, `input`, `expected`, `metadata`.

### Variant

- `id`, `name`, `run()`.

### Agent run

- `output`, `trace`, `usage`, `metadata`.

### Rewards

- `containsText`,
- `exactMatch`,
- `citationPresence`,
- `toolCallCountPenalty`,
- `latencyPenalty`,
- `costPenalty`.

### Report

- case-level scores,
- variant-level aggregate,
- leaderboard,
- failed cases.

## First example

Use a fake contract RAG agent:

- variant A returns an uncited answer,
- variant B returns a cited answer,
- variant C returns cited answer but high cost.

The evaluator should show the tradeoff.

## Definition of done

- `bun install` works.
- `bun run dev` runs an example.
- `bun run test` passes.
- A developer can create a new reward function in less than 10 lines.
- The README explains the why and how clearly.
