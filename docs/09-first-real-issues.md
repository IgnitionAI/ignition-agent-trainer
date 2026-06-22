# First GitHub issues to create

## Issue 1 — Finalize core types

Define and test:

- Dataset,
- DatasetItem,
- AgentVariant,
- AgentRun,
- AgentTrace,
- RewardFunction,
- ExperimentReport.

## Issue 2 — Implement deterministic scorers

Implement and test:

- exactMatch,
- containsText,
- citationPresence,
- toolCallCountPenalty,
- latencyPenalty,
- costPenalty.

## Issue 3 — Build experiment runner

The runner must execute each variant against each dataset item and output:

- case results,
- score breakdown,
- aggregate leaderboard.

## Issue 4 — Add basic CLI

Target:

```bash
ignition-agent-trainer eval run --dataset ./dataset.json --variant ./variant.ts --out ./report.json
```

## Issue 5 — Add LangChain adapter

Wrap any LangChain runnable and normalize output to `AgentRun`.

## Issue 6 — Add Mastra adapter

Wrap Mastra `Agent.generate()` and normalize tool calls where available.

## Issue 7 — Design IgnitionRAG adapter

Define how an IgnitionRAG workflow becomes an `AgentVariant`.

## Issue 8 — Report format

Add JSON and Markdown reports.

## Issue 9 — Context config experiment

Compare retrieval configs:

- topK,
- hybrid search,
- reranking,
- verification.

## Issue 10 — Bandit strategy router

Use epsilon-greedy bandit to pick among fixed strategies based on reward feedback.
