# IgnitionRAG Evaluation Bridge Prototype

This example proves the first bridge from IgnitionRAG-shaped records into Ignition Agent Trainer.

It does not call IgnitionRAG, read a database, run a hosted worker or call a model provider. The input records are deterministic local fixtures shaped like the records IgnitionRAG would provide.

## What It Maps

The prototype maps:

- an IgnitionRAG collection reference to experiment metadata,
- an evaluation dataset record to `Dataset`,
- evaluation case records to `DatasetItem`,
- workflow snapshot records to executable `AgentVariant` objects,
- deterministic RAG rewards to an experiment definition.

## Run It

```bash
bun run --filter './examples/ignitionrag-evaluation-bridge' dev
```

Expected result:

- `rag-with-verification snapshot` wins,
- all cases run locally,
- no API key is required,
- no report or database artifact is written.

## Test It

```bash
bun test examples/ignitionrag-evaluation-bridge/src/bridge.test.ts
```

## Files

- `src/bridge.ts`: mapping functions and deterministic workflow snapshot adapter.
- `src/sample.ts`: IgnitionRAG-shaped local records.
- `src/index.ts`: runnable local demonstration.
- `src/bridge.test.ts`: mapping and run coverage.

## Mapping Boundary

Ignition Agent Trainer owns:

- `Dataset`,
- `DatasetItem`,
- `AgentVariant`,
- rewards,
- experiment execution,
- leaderboard and result shape.

IgnitionRAG must still own:

- tenant/project authorization,
- collection and workflow persistence,
- immutable workflow snapshot loading,
- real workflow execution,
- report storage,
- UI,
- redaction of private document content.

## Non-goals

This prototype does not add:

- production IgnitionRAG integration,
- database access,
- auth,
- SaaS UI,
- hosted job infrastructure,
- real provider calls,
- prompt generation,
- workflow mutation,
- PPO implementation,
- GRPO training,
- model fine-tuning.
