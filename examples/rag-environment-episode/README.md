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

The example is fully mocked. It does not call LLM providers, vector databases or external tools.
