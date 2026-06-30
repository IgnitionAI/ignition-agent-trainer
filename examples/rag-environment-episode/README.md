# RAG Environment Episode

This example models a deterministic RAG workflow as a lightweight environment episode.

The scripted policy chooses:

```txt
search -> rerank -> verify -> answer
```

Each action returns a reward. The completed episode is converted into a trajectory, summarized, exported as Markdown and converted into offline policy evaluation records.

## Run

```bash
bun run --filter './examples/rag-environment-episode' dev
```

Run the same episode through the local CLI and write trajectory reports:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- environment run ./examples/rag-environment-episode/src/index.ts \
  --seed 7 \
  --max-steps 10 \
  --policy-id scripted-rag-policy \
  --trajectory-id rag-environment-episode \
  --json reports/rag-trajectory.json \
  --markdown reports/rag-trajectory.md \
  --offline-records
```

The example is fully mocked. It does not call LLM providers, vector databases or external tools.
