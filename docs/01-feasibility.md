# Feasibility

## Verdict

The project is feasible if the implementation order stays disciplined:

```txt
Evals first, RL later.
```

The first valuable versions do not need GPU training, PPO, model fine-tuning or custom neural networks.

## What is easy

### 1. Dataset and run schema

Representing inputs, expected outputs, traces and metrics is straightforward in TypeScript.

### 2. Rule-based scorers

Examples:

- output contains expected terms,
- answer includes citations,
- citations match retrieved sources,
- tool call count is below a threshold,
- latency is below a threshold,
- cost is below a threshold.

### 3. Experiment runner

A runner is just:

```txt
for each variant
  for each dataset item
    run agent
    score output
aggregate results
```

### 4. Adapter layer

LangChain, LangGraph, Mastra and Vercel AI SDK all expose callable agent/workflow primitives. The adapter job is to normalize their outputs into a canonical `AgentRun`.

## What is medium difficulty

### 1. Trace normalization

Each framework represents tool calls, messages and steps differently. We need a common trace model.

### 2. Model-judged evals

They are useful but risky:

- non-deterministic,
- cost-sensitive,
- judge bias,
- model drift.

They should complement rule-based evals, not replace them.

### 3. Retrieval evaluation

Citation accuracy and groundedness require access to retrieved context. IgnitionRAG has an advantage here because it owns the retrieval pipeline.

## What is hard

### 1. Real RL

PPO and GRPO-style optimization require:

- stable environment abstraction,
- many rollouts,
- well-designed rewards,
- reproducibility,
- policy storage,
- safety constraints.

### 2. General-purpose reward design

Rewards must be domain-specific. The framework should provide primitives, not pretend one universal reward works everywhere.

### 3. Enterprise trust

The product must explain why a workflow wins. A black-box optimizer is not enough.

## Technical risk reduction

Start with deterministic, inspectable primitives:

- local datasets,
- local reports,
- rule-based scorers,
- explicit weights,
- JSON traces,
- leaderboard.

Only add model-judged scorers and RL loops after the measurement layer is trusted.

## No-GPU value path

The no-GPU value path is strong:

```txt
Measure → Compare → Select → Report
```

This already solves a real business problem.

## GPU value path later

If needed later:

```txt
Rollouts → Policy learning → PPO/GRPO → Fine-tuning or routing policy
```

This can become an advanced product tier, not the MVP.
