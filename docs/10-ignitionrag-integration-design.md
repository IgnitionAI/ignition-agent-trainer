# IgnitionRAG Integration Design

## Purpose

This document defines how IgnitionRAG should consume Ignition Agent Trainer before any SaaS implementation begins.

The integration should turn IgnitionRAG from a workflow and RAG builder into a measurable agent improvement platform:

```txt
IgnitionRAG workflow
-> evaluation dataset
-> experiment variants
-> rewards
-> leaderboard
-> recommendation
-> regression checks
```

This is a product integration design only. It does not add app code, database tables, API routes, UI, billing, auth or live provider calls.

For the first Evaluation Center implementation checklist, see `docs/IGNITIONRAG_EVALUATION_CENTER_CHECKLIST.md`.

## Integration Boundary

Ignition Agent Trainer stays as the open-source TypeScript evaluation engine. IgnitionRAG becomes the hosted product surface that stores projects, datasets, workflows, reports and governance state.

Package responsibilities:

- `@ignitionai/core`: shared dataset, variant, trace, usage and report types.
- `@ignitionai/evals`: reusable reward functions for correctness, citations, latency and cost.
- `@ignitionai/experiments`: deterministic experiment execution and aggregation.
- `@ignitionai/exporters`: JSON and Markdown report generation.
- `@ignitionai/cli`: local and CI experiment execution.
- `@ignitionai/trainer`: deterministic ranking, recommendations, candidate evaluation and grid search.
- `@ignitionai/adapter-*`: wrappers for external TypeScript agent frameworks.
- `@ignitionai/rl`: experimental only after the deterministic product loop is stable.

IgnitionRAG should not fork these primitives. It should call them from backend workers or local development workflows and persist their normalized outputs.

## Product Surfaces

### Evaluation Center

Evaluation Center is the place where a user manages datasets and sees single-workflow quality reports.

Primary jobs:

- create datasets from manual cases, CSV/JSON imports, production traces and failed conversations,
- map expected answers, required text, citations and metadata to `DatasetItem`,
- run one workflow or agent variant against a dataset,
- display score, reward breakdown, failed cases, traces, latency and cost,
- export the report as JSON or Markdown.

Initial product rule:

- a dataset is a first-class artifact, not an implementation detail of one workflow.

### Experiment Lab

Experiment Lab compares multiple variants over the same dataset.

Example variants:

```txt
simple-rag
rag-rerank
rag-rerank-verify
rag-topK-10
```

Expected output:

- leaderboard,
- per-reward score breakdown,
- failed case list,
- trace comparison,
- cost and latency comparison,
- winner and recommendation.

Implementation mapping:

- each IgnitionRAG workflow snapshot becomes an `AgentVariant`,
- each dataset becomes a `Dataset`,
- each experiment run calls `createExperiment()`,
- the returned `ExperimentResult` is stored and can be exported.

### Context Engineering Recommendations

Recommendations turn experiment output into next actions.

Near-term recommendations should stay deterministic:

- select the best variant for `quality-first`, `cost-first`, `latency-first` or `balanced`,
- suggest rerunning close contenders on a larger dataset,
- flag missing latency or cost instrumentation,
- recommend testing a cheaper or faster version of a high-quality winner,
- use grid search for explicit parameters such as `topK`, `rerank` and `verify`.

The system must not generate prompts, mutate workflows or call external providers during this phase.

### Regression Checks

Regression checks make experiments useful in CI and release gates.

IgnitionRAG should support two paths:

- local developer path: run `ignition eval run ./experiment.ts` and compare the result against a baseline,
- hosted path: run a saved experiment before publishing a workflow revision.

Gate examples:

- fail if score drops by more than an allowed threshold,
- fail if latency increases beyond a threshold,
- fail if cost increases beyond a threshold,
- fail if required variants disappear from the leaderboard.

Regression checks should consume the same `ExperimentResult` shape used by exporters and recommendations.

### Future Agent Trainer

Agent Trainer is the future product surface for strategy selection.

Early Agent Trainer should not mean PPO or GRPO. It should mean:

- deterministic strategy ranking,
- fixed candidate evaluation,
- parameter grid search,
- simple recommendation history,
- later, an experimental bandit selector over fixed strategy arms.

Only after those surfaces are stable should IgnitionRAG explore GRPO-style candidate selection or PPO-like policy optimization.

## Data Contracts

The first hosted implementation should persist normalized records that mirror the open-source report shape.

### Evaluation Dataset

```ts
interface EvaluationDatasetRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  source: "manual" | "import" | "trace" | "failed-conversation";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### Evaluation Case

```ts
interface EvaluationCaseRecord {
  id: string;
  datasetId: string;
  input: string;
  expected?: {
    exact?: string;
    contains?: string[];
    citations?: string[];
    json?: unknown;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}
```

### Experiment Definition

```ts
interface ExperimentDefinitionRecord {
  id: string;
  tenantId: string;
  name: string;
  datasetId: string;
  variants: Array<{
    id: string;
    name: string;
    workflowSnapshotId: string;
    config?: Record<string, unknown>;
  }>;
  rewards: Array<{
    name: string;
    weight?: number;
    config?: Record<string, unknown>;
  }>;
  objective?: "quality-first" | "cost-first" | "latency-first" | "balanced";
}
```

### Experiment Run

```ts
interface ExperimentRunRecord {
  id: string;
  definitionId: string;
  tenantId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  startedAt?: string;
  endedAt?: string;
  resultJson?: unknown;
  reportJsonUrl?: string;
  reportMarkdownUrl?: string;
}
```

### Recommendation

```ts
interface RecommendationRecord {
  id: string;
  experimentRunId: string;
  objective: "quality-first" | "cost-first" | "latency-first" | "balanced";
  winnerVariantId?: string;
  summary: string;
  recommendations: string[];
  createdAt: string;
}
```

These are contracts for design alignment. They are not migrations and should not be implemented in this PR.

## Execution Model

### Local and CI

1. Developer writes a typed experiment file.
2. Developer runs the CLI.
3. CLI emits `ExperimentResult`.
4. Exporters write JSON or Markdown.
5. Regression gates compare current and baseline results.

### Hosted IgnitionRAG

1. User selects a dataset and workflow variants.
2. IgnitionRAG creates an experiment definition.
3. A backend worker loads workflow snapshots and dataset cases.
4. The worker adapts each workflow into `AgentVariant`.
5. `createExperiment()` runs the comparison.
6. Exporters create durable artifacts.
7. Trainer helpers generate recommendations.
8. IgnitionRAG stores the normalized result.

The hosted path should reuse the same package APIs as the local path.

## Rollout Plan

### Phase 1: Read-only Evaluation Reports

- import or create datasets,
- run one workflow against one dataset,
- store `ExperimentResult`,
- show score, failed cases, traces and export links.

### Phase 2: Experiment Lab

- compare multiple workflow snapshots,
- show leaderboard and reward breakdown,
- add objective-based ranking,
- expose JSON and Markdown exports.

### Phase 3: Regression Gates

- select a baseline run,
- compare current run against baseline,
- block workflow publish when configured gates fail.

### Phase 4: Context Engineering Recommendations

- recommend best variant by objective,
- suggest next experiment from tradeoffs,
- run deterministic grid searches for explicit parameters.

### Phase 5: Agent Trainer Prototype

- add fixed strategy arms,
- update arm rewards from experiment outcomes,
- keep the feature clearly experimental,
- avoid live production routing until governance and observability are ready.

## Non-goals

This integration design does not include:

- app code,
- SaaS code,
- database migrations,
- frontend implementation,
- API routes,
- auth,
- billing,
- live provider calls,
- prompt generation,
- workflow synthesis,
- PPO,
- GRPO,
- model training.

## Open Questions

- Which IgnitionRAG traces are stable enough to become dataset cases automatically?
- What minimum metadata is required to replay workflow snapshots deterministically?
- Should reports be stored as JSON blobs first, then normalized later?
- Which rewards are built in versus tenant-defined?
- How should private documents and citations be redacted from exported reports?
- What is the default baseline for regression gates: latest successful run, pinned release or manually selected run?
- How much run history should be kept before archival?
- Which product surface owns approvals when a regression gate fails?
