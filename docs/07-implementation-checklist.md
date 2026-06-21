# Implementation checklist

## Repo setup

- [ ] Confirm name: `ignition-agent-trainer` or `ignition-trainer`.
- [ ] Push initial repo to GitHub.
- [ ] Configure branch protection.
- [ ] Configure GitHub Actions.
- [ ] Add package publishing strategy.

## Core package

- [ ] Finalize `DatasetItem`.
- [ ] Finalize `ExpectedOutput`.
- [ ] Finalize `AgentAdapter`.
- [ ] Finalize `AgentTrace`.
- [ ] Finalize `RewardFunction`.
- [ ] Add Zod schemas if runtime validation is needed.

## Evals package

- [ ] `exactMatch()`.
- [ ] `containsText()`.
- [ ] `citationPresence()`.
- [ ] `toolCallCountPenalty()`.
- [ ] `latencyPenalty()`.
- [ ] `costPenalty()`.
- [ ] `weightedAverage()`.
- [ ] add tests.

## Experiments package

- [ ] variant runner.
- [ ] concurrency control.
- [ ] retries.
- [ ] case-level results.
- [ ] leaderboard.
- [ ] JSON serializer.
- [ ] Markdown report serializer.

## Adapters

- [ ] LangChain runnable adapter.
- [ ] LangGraph graph adapter.
- [ ] Mastra agent adapter.
- [ ] Vercel AI SDK function adapter.
- [ ] IgnitionRAG workflow adapter.

## Trainer package

- [ ] select best variant.
- [ ] prompt candidate evaluation.
- [ ] retrieval config search.
- [ ] Pareto ranking.
- [ ] bandit integration.

## Environment package

- [ ] state/action/reward types.
- [ ] episode runner.
- [ ] trajectory schema.
- [ ] rollout storage.

## RL package

- [ ] epsilon-greedy bandit.
- [ ] UCB bandit.
- [ ] Thompson sampling.
- [ ] GRPO-style group scorer.
- [ ] PPO design doc.
- [ ] PPO prototype only after enough rollouts.

## IgnitionRAG integration

- [ ] dataset tables.
- [ ] experiment tables.
- [ ] workflow variant export.
- [ ] collection config variant export.
- [ ] dashboard page.
- [ ] report export.
- [ ] CI mode for customer projects.
