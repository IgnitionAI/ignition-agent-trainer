# RL concepts for AI agents

## Mapping

| RL concept | Agentic equivalent |
|---|---|
| State | user request, retrieved context, current trace, memory, cost so far |
| Action | call search, rerank, extract, verify, ask clarification, answer |
| Policy | strategy deciding the next action |
| Reward | quality, groundedness, citation accuracy, cost, latency, safety |
| Episode | one full agent run from user question to final answer |
| Rollout | recorded episode trace |
| Environment | workflow runtime + tools + scoring rules |

## Example

User asks:

```txt
Find the termination clause and cite the source.
```

The agent can choose:

```txt
search → answer
```

or:

```txt
rewrite_query → search → rerank → extract → verify → answer
```

The second path costs more but may score higher on legal/compliance tasks.

## What improves

Not the base model at first.

The optimized object is the orchestration policy:

```txt
When should the agent search?
When should it rerank?
When should it verify?
When should it stop?
Which context should be injected?
```

## Algorithms by product stage

### Bandits

Best first algorithm.

Use when the system chooses between fixed strategies:

```txt
simple_rag
rag_with_rerank
rag_with_verify
multi_step_agent
```

The bandit learns which strategy performs best by task type.

### Monte Carlo evaluation

Useful when we can run many episodes and estimate average returns for policies.

### GRPO-style group optimization

Useful when we generate multiple candidate traces or answers, score them, and reinforce the better group.

For the framework, this can start without weight updates:

```txt
Generate candidates → score candidates → select best candidate
```

Later it can become actual model/policy training.

### PPO

Useful when the agent has a true multi-step policy and enough rollout data.

PPO should not be used until:

- the environment is stable,
- actions are discrete and well-defined,
- rewards are trusted,
- the trace store has enough episodes.

## Reward examples

```txt
+1.0 citation exists in retrieved documents
+1.0 answer contains required clause
+0.5 uses verify before final answer
-0.2 each unnecessary tool call
-0.5 unsupported claim
-0.3 latency above threshold
-0.3 cost above threshold
```

## Main product insight

The first product is not "RL for LLM weights".

The first product is:

```txt
RL-inspired context engineering for production agents.
```
