# ReAct policy optimization

## Generalization and robustness campaign

```bash
bun examples/react-policy-optimization/src/robustness.ts /tmp/react-robustness
```

The versioned corpus has eight categories with ten cases each, evaluated on
seeds 1–5: interpolation, unseen values, missing prices, unknown products,
transient/permanent tool failures, incomplete tool responses and missing
quantities. Each seed trains on the unchanged calibration from the learning
example. It compares the frozen learner against a failure-aware handwritten
ReAct using identical tasks, rewards and budgets (four steps, two lookup tries).

The gate requires no success regression per category, no unsupported numeric
answers, no budget truncation and no increase in tool calls. Reports include
every category, even when it fails. A negative-control policy deliberately
answers incorrectly after successful tools and must fail the success gate.

The tool contract masks answers without supporting observations and bounds
retries. Clarification/abstention on unrecoverable failures is constrained by
the available actions; this campaign does **not** claim the learner discovered
that safety behavior. Normal states still offer competing actions. Results are
synthetic and establish whether the richer-state experiment may proceed, not
whether a policy should be deployed.

## Learning tool actions

```bash
bun src/learning.ts /tmp/react-learning
```

From the repository root:

```bash
bun examples/react-policy-optimization/src/learning.ts /tmp/react-learning
```

This second scenario trains tabular Q-learning on 400 episodes across six
calibration tasks (seed 53, alpha 0.3, gamma 1, epsilon 0.3). Twenty-four held-out
orders use both prices and multiple quantities absent from calibration. A
separate single-item probe checks that calculation is skipped. The controller
learns the next action from observable categories; the action binder formats
answers only from tool results.

The JSON report keeps task ids, hyperparameters, training rewards, truncations,
Q-values and per-case evaluation trajectories. It compares an untrained policy,
direct answers, handwritten ReAct and the frozen learned policy. The learned
policy reaches 100% accuracy and mean reward 0.96 on the held-out orders, equal
to handwritten ReAct. No production or LLM training claim follows from this
synthetic fixture. Freezing detaches the table and disables exploration/updates.

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
