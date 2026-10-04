# IgnitionRAG trajectory evidence contract

## Current evidence boundary

The existing IgnitionRAG repository persists agent evaluation `result` and
`reportJson` via its Drizzle repository and exposes a scoped detail route:
`GET /:agentId/evaluations/:evaluationId`. Its live runner records messages and
tool calls. An `ExperimentResult` or tool trace alone does not establish a full
RL episode with observable pre-action states and transition rewards.

Issue [#56](https://github.com/IgnitionAI/ignition-agent-trainer/issues/56) therefore
remains open until an authorized real export is imported and actual paired
outcomes are inspected. No such export was found locally; Docker access was
denied. The synthetic contract example cannot satisfy this prerequisite.

## Export shape

An authorized exporter must supply this versioned envelope:

```ts
{
  schemaVersion: "ignitionrag.trajectory-export.v1",
  source: "ignitionrag",
  evidenceMode: "real" | "synthetic",
  environmentId: string,
  authorizationReference: string,
  rewardConfigId: string,
  exportedAt: string, // collection/export timestamp
  episodes: [{
    runId: string,
    episodeId: string,
    taskId: string, // stable across retries and baseline/learned policies
    workflowSnapshotId: string, // immutable environment/workflow definition
    policyId: string,
    collectedAt: string,
    done: boolean,
    truncated: boolean, // exactly one of done/truncated is true
    qualityScore: number, // actually measured, in [0, 1], same reward definition
    steps: [{
      state: object, // observable before this action
      action: { name: string, input?: object },
      observation: object, // observed after this action
      reward: number, // actual transition reward, not a fabricated alternative
      done: boolean,
      usage?: { costUsd?: number, latencyMs?: number }
    }]
  }]
}
```

Transitions must be contiguous after redaction; terminal flags must agree with
the episode. All rewards and measured usage must be finite; usage is nonnegative.
Do not reconstruct unobserved state, action choices or transition rewards from
an answer-only report. If the runtime lacks these fields, a separate IgnitionRAG
instrumentation PR is needed before using these records for learning.

## Executed episode recording

`recordIgnitionRagEpisode(environment, policy, options)` executes a supplied
`AgentEnvironment` through `runLearningEpisode` and returns the episode portion
of the export envelope. It snapshots allowlisted observations and object
arguments before a mutable tool executes, then records only the returned reward,
observation and terminal status. The step budget produces explicit truncation.
Exceptions fail the recording; they never manufacture a successful episode.
`evaluateQuality` must evaluate the executed result using the pinned quality
definition independently of total reward. `readMeasuredCost` may return a
provider-measured USD cost; omitting it leaves cost unavailable. Step latency is
measured wall time around `environment.step`, including its overhead, rather
than a provider-only latency. Caller-supplied provenance and `evidenceMode`
remain declarations requiring an independent check.

## Missing IgnitionRAG binding

The inspected IgnitionRAG `createAgentEvaluationLiveRunner` calls `chatStream`
or `chatStreamWithMcp` and collects `text`, `tool_call` and `tool_result` events.
Its result contains an answer, trace and aggregate token/latency usage. Its
`smoke-agent-trainer-packages.ts` only verifies installed package imports and
versions; it cannot execute an isolated real learning episode.

A real binding must provide the observable `reset` state, authorized `actions`
before each choice, and an awaited `step` yielding the actual post-tool state,
pinned transition reward and terminal flag. The learned policy must choose the
executed action at that same decision boundary. Record both policies on the same
reserved tasks and immutable snapshot, using the same reward/quality evaluator.
Do not infer per-tool USD cost from aggregate tokens or split total latency
between tool events. The existing stream collector has no pre-choice state,
reward or learned-action hook; turning its trace into these fields would invent
evidence. This recorder prepares the capture boundary, but does not supply or
claim that real binding. No authorization route or persistent deployment is
changed by this PR.

## Import and privacy

Use `importIgnitionRagTrajectories(raw, { pseudonymSalt, actionNames,
observationFields, argumentFields })`. The salt must be private, stable and at
least 16 characters; do not commit it or a raw-id lookup table. Identifiers are
HMAC pseudonyms. Use the same salt for comparison ids through
`pseudonymizeTrajectoryId`. The input content fingerprint enables auditability
without storing raw input in the resulting artifact.

The field maps explicitly permit only numbers, booleans or a finite list of
string values. Missing fields remain absent. Unlisted fields and arbitrary text
are dropped, including credentials, document text and user prompts. Numeric
inputs must be finite. Caller-owned allowlists must not enumerate secrets or
private text. Pseudonyms are not a promise of anonymity if the salt or underlying
case mapping is exposed. Raw exports belong outside Git and should remain in
the authorized isolated environment.

## Independent split and observed comparison

Choose a cutoff and protocol before inspecting final outcomes. Splitting removes
later records sharing either a task identity or a workflow snapshot with training.
For evaluation, baseline and learned policies must have actual observations for
the same reserved task and immutable workflow snapshot, under the same environment
and reward configuration. One record per policy/task/snapshot is required by
the current comparator; repetitions need an explicit aggregation protocol first.

The comparison reports paired quality deltas, tool deltas, measured cost/latency
deltas, exclusions and uncertainty. Missing cost/latency is `null`, not zero.
The protocol must explicitly classify every observed action through
`actionKinds: { toolName: "tool", finalAnswer: "control" }`. Missing classifications
are rejected. Tool counts use this pinned registry, never naming conventions.
The paired normal interval is approximate, needs at least 30 independent tasks
and is not valid evidence for correlated or cherry-picked cases. Small samples
retain their raw observations but cannot pass a positive-gain gate.

The comparator has no counterfactual estimator: a log containing only one chosen
action says nothing about alternative actions. Running both policies in an
authorized isolated evaluation or an executable replay can supply actual pairs;
provider-backed execution and changes to IgnitionRAG are outside this importer PR.
Synthetic data, insufficient coverage, absent/uncertain gain, truncations and
regressions block adoption. Even a positive comparison does not authenticate its
source and still requires provenance review. No live policy is activated.

## Executable synthetic contract proof

```bash
bun examples/react-policy-optimization/src/trajectory-evidence.ts /tmp/trajectory-evidence
bun test packages/rl/src/trajectory-import.test.ts
bun examples/react-policy-optimization/src/record-trajectories.ts /tmp/recorded-trajectories
bun test packages/rl/src/trajectory-recorder.test.ts
```

The example imports 60 explicitly synthetic episodes (30 actual fixture pairs),
redacts private fields, reports a quality delta and keeps missing usage unavailable.
Its decision is deliberately `do-not-adopt`: it proves the import/comparison
mechanics and does not establish improvement in IgnitionRAG.
The recording example executes two written policies against the synthetic order
environment, exports their actual transitions, measures step latency, leaves
cost unavailable and imports the result. It establishes the recorder/import
boundary and declares `evidenceMode: "synthetic"`; it supplies no real gain proof.

## Required real-data proof

- Obtain an authorized export and verify its provenance against the actual run.
- Pin the task/snapshot split, quality definition and comparison thresholds.
- Import it, inspect rejected records and verify complete transitions.
- Run or retrieve actual paired baseline/learned observations on reserved tasks.
- Inspect quality, measured cost where available, tool counts and uncertainty.
- Conclude non-adoption for absent gain or regression; keep #56 open if any of
  these requirements remains unavailable or unproven.

The user-owned [#57](https://github.com/IgnitionAI/ignition-agent-trainer/issues/57)
policy-artifact work and [#58](https://github.com/IgnitionAI/ignition-agent-trainer/issues/58)
algorithm decision follow the requested sequence. This document does not claim
they are implemented.

### Source-compatible live policy binding

`createIgnitionRagPolicyBinding` in the RL package loads a frozen tabular artifact
for the live projection `ignitionrag.evaluation.observation` version 1. Its
parameters must be `{ fields: ["modelCalls", "toolCalls", "lastToolFailed"] }`.
The observation contains exactly those fields: nonnegative safe integer counters
and a boolean recording the last observed tool failure. The Q-table state key
is canonical JSON with sorted keys, for example
`{"lastToolFailed":false,"modelCalls":1,"toolCalls":0}`.

The factory requires the full tool action registry plus `__answer__`, the
`ignitionrag.sparse-quality.v1` reward configuration and an explicitly expected
provenance mode. It returns artifact metadata and a `chooseAction` callback that
obeys the actual available action mask. Intermediate reward is zero; terminal
quality must be measured independently by the caller. The runner also owns the
execution budget and authenticated dataset access. Provenance declarations and
artifact checksums do not establish authenticity or evidence of real gains.

This API is available in source and draft artifacts. It is not part of the
published alpha.2 packages; cross-repository verification must use an explicitly
configured source checkout or reviewed build, without silently assuming a
published release contains it. Linear artifacts require a separately specified
feature projection and are rejected by this binding.
