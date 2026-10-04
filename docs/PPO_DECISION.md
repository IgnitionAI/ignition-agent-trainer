# PPO decision for ReAct action learning

Decision: **BLOCKED — NOT PROVEN** for production algorithm selection
([issue #58](https://github.com/IgnitionAI/ignition-agent-trainer/issues/58)).
Do not implement or adopt PPO from the current evidence. Continue evaluating
observable-feature Q-learning against handwritten ReAct. This is a decision
record, not a claim that the real-data prerequisites have been completed.

## Measured evidence

The [compact evidence artifact](PPO_EVIDENCE.json) records source commit
`36ed285fc0b87de1419aacb37ce5f51bfed72a2a`, protocol, seeds and SHA-256 hashes of
regenerated synthetic reports. Reports were regenerated with Bun 1.4.2:

```bash
bun examples/react-policy-optimization/src/learning.ts /tmp/issue58-evidence
bun examples/react-policy-optimization/src/robustness.ts /tmp/issue58-evidence
bun examples/react-policy-optimization/src/features.ts evaluation /tmp/issue58-evidence
# Local lifecycle evidence at source 37f7f40:
bun test packages/rl/src/policy-registry.test.ts
bun examples/react-policy-optimization/src/registry.ts /tmp/issue58-lifecycle
```

| Observation | Measurement | Meaning and boundary |
| --- | --- | --- |
| Tabular action learning works on compact states | Seed 53, 400 training episodes; 24 held-out cases: learned and handwritten success 100%, reward 0.96, two tool calls | No measured quality/cost gain over handwritten ReAct on this fixture |
| Robustness gate passes | Seeds 1–5, 80 cases per policy/seed; all learned and handwritten cases succeed; zero unsupported answers/truncations | Safety masks force clarification/abstention in some states; this is not learned recovery |
| Exact-state representation fails unseen combinations | Seeds 1–5; 2,000 training episodes per method/seed; exact-feature-key tabular succeeds on 0/32 held-out cases each seed | An encoding limitation in this comparison, not a proof that all tabular methods fail |
| Feature composition resolves that fixture | Linear succeeds on 32/32 each seed, 24 features, six actions, 144 weights; maximum observed final horizon four actions | Changing representation suffices here; no observed need for a nonlinear actor |
| Stability | Both feature learners remain unchanged during evaluation; linear success is identical across five seeds | Zero observed success variance here does not establish stochastic-provider stability |
| Training cost | 400 or 2,000 synthetic episodes per seed; no provider usage/cost measured | Episode counts are known; dollar cost, comparative training time and real sample efficiency are unknown |

Task reward is delayed until answer/clarification; intermediate tool penalties
are immediate. These short deterministic horizons do not establish a long-horizon
credit-assignment bottleneck. Real action-space size, horizon distribution,
reward delay, coverage, variance and training costs remain unmeasured.
[#56](https://github.com/IgnitionAI/ignition-agent-trainer/issues/56) lacks verified
real paired trajectories. [#57](https://github.com/IgnitionAI/ignition-agent-trainer/issues/57)
local lifecycle is verified at source `37f7f40`: versioned artifacts reload
without calibration, promotion gates reject regressions/missing required cost,
rollback restores baseline choices, and interruption tests preserve a valid active
version. These are isolated synthetic/local checks, not production deployment proof.
The local gate deliberately allows two extra tools versus an untrained baseline;
it does not establish superiority over handwritten ReAct or the stronger PPO gate.

## Simpler options before PPO

| Option | When to investigate | Relative cost and evidence |
| --- | --- | --- |
| Improve observable encoding or linear features | Unseen state combinations fail but observations contain the needed information | Fixed 144-weight fixture already resolves this failure; real benefit remains unproved |
| Tune exploration on a reserved validation split | Coverage or visitation is poor | Reuses existing learner; requires additional real episodes and a matched budget, not a larger actor/critic |
| Monte Carlo return updates | Terminal outcomes dominate and episodes reliably finish | Avoids a bootstrap estimate but waits for full episodes; variance/cost must be measured, not assumed better |
| Fixed-policy bandit | One independent routing decision per task | Existing strategy-selection example is simpler; cannot learn within-episode tool sequences |
| Keep handwritten ReAct | No reliable quality or tool/cost advantage is measured | Current compact fixture ties the learned policy; retain as a baseline rather than claiming learned superiority |

These are candidate experiments, not conclusions about production performance.

## PPO readiness inventory

PPO alternates collection and optimization. Its clipped objective compares old
and new action probabilities and uses advantages. It is on-policy; old arbitrary
logs do not supply fresh rollout batches. See the [original paper](https://arxiv.org/abs/1707.06347)
and [OpenAI Spinning Up algorithm documentation](https://spinningup.openai.com/en/latest/algorithms/ppo.html).

| Prerequisite | Current status | Authoritative surface |
| --- | --- | --- |
| Probabilistic action policy and masked distribution | Missing explicit distribution/log-probability API; epsilon exploration alone is insufficient | `packages/rl/src/q-learning.ts`, `linear-q-learning.ts`: chooseAction returns an action |
| Behavior-policy version and collection log probabilities | Missing in imported trajectory schema | `packages/rl/src/trajectory-import.ts`: ImportedTransition has no behavior log-probability |
| Fresh authorized on-policy rollout collection | Not proven for IgnitionRAG | #56 and [trajectory contract](TRAJECTORY_EVIDENCE.md) |
| Value estimate, advantage computation and terminal/truncation treatment | PPO components absent; Q values are not an implemented actor/critic advantage pipeline | `packages/rl/src/learning-episode.ts`, `q-learning.ts` |
| Immutable policy identity, baseline comparison and rollback | Verified locally; production integration remains unproven | #57; artifact/registry tests and executable `registry.ts` |
| Isolated environment and measured budgets | Real execution/usage unavailable | #56; synthetic execution is available only |

No imported offline record is relabeled on-policy. Neither missing probabilities
nor alternative-action rewards may be reconstructed from answer-only traces.

## Conditional prototype contract

The following proposed protocol is fixed in this record but **not activated**.
Before a GO, verify real #56 outcomes and the #57 lifecycle in the target runtime,
freeze a real task/workflow split and reward definition,
measure real horizons/coverage, and show persistent failure of the best simpler
method under equal sampling budgets. A GO additionally requires funded measured
usage, executable on-policy collection and a separate bounded implementation ticket.

- Primary metric: paired held-out task-quality difference against the strongest
  validated simpler policy; handwritten ReAct remains a second comparator.
- Seeds: 1–5 for every trained method. Reserve at least 30 independent final tasks,
  with paired runs under identical immutable workflow snapshots; correlated tasks
  require cluster-aware uncertainty, not a naive independent interval.
- Maximum prototype collection: 10,000 episodes total per method across seeds,
  at most 32 tool actions per episode and eight hours elapsed. No GPU provisioning.
  These are ceilings, not evidence that sampling is affordable or sufficient.
- Provider budget is currently zero: no paid collection until an authorized dollar
  ceiling and pricing/usage accounting are recorded in the prototype ticket.
- GO-to-adopt gate: lower 95% confidence bound on paired quality improvement
  strictly above zero, no safety violations, no category quality regression,
  no increase in truncation rate, and no increase in measured mean tool calls,
  provider cost or latency against the stronger baseline. Missing usage blocks.
- Exceeding a budget, unstable seed results, or insufficient uncertainty/coverage
  stops the prototype with no adoption. Save policy/protocol/run identities and
  prove rollback through #57 before any activation.

No prototype issue is created while the decision is blocked. Revisit this record
using actual #56 outcomes and target-runtime #57 lifecycle verification; keep #58
open until that
review is complete. A future NO-GO should identify measured reasons to retain a
simpler method; a future GO must link the separate prototype issue and its budget.
