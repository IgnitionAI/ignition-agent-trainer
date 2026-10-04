# ReAct policy optimization

A local, deterministic ReAct controller uses `lookup_price` and `calculate_total`
tools to answer order-total questions. It chooses the next action from the tool
observation rather than following a fixed action list. The tools execute actual
lookup and arithmetic against synthetic catalog fixtures; the controller is
rule-based, with no LLM provider calls.

```bash
bun run --filter './examples/react-policy-optimization' dev
bun examples/react-policy-optimization/src/index.ts reports/react-policy
```

The second command writes `policy-selection.json` and `trajectories.json`.

Three policies are executed on every task: direct answer, lookup only, and ReAct.
Correct answers receive reward 1; each tool call costs 0.02. Three calibration
orders and two distinct evaluation orders produce 15 observed trajectories.
The ReAct policy skips calculation when the quantity is one.

`optimizePolicyOffline()` replays the observed episode rewards, updates a fixed
strategy bandit's mean rewards and selects the best policy with exploration
disabled. Evaluation records never update the bandit. Expected evaluation mean
rewards are ReAct 0.97, lookup 0.48, and direct 0.

This is lightweight policy optimization over fixed strategies. It does not
learn the ReAct controller's individual actions or train model weights. The
offline loop has full information because every strategy was executed on every
order. Logged trajectories for just one chosen action cannot establish rewards
for alternatives. Synthetic results demonstrate framework behavior; they do
not establish improvement in production IgnitionRAG. No PPO is implemented.

Tests protect observation-driven branching, independent evaluation, reward
selection and invalid offline inputs:

```bash
bun test examples/react-policy-optimization/src/example.test.ts packages/rl/src/policy-optimization.test.ts
```
