# @ignitionai/adapter-vercel-ai

Minimal structural adapter for Vercel AI SDK-style functions.

This package does not require the `ai` package at runtime. It expects a function that accepts a prompt-shaped object and returns text or structured data:

```ts
import { createVercelAiAdapter } from "@ignitionai/adapter-vercel-ai";

const adapter = createVercelAiAdapter({
  name: "support-generator",
  async generate({ prompt }) {
    return `Answer: ${prompt}`;
  },
});
```

Use `vercelAiAdapter()` when you want an `AgentVariant` directly:

```ts
import { vercelAiAdapter } from "@ignitionai/adapter-vercel-ai";

const variant = vercelAiAdapter({
  id: "vercel-ai-support",
  name: "Vercel AI Support",
  generate,
});
```

Returned `usage` and `metadata` objects are preserved when present:

```ts
const generate = async ({ prompt }) => ({
  text: `Answer: ${prompt}`,
  usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  metadata: { model: "fake-model" },
});
```

## Mapping

Customize input and output conversion with `baseOptions`, `mapInput` and `mapOutput`.

## Non-goals

This adapter does not perform real provider calls, require provider auth, stream tokens, integrate tools or generate prompts.
