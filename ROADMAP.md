# Roadmap

## Mission

Build the TypeScript-native framework that helps teams evaluate, compare and optimize AI agents without retraining their base LLMs.

The long-term idea is inspired by reinforcement learning, but the product path starts with immediate business value:

```txt
Evals → Experiments → Optimization → Environment → RL
```

---

## Phase 0 — Research and design

**Goal:** clarify the technical target and avoid building PPO before having a useful product.

### Deliverables

- Public research notes on NVIDIA NeMo Agent Toolkit, NeMo RL, LangSmith, Mastra Evals, Promptfoo, Braintrust, OpenAI Evals.
- Canonical vocabulary: dataset, run, trace, scorer, reward, variant, experiment, policy, environment.
- API design for adapters and reward functions.
- First ADRs.

### Success criteria

- We can explain the framework in one sentence.
- We can map one IgnitionRAG workflow to dataset + adapter + rewards.
- We know what we will not build in v1.

---

## Phase 1 — `@ignitionai/agent-trainer-evals`

**Goal:** measure one agent on one dataset.

### Features

- Dataset schema.
- Agent run schema.
- Trace schema.
- Rule-based scorers:
  - exact match
  - contains text
  - citation presence
  - tool call count
  - latency penalty
  - cost penalty
- Composite weighted score.
- JSON report.
- Local file output.

### Success criteria

```txt
bun run eval --dataset ./dataset.json --variant simple-rag
```

outputs:

```txt
accuracy: 0.78
latency: 1.4s
cost: $0.03
```

---

## Phase 2 — `@ignitionai/agent-trainer-experiments`

**Goal:** compare multiple agent strategies.

### Features

- Variants: prompt A/B, workflow A/B, RAG config A/B.
- Experiment runner.
- Leaderboard.
- Regression detection.
- Baseline comparison.
- CI mode.

### Success criteria

Compare:

```txt
A. simple RAG
B. RAG + rerank
C. RAG + rerank + verify
```

and produce:

```txt
C wins on quality, B wins on quality/cost tradeoff.
```

---

## Phase 3 — `@ignitionai/agent-trainer`

**Goal:** optimize prompts and workflows without model fine-tuning.

### Features

- Candidate generation interface.
- Generate → evaluate → select loop.
- Prompt candidate optimizer.
- Workflow candidate optimizer.
- Retrieval parameter search.
- Pareto ranking: quality vs cost vs latency.

### Success criteria

Given 20 prompt candidates, select top 3 against a private business dataset.

---

## Phase 4 — `@ignitionai/agent-trainer-environment`

**Goal:** represent an agent as an environment with state, actions and rewards.

### Features

- `createEnvironment()` API.
- State schema.
- Discrete action registry.
- Episode runner.
- Rollout traces.
- Reward functions over trajectories.

### Success criteria

A RAG agent can choose actions from:

```txt
rewrite_query
search
rerank
extract
verify
answer
ask_clarification
```

and receive a reward at each step or at the end of the episode.

---

## Phase 5 — `@ignitionai/agent-trainer-rl`

**Goal:** introduce actual policy optimization once the environment abstraction is stable.

### Algorithm order

1. Epsilon-greedy bandits.
2. UCB / Thompson sampling.
3. Monte Carlo policy evaluation.
4. GRPO-style group comparison for LLM traces.
5. PPO for multi-step discrete action policies.

### Why PPO is not phase 1

PPO needs a stable state/action/reward loop and enough rollouts. Without those, it becomes engineering theater. The first money-making value is measurement and optimization, not neural policy training.

---

## Phase 6 — IgnitionRAG integration

**Goal:** turn framework capabilities into SaaS features.

### Product modules

- Evaluation Center.
- Experiment Lab.
- Optimization Lab.
- Agent Trainer.
- CI regression gates.
- Client-facing quality reports.

### Success criteria

A user can upload a business dataset, select two IgnitionRAG workflows, run an evaluation, and receive:

- score breakdown,
- citations quality,
- hallucination flags,
- cost/latency tradeoff,
- recommended winning workflow.

---

## Suggested first sprint

### Sprint 1: repo + contracts

- [ ] Finalize package names.
- [ ] Implement core schemas.
- [ ] Implement fake agent adapter.
- [ ] Implement 5 rule-based scorers.
- [ ] Implement experiment runner.
- [ ] Implement JSON report.
- [ ] Add one working example.

### Sprint 2: real adapters

- [ ] LangChain adapter.
- [ ] LangGraph adapter.
- [ ] Mastra adapter.
- [ ] Vercel AI SDK adapter.
- [ ] Standard trace normalization.

### Sprint 3: IgnitionRAG bridge

- [ ] Export IgnitionRAG workflow as a variant.
- [ ] Export collection config as retrieval candidate.
- [ ] Add dataset table.
- [ ] Add evaluation run table.
- [ ] Add dashboard MVP.
