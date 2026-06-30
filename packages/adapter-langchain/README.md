# @ignitionai/agent-trainer-adapter-langchain

Minimal structural adapter for LangChain Runnable-like objects.

This package does not require `langchain` at runtime. It only expects an object with an `invoke()` method:

```ts
import { createLangChainAdapter } from "@ignitionai/agent-trainer-adapter-langchain";

const adapter = createLangChainAdapter({
  name: "support-runnable",
  runnable: {
    async invoke(input) {
      return `Answer: ${input}`;
    },
  },
});
```

Use `langChainAdapter()` when you want an `AgentVariant` directly:

```ts
import { langChainAdapter } from "@ignitionai/agent-trainer-adapter-langchain";

const variant = langChainAdapter({
  id: "langchain-rag",
  name: "LangChain RAG",
  runnable,
});
```

The adapter uses `@ignitionai/agent-trainer-adapter-callable` internally, so thrown runnable errors flow through the standard experiment failure path.

## Mapping

Customize input and output conversion with `mapInput` and `mapOutput`:

```ts
createLangChainAdapter({
  name: "mapped-runnable",
  runnable,
  mapInput: (item) => ({ question: item.input, caseId: item.id }),
  mapOutput: (raw) => ({
    output: raw,
    metadata: { source: "langchain" },
  }),
});
```

## Non-goals

This adapter does not perform real provider calls, require API keys, stream tokens, inspect LangChain internals or adapt LangGraph/Mastra behavior.
