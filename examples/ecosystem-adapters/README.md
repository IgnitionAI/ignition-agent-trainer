# Ecosystem Adapter Examples

This example runs deterministic mocked adapters for:

- LangChain Runnable-like objects,
- LangGraph graph-like objects,
- Mastra agent-like objects,
- Vercel AI SDK-style generate functions.

Each adapter plugs into `createExperiment()` as an `AgentVariant`. The mocks return trace, usage and metadata so the example can validate adapter observability without provider credentials or network calls.

Run it:

```bash
bun run --filter './examples/ecosystem-adapters' dev
```

Run the example test:

```bash
bun test examples/ecosystem-adapters/src/example.test.ts
```

This is not deep framework coverage. It proves the adapter contracts work with public package APIs and documents the shape each adapter expects.
