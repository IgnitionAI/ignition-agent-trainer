# @ignitionai/agent-trainer-adapter-mastra

Minimal structural adapter for Mastra-like agent objects.

This package does not require `@mastra/core` at runtime. It expects an object with either `generate()` or `run()`:

```ts
import { createMastraAdapter } from "@ignitionai/agent-trainer-adapter-mastra";

const adapter = createMastraAdapter({
  name: "support-agent",
  agent: {
    async generate(input) {
      return `Answer: ${input}`;
    },
  },
});
```

Use `mastraAdapter()` when you want an `AgentVariant` directly:

```ts
import { mastraAdapter } from "@ignitionai/agent-trainer-adapter-mastra";

const variant = mastraAdapter({
  id: "mastra-support",
  name: "Mastra Support",
  agent,
});
```

The adapter uses `@ignitionai/agent-trainer-adapter-callable` internally, so thrown agent errors flow through the standard experiment failure path.

## Mapping

Customize input and output conversion with `mapInput` and `mapOutput`:

```ts
createMastraAdapter({
  name: "mapped-agent",
  agent,
  mapInput: (item) => ({ prompt: item.input, caseId: item.id }),
  mapOutput: (raw) => ({
    output: raw,
    metadata: { source: "mastra" },
  }),
});
```

## Non-goals

This adapter does not perform real model calls, require provider keys, execute tools, integrate memory/persistence or cover the full Mastra API.
