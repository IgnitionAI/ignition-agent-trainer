# Alpha Dogfood Experiment

This example is the first end-to-end alpha validation flow for Ignition Agent Trainer.

It models an IgnitionRAG-style document assistant where a developer compares five deterministic strategies over a realistic business-question dataset:

- `direct-answer`
- `rag-basic`
- `rag-rerank`
- `rag-with-verification`
- `agentic-rag`

The example does not call OpenAI, Anthropic or any external provider. Outputs, traces, cost and latency are deterministic so the experiment can run in local development and CI.

## What It Proves

The dogfood flow proves that a developer can:

- run a realistic RAG strategy experiment from local code,
- run the same experiment through the CLI,
- inspect a leaderboard and recommendation,
- export JSON and Markdown reports,
- write a report bundle,
- append a local history entry,
- compare against a committed baseline with a regression gate.

## Dataset

The dataset has 24 representative questions across support, policy, contract, security and operations tasks.

Every case includes:

- required answer fragments,
- required citations,
- task metadata,
- risk metadata.

## Rewards

The experiment uses:

- `contains_all`
- `citation_presence`
- `groundedness_like`
- `latency`
- `cost`
- `alpha_composite`

`groundedness_like` is a deterministic proxy based on required text, citations and trace support. It is not an LLM judge.

## Run The Dogfood Flow

```bash
bun run --filter './examples/alpha-dogfood' dev
```

This writes local artifacts under:

```txt
reports/alpha-dogfood
```

Generated artifacts are not committed.

## Run Through The CLI

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --bundle reports/alpha-dogfood
```

## Run The Regression Gate

```bash
bun run --filter './examples/alpha-dogfood' gate
```

The gate compares the current experiment result against:

```txt
examples/alpha-dogfood/baseline.alpha-dogfood.json
```

Current thresholds:

```txt
maxScoreDrop: 0.03
maxLatencyIncreaseMs: 650
maxCostIncreaseUsd: 0.13
```

The gate also requires all five variants to be present.

## Non-goals

This example does not add:

- real LLM calls,
- frontend,
- database,
- production IgnitionRAG integration,
- PPO implementation,
- GRPO training,
- model fine-tuning.
