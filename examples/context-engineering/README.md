# Context Engineering Strategy Comparison

This example demonstrates the core Ignition Agent Trainer thesis:

```txt
Same task
Same mocked base model
Different context/workflow strategy
Different scores
Best strategy wins
```

The model is not retrained. Each variant uses the same mocked model behavior, but changes the surrounding system:

- `direct-answer` answers with minimal context.
- `rag-basic` adds retrieved context.
- `rag-with-verification` adds retrieval plus a grounding verification step.

## Why This Is Context Engineering

In this project, context engineering means improving an agent by changing what the model receives and how the workflow is structured:

- retrieved context,
- available tools,
- verification steps,
- citation requirements,
- cost and latency budgets.

The reward functions measure whether those changes improve the final behavior.

## IgnitionRAG Mapping

This maps directly to future IgnitionRAG product surfaces:

- Evaluation Center: run workflows against a dataset.
- Experiment Lab: compare direct, RAG and verified RAG strategies.
- Optimization Lab: recommend which workflow to use for a task class.

## Why RL Comes Later

The MVP does not implement PPO, GRPO or model fine-tuning. The first useful loop is measurement:

```txt
Dataset -> Variants -> Rewards -> Leaderboard -> Recommendation
```

Once datasets, traces and rewards are trusted, RL-style routing and policy optimization can build on top of this loop.

## Run

```bash
bun run --filter './examples/context-engineering' dev
```

Run the same typed experiment through the local CLI:

```bash
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

Write JSON and Markdown reports:

```bash
bun run --filter '@ignitionai/cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --json reports/context-engineering.json \
  --markdown reports/context-engineering.md
```

## Typed Experiment Module

The reusable experiment definition lives at:

```txt
examples/context-engineering/experiment.ts
```

It exports a default `ExperimentDefinition`, which prepares this example for the future CLI runner without adding CLI loading in this PR.
