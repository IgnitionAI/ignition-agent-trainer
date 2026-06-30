# Ignition Agent Trainer

**Evaluation, experimentation and optimization layer for TypeScript AI agents.**

The goal is not to replace LangChain, LangGraph, Mastra or the Vercel AI SDK.
The goal is to make any existing TypeScript agent **measurable, comparable and improvable**.

> North Star: improve agent behavior through context engineering, rewards and experiments — without fine-tuning the base LLM first.

---

## Why this project exists

Most production AI teams can build a RAG chatbot or a tool-calling agent. The hard part starts after the demo:

- How do we know the agent works?
- Which prompt, workflow or retrieval config is best?
- Did a new change introduce regressions?
- Should this request use simple RAG, reranking, verification or a multi-step agent?
- How do we optimize quality while controlling latency and cost?

Ignition Agent Trainer answers this by wrapping existing agents in a standard loop:

```txt
Dataset
  ↓
Agent adapter
  ↓
Trace collection
  ↓
Rewards / scorers
  ↓
Leaderboard
  ↓
Optimization
```

The LLM does not need to be retrained in the first versions. We optimize the system around it:

```txt
Prompts
Retrieval parameters
Tool choice
Tool order
Verification rules
Context assembly
Workflow routing
Stop conditions
```

This is **context engineering via reinforcement signals**.

---

## Target architecture

```txt
apps / SaaS
└─ IgnitionRAG
   ├─ Evaluation Center
   ├─ Experiments
   ├─ Optimization Lab
   └─ Agent Training

open-source framework
├─ @ignitionai/agent-trainer-core
├─ @ignitionai/agent-trainer-evals
├─ @ignitionai/agent-trainer-experiments
├─ @ignitionai/agent-trainer
├─ @ignitionai/agent-trainer-environment
├─ @ignitionai/agent-trainer-rl
├─ @ignitionai/agent-trainer-adapter-langchain
├─ @ignitionai/agent-trainer-adapter-langgraph
├─ @ignitionai/agent-trainer-adapter-mastra
└─ @ignitionai/agent-trainer-adapter-vercel-ai
```

---

## Quick start

```bash
bun install
bun run dev
```

Run all checks:

```bash
bun run ci
```

Run the basic example:

```bash
bun run --filter './examples/basic-eval' dev
```

Run a typed experiment through the local CLI:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts
```

Write a timestamped local report bundle:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts --bundle reports
```

Record local experiment history and run a regression check against the latest baseline:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/context-engineering/experiment.ts \
  --history .ignition/experiment-history.jsonl \
  --baseline latest \
  --regression \
  --max-score-drop 0.03 \
  --record-history
```

Run the sample CI regression gate:

```bash
bun run --filter './examples/ci-regression-gate' dev
```

Run mocked ecosystem adapter examples:

```bash
bun run --filter './examples/ecosystem-adapters' dev
```

Run the alpha dogfood document-assistant experiment:

```bash
bun run --filter './examples/alpha-dogfood' dev
```

Run the alpha dogfood experiment through the local CLI and write a report bundle:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --bundle reports/alpha-dogfood
```

Run the IgnitionRAG evaluation bridge prototype:

```bash
bun run --filter './examples/ignitionrag-evaluation-bridge' dev
```

Run a deterministic RAG environment episode and trajectory report:

```bash
bun run --filter './examples/rag-environment-episode' dev
```

Run that episode through the local CLI and write trajectory reports:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- environment run ./examples/rag-environment-episode/src/index.ts \
  --json reports/rag-trajectory.json \
  --markdown reports/rag-trajectory.md \
  --offline-records
```

---

## Minimal usage

```ts
import { createDataset } from "@ignitionai/agent-trainer-core";
import { containsText, costPenalty, latencyPenalty } from "@ignitionai/agent-trainer-evals";
import { createExperiment } from "@ignitionai/agent-trainer-experiments";

const dataset = createDataset({
  name: "contract-risk-demo",
  items: [
    {
      id: "case-001",
      input: "Find the termination clause and cite the source.",
      expected: {
        contains: ["termination", "notice"],
        citations: ["contract.pdf#p12"],
      },
    },
  ],
});

const simpleRag = {
  id: "simple-rag",
  name: "Simple RAG",
  async run(item) {
    return {
      output: "The termination clause requires 30 days notice. [contract.pdf#p12]",
      trace: {
        steps: [
          { type: "tool_call", name: "search", input: { topK: 5 }, output: "contract.pdf#p12" },
        ],
      },
      usage: { inputTokens: 800, outputTokens: 80, costUsd: 0.002, latencyMs: 1200 },
    };
  },
};

const experiment = createExperiment({
  name: "rag-strategy-comparison",
  dataset,
  variants: [simpleRag],
  rewards: [
    containsText({ weight: 0.4 }),
    latencyPenalty({ maxLatencyMs: 3000, weight: 0.2 }),
    costPenalty({ maxCostUsd: 0.01, weight: 0.2 }),
  ],
});

const report = await experiment.run();
console.table(report.leaderboard);
```

---

## Roadmap summary

1. **Evals** — datasets, scorers, traces, reports.
2. **Experiments** — compare prompts, agents, workflows and RAG configurations.
3. **Trainer** — generate/evaluate/select loops for prompt and workflow optimization.
4. **Environment** — state/action/reward loop for agentic policies.
5. **RL runtime** — bandits first, then GRPO-style group optimization, PPO later.
6. **IgnitionRAG integration** — Evaluation Center, Experiment Lab, Optimization Lab, Agent Trainer.

See [ROADMAP.md](./ROADMAP.md) for the full implementation plan.

---

## Post-#20 roadmap

The initial foundation backlog is complete through PR #20.

The next phase focuses on alpha readiness, IgnitionRAG bridge work, and cautious RL exploration.

See:

- [Post-#20 roadmap](./docs/POST_20_ROADMAP.md)
- [Project audit](./docs/PROJECT_AUDIT.md)
- [IgnitionRAG implementation handoff](./docs/IGNITIONRAG_IMPLEMENTATION_HANDOFF.md)

---

## Key docs

- [Autonomous implementation plan](./docs/IMPLEMENTATION_PLAN.md)
- [Codex runbook](./docs/CODEX_RUNBOOK.md)
- [PR playbook](./docs/PR_PLAYBOOK.md)
- [Backlog](./docs/BACKLOG.md)
- [Post-#20 roadmap](./docs/POST_20_ROADMAP.md)
- [Project audit](./docs/PROJECT_AUDIT.md)
- [Alpha readiness checklist](./docs/ALPHA_READINESS.md)
- [Alpha release readiness](./docs/ALPHA_RELEASE.md)
- [v0.1.0-alpha.0 release notes](./docs/releases/v0.1.0-alpha.0.md)
- [npm alpha publishing](./docs/NPM_ALPHA_PUBLISHING.md)
- [Alpha validation plan](./docs/ALPHA_VALIDATION_PLAN.md)
- [Definition of Done](./docs/DEFINITION_OF_DONE.md)
- [Milestones](./docs/MILESTONES.md)
- [Strategic vision in French](./docs/00-vision-fr.md)
- [Feasibility](./docs/01-feasibility.md)
- [Architecture](./docs/02-architecture.md)
- [Concepts: RL for agents](./docs/03-rl-concepts-for-agents.md)
- [ADR 0003: RL foundation sequence](./docs/adr/0003-rl-foundation-sequence.md)
- [IgnitionRAG integration plan](./docs/04-ignitionrag-integration.md)
- [IgnitionRAG integration design](./docs/10-ignitionrag-integration-design.md)
- [IgnitionRAG Evaluation Center checklist](./docs/IGNITIONRAG_EVALUATION_CENTER_CHECKLIST.md)
- [MVP specification](./docs/05-mvp-spec.md)
- [Competitive landscape](./docs/06-competitive-landscape.md)
- [Implementation checklist](./docs/07-implementation-checklist.md)

---

## Autonomous implementation

Future implementation sessions should start from [docs/CODEX_RUNBOOK.md](./docs/CODEX_RUNBOOK.md).

---

## Positioning

```txt
LangChain / LangGraph / Mastra / Vercel AI SDK
        ↓
Ignition Agent Trainer
        ↓
Evals + rewards + experiments + optimization
```

We do not compete on agent construction first. We compete on **agent measurement and improvement**.

---

## Repo status

This repository is an initial scaffold. The code compiles as a design skeleton and the APIs are intentionally small. The first real milestone is a local evaluation runner that can compare two fake or real agent variants over a dataset and output a leaderboard.
