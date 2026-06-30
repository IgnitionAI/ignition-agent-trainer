# @ignitionai/agent-trainer-adapter-langgraph

Minimal structural adapter for LangGraph-like graph objects.

This package does not require `@langchain/langgraph` at runtime. It only expects a graph-like object with an `invoke()` method:

```ts
import { createLangGraphAdapter } from "@ignitionai/agent-trainer-adapter-langgraph";

const adapter = createLangGraphAdapter({
  name: "support-graph",
  graph: {
    async invoke(input) {
      return `Answer: ${JSON.stringify(input)}`;
    },
  },
});
```

Use `langGraphAdapter()` when you want an `AgentVariant` directly:

```ts
import { langGraphAdapter } from "@ignitionai/agent-trainer-adapter-langgraph";

const variant = langGraphAdapter({
  id: "verified-rag-graph",
  name: "Verified RAG Graph",
  graph,
});
```

The default input shape is message-oriented:

```ts
{
  messages: [{ role: "user", content: item.input }]
}
```

Customize input and output conversion with `mapInput` and `mapOutput`.

## Example

See `examples/ecosystem-adapters` for a runnable mocked LangGraph adapter wired into `createExperiment()` with trace, usage and metadata mapping.

## Non-goals

This adapter does not persist graph state, stream events, call real providers, inspect graph internals or adapt LangChain/Mastra/Vercel AI SDK behavior.
