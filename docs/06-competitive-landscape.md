# Competitive landscape

## NVIDIA NeMo Agent Toolkit

NeMo Agent Toolkit is Python-first and includes workflow building, functions/tools, memory, retrievers, MCP, integrations, evaluation and optimization concepts.

The lesson: NVIDIA is treating agents as workflows that must be built, observed, evaluated and improved.

Our angle: TypeScript-first, product/dev-team oriented, designed to wrap existing JS/TS agent frameworks and integrate into IgnitionRAG.

Reference: https://docs.nvidia.com/nemo/agent-toolkit/latest/index.html

## NVIDIA NeMo RL

NeMo RL is an open-source post-training library for reinforcement learning methods on multimodal models. It supports algorithms like GRPO, DPO, reward models and SFT, with distributed training backends.

The lesson: RL for LLMs is becoming a production concern, but NVIDIA's center of gravity is Python, PyTorch, CUDA, distributed training and model post-training.

Our angle: no-GPU first, context-engineering first, agent orchestration first.

Reference: https://docs.nvidia.com/nemo/rl/latest/index.html

## LangChain / LangGraph

LangChain provides agent primitives and LangGraph provides lower-level orchestration for stateful agent workflows.

Our angle: do not replace them. Adapt them.

Reference: https://docs.langchain.com/oss/javascript/langchain/overview

## Mastra

Mastra is a TypeScript framework for AI agents and includes agents, tools, workflows, memory, observability, RAG and evals.

Our angle: stronger focus on cross-framework experiment orchestration, optimization loops, and IgnitionRAG integration.

Reference: https://mastra.ai/docs

## Vercel AI SDK

The AI SDK is a TypeScript toolkit for AI applications and agents across React, Next.js, Vue, Svelte, Node.js and more. It provides model/provider abstractions, tools, streaming and telemetry.

Our angle: wrap AI SDK agents/functions as variants and evaluate/optimize them.

Reference: https://ai-sdk.dev/docs/introduction

## Positioning statement

```txt
Not another agent framework.
A measurement and optimization layer for agent frameworks.
```

## Differentiation

| Category | Existing tools | Ignition angle |
|---|---|---|
| Build agents | LangChain, LangGraph, Mastra, AI SDK | Wrap, do not replace |
| Observe traces | LangSmith, Langfuse | Export and complement |
| Run evals | Mastra Evals, Promptfoo, Braintrust | Cross-framework + IgnitionRAG-native |
| Optimize | fragmented scripts, platform-specific tools | TypeScript optimizer SDK |
| RL for LLMs | NeMo RL, research stacks | Context-engineering and orchestration policy first |
