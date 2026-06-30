# IgnitionRAG Implementation Handoff

This handoff turns the existing IgnitionRAG integration design into an implementation sequence for the hosted IgnitionRAG product.

Related design docs:

- `docs/10-ignitionrag-integration-design.md`
- `docs/04-ignitionrag-integration.md`
- `docs/IGNITIONRAG_EVALUATION_CENTER_CHECKLIST.md`
- `packages/adapter-ignitionrag/README.md`

## Implementation Rule

Ignition Agent Trainer remains the TypeScript evaluation engine.

IgnitionRAG owns the hosted product surface:

- tenants and authorization,
- projects and collections,
- workflow and agent persistence,
- workflow snapshot loading,
- background jobs,
- report storage,
- UI for Evaluation Center, Experiment Lab and recommendations.

Do not copy internal package implementation into IgnitionRAG. Consume package APIs.

## Packages To Consume

| Package | IgnitionRAG usage |
|---|---|
| `@ignitionai/agent-trainer-core` | Shared `Dataset`, `DatasetItem`, `AgentVariant`, `ExperimentResult`, trace, usage and metadata types. |
| `@ignitionai/agent-trainer-evals` | Low-level deterministic rewards such as required text, citations, latency, cost and tool usage. |
| `@ignitionai/agent-trainer-preset-rag` | RAG reward presets for Evaluation Center and Experiment Lab defaults. |
| `@ignitionai/agent-trainer-preset-strategies` | Deterministic strategy presets for early mocked and local comparisons. |
| `@ignitionai/agent-trainer-adapter-ignitionrag` | Type-level boundary for collection, workflow, agent, experiment request and report result shapes. |
| `@ignitionai/agent-trainer-experiments` | `createExperiment()`, `defineExperiment()`, regression gates and local history primitives. |
| `@ignitionai/agent-trainer-exporters` | JSON, Markdown and local report bundle output. |
| `@ignitionai/agent-trainer` | Deterministic recommendation and objective ranking helpers. |
| `@ignitionai/agent-trainer-cli` | Local developer and CI reference implementation. |

## API Boundary

IgnitionRAG should implement an adapter that satisfies:

```ts
import type { IgnitionRagAdapterContract } from "@ignitionai/agent-trainer-adapter-ignitionrag";
```

The adapter receives an `IgnitionRagExperimentExecutionRequest` and returns an `IgnitionRagExperimentExecutionResult`.

IgnitionRAG is responsible for converting saved workflow or agent snapshots into executable `AgentVariant` objects. Agent Trainer should not know how IgnitionRAG stores workflows, collections, tenants or projects.

Boundary summary:

| Area | Owner |
|---|---|
| Dataset schema mapping | Shared, but persisted by IgnitionRAG |
| Workflow snapshot loading | IgnitionRAG |
| Agent/workflow execution | IgnitionRAG adapter |
| Reward composition | Agent Trainer packages |
| Experiment aggregation | `@ignitionai/agent-trainer-experiments` |
| Report serialization | `@ignitionai/agent-trainer-exporters` |
| Hosted report storage | IgnitionRAG |
| Recommendation display | IgnitionRAG UI using `@ignitionai/agent-trainer` output |

## Feature 1: Evaluation Center

Goal:

```txt
Evaluate one workflow or agent against a dataset and show a report.
```

Initial flow:

1. User selects an IgnitionRAG collection and workflow snapshot.
2. User selects or imports an evaluation dataset.
3. IgnitionRAG maps stored cases into `DatasetItem[]`.
4. IgnitionRAG creates one executable `AgentVariant`.
5. IgnitionRAG composes rewards with `ragQualityPreset()` or explicit `@ignitionai/agent-trainer-evals` rewards.
6. IgnitionRAG calls `createExperiment()`.
7. IgnitionRAG stores the returned `ExperimentResult`.
8. IgnitionRAG exports JSON or Markdown with `@ignitionai/agent-trainer-exporters`.

Minimum output:

- overall score,
- reward breakdown,
- failed cases,
- trace view,
- latency and cost,
- downloadable JSON/Markdown report.

Do not add optimization or strategy selection in this feature.

## Feature 2: Experiment Lab

Goal:

```txt
Compare multiple workflow or agent variants over the same dataset.
```

Initial variants:

- current workflow snapshot,
- previous workflow snapshot,
- direct answer baseline,
- RAG basic,
- RAG with verification.

Implementation flow:

1. Build one shared `Dataset`.
2. Build multiple `AgentVariant` objects from workflow or agent snapshots.
3. Run one `createExperiment()` call with all variants.
4. Persist the full `ExperimentResult`.
5. Display leaderboard, reward averages, failed cases, cost and latency.
6. Export a report bundle with `writeReportBundle()` for debugging or CI artifacts.

Use `@ignitionai/agent-trainer-preset-strategies` only for mocked defaults, demos or local comparisons. Real IgnitionRAG variants should come from saved workflow snapshots.

## Feature 3: Context Engineering Recommendations

Goal:

```txt
Turn experiment results into deterministic next actions.
```

Initial recommendations should use:

- `recommendVariant()`,
- `selectBestVariant()`,
- `rankVariants()`,
- objective helpers from `@ignitionai/agent-trainer`.

Recommended UI output:

- winning variant,
- confidence,
- score gap,
- reasons,
- tradeoffs,
- suggested next experiment.

Keep recommendations deterministic. Do not generate prompts, mutate workflows or call providers during this phase.

## Data Model Suggestions

Suggested records for the first implementation:

```txt
evaluation_dataset
evaluation_case
workflow_snapshot
experiment_run
experiment_variant
experiment_case_result
report_artifact
recommendation
```

Minimum fields:

| Record | Minimum fields |
|---|---|
| `evaluation_dataset` | `id`, `tenant_id`, `project_id`, `name`, `metadata`, timestamps |
| `evaluation_case` | `id`, `dataset_id`, `input`, `expected_json`, `metadata_json` |
| `workflow_snapshot` | `id`, `workflow_id`, `version`, `config_json`, timestamps |
| `experiment_run` | `id`, `dataset_id`, `name`, `status`, `started_at`, `ended_at`, `result_json` |
| `experiment_variant` | `id`, `experiment_run_id`, `name`, `workflow_snapshot_id`, `score`, `summary_json` |
| `experiment_case_result` | `id`, `experiment_run_id`, `case_id`, `variant_id`, `score`, `trace_json`, `usage_json` |
| `report_artifact` | `id`, `experiment_run_id`, `format`, `storage_url`, `metadata_json` |
| `recommendation` | `id`, `experiment_run_id`, `winner_variant_id`, `summary`, `metadata_json` |

Store the raw `ExperimentResult` first. Normalize secondary tables after the first end-to-end path works.

## Rollout Order

1. Local worker proof:
   - load one saved workflow snapshot,
   - map it to `AgentVariant`,
   - run one dataset,
   - store raw `ExperimentResult`.

2. Evaluation Center:
   - single workflow,
   - deterministic rewards,
   - JSON/Markdown report.

3. Experiment Lab:
   - multiple variants,
   - leaderboard,
   - report bundle artifact.

4. Context Engineering Recommendations:
   - deterministic winner and tradeoff summary,
   - no mutation or generation.

5. Regression checks:
   - compare current run to a stored baseline,
   - fail publish checks on score, latency or cost regression.

6. Later policy work:
   - use policy abstractions and trajectory data only after the above surfaces are stable.

## Explicit Non-goals

This handoff does not include:

- frontend implementation,
- database migrations,
- auth or billing,
- real provider calls,
- workflow mutation,
- prompt generation,
- PPO,
- GRPO,
- model fine-tuning.

## Done Criteria For IgnitionRAG Adoption

The first adoption slice is done when:

- IgnitionRAG can run one workflow snapshot against one dataset,
- the result is an `ExperimentResult`,
- the report can be exported,
- failures are inspectable by case,
- no Agent Trainer package has been forked into IgnitionRAG.
