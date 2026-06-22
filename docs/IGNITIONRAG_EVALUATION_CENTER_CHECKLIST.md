# IgnitionRAG Evaluation Center Checklist

This checklist translates the alpha dogfood workflow into an actionable IgnitionRAG Evaluation Center implementation plan.

It is a product and backend integration checklist only. It does not add IgnitionRAG app code, database migrations, frontend implementation, auth, billing or live provider calls.

## Target User Flow

The first Evaluation Center slice should let an IgnitionRAG user:

1. Select a project or collection.
2. Select one workflow or agent snapshot.
3. Select an evaluation dataset.
4. Review dataset case count, required citations and risk metadata.
5. Choose the default RAG reward preset or explicit rewards.
6. Run the evaluation in a backend worker.
7. Review score, reward breakdown, failed cases, trace, latency and cost.
8. Export JSON and Markdown reports.
9. Promote a successful run as a baseline.
10. Run a later workflow snapshot against that baseline.

The first version may evaluate one workflow at a time. Multi-variant Experiment Lab comparisons come after this Evaluation Center path works end to end.

## Alpha Dogfood Mapping

| Alpha dogfood concept | IgnitionRAG concept | Agent Trainer object/API |
|---|---|---|
| `examples/alpha-dogfood` dataset | Evaluation dataset stored by project or collection | `Dataset`, `DatasetItem` |
| business question | Evaluation case input | `DatasetItem.input` |
| expected terms | Required answer fragments | `DatasetItem.expected.contains` |
| expected citations | Required source references | `DatasetItem.expected.citations` |
| task/risk metadata | Case metadata for filtering and reporting | `DatasetItem.metadata` |
| `direct-answer` | no-retrieval baseline workflow | `AgentVariant` |
| `rag-basic` | standard retrieval workflow snapshot | `AgentVariant` |
| `rag-rerank` | retrieval plus reranker workflow snapshot | `AgentVariant` |
| `rag-with-verification` | retrieval plus grounding verification workflow snapshot | `AgentVariant` |
| `agentic-rag` | multi-step workflow or agent snapshot | `AgentVariant` |
| `contains_all` | required answer fragment reward | `containsAll()` |
| `citation_presence` | citation coverage reward | `citationPresence()` or explicit scorer |
| `groundedness_like` | deterministic grounding proxy | custom reward or future preset |
| latency and cost rewards | operational quality metrics | `latencyPenalty()`, `costPenalty()` |
| leaderboard | report summary | `ExperimentResult.leaderboard` |
| recommendation | deterministic best strategy explanation | `recommendVariant()` |
| JSON/Markdown report | durable report artifact | `toJsonReport()`, `toMarkdownReport()` |
| regression gate | publish or release guard | `compareExperimentResults()`, `assertNoRegression()` |

## Required IgnitionRAG Data

IgnitionRAG must provide these records or equivalent in the first implementation:

| Data | Required fields | Notes |
|---|---|---|
| project or tenant | `tenantId`, `projectId` | Used for ownership and report isolation. |
| collection | `collectionId`, `name`, document source metadata | Needed for citation display and report context. |
| workflow snapshot | `workflowSnapshotId`, `workflowId`, `version`, executable config | Must be immutable for replay. |
| evaluation dataset | `datasetId`, `name`, `description`, `source`, timestamps | Dataset is a first-class artifact. |
| evaluation case | `caseId`, `input`, `expected`, `metadata` | Maps directly to `DatasetItem`. |
| citation reference | `documentId`, `chunkId` or stable source pointer | Required for citation rewards and report redaction. |
| run request | `runId`, selected dataset, selected workflow snapshot, reward config | Sent to the backend worker. |
| baseline reference | baseline `experimentRunId` or pinned report artifact | Required for regression gates. |
| report artifact | `format`, storage URL or blob key, generated timestamp | JSON and Markdown at minimum. |

## Backend Worker Checklist

The backend worker owns the hosted execution path.

Input handling:

- validate tenant, project, collection and workflow snapshot ownership,
- load an immutable workflow or agent snapshot,
- load dataset cases and expected values,
- reject empty datasets before running,
- reject cases without input text,
- preserve case metadata and citation requirements.

Dataset mapping:

- map stored cases to `DatasetItem[]`,
- map expected exact text, required fragments, citations and JSON expectations,
- preserve task type, risk level and citation requirement metadata,
- keep source identifiers stable enough for report review.

Variant mapping:

- turn the selected workflow snapshot into one executable `AgentVariant`,
- add optional baselines only when the product flow asks for comparison,
- preserve variant id, name, snapshot id and config metadata,
- capture output, trace, usage, latency and cost in the normalized run result.

Reward composition:

- start with deterministic rewards only,
- include required text coverage,
- include citation coverage when citations are expected,
- include latency and cost penalties when instrumentation exists,
- include a deterministic groundedness proxy only when trace or citation data supports it,
- avoid LLM-as-judge rewards in the first Evaluation Center slice.

Execution:

- call `createExperiment()` from `@ignitionai/experiments`,
- run one dataset against the selected variant or variant set,
- keep concurrency conservative until workflow execution is well understood,
- record failed cases without aborting the full run,
- store the raw `ExperimentResult` before normalizing secondary records.

Reports:

- generate JSON with `toJsonReport()`,
- generate Markdown with `toMarkdownReport()`,
- store report artifacts with stable links,
- include enough metadata to identify dataset, workflow snapshot, reward config and generated time,
- redact private document text before exposing exports outside the tenant boundary.

Recommendations:

- use `recommendVariant()` only when multiple variants are present,
- show reasons, tradeoffs and confidence,
- do not mutate prompts or workflows from recommendations in the Evaluation Center.

Regression gates:

- allow a user to pin a successful run as baseline,
- compare current run to baseline with score, latency and cost thresholds,
- fail a publish check when configured thresholds fail,
- make missing variants or missing required metrics visible in the result,
- store the regression comparison alongside the run.

## First Implementation Slice

The smallest useful IgnitionRAG PR should implement this path:

1. Load one saved workflow snapshot.
2. Load one saved dataset.
3. Map dataset cases to `DatasetItem`.
4. Map the workflow snapshot to one `AgentVariant`.
5. Run `createExperiment()`.
6. Store the raw `ExperimentResult`.
7. Generate JSON and Markdown reports.
8. Display or expose the report artifact links.

This slice proves Evaluation Center. It does not need Experiment Lab, Optimization Lab, Agent Trainer, UI polish or regression gates on day one.

## Acceptance Checklist

The first Evaluation Center implementation is acceptable when:

- one workflow snapshot can be evaluated against one dataset,
- no Agent Trainer package code is copied into IgnitionRAG,
- output is an `ExperimentResult`,
- failed cases are inspectable,
- traces and usage are preserved when available,
- JSON and Markdown reports can be generated,
- the run can be repeated against the same immutable snapshot,
- private citation data has a documented redaction path,
- non-goals remain out of scope.

## Open Integration Risks

- Workflow replay may not be deterministic if snapshots do not include all model, tool and retrieval settings.
- Citation rewards are weak if document, chunk or source references are not stable.
- Cost and latency comparisons are misleading if instrumentation is missing or inconsistent.
- Report exports can leak private document content unless redaction rules are explicit.
- Large datasets may require queueing, chunked execution and progress reporting.
- Failed tool calls need a normalized trace shape before UI inspection is useful.
- Baseline selection policy is unresolved: latest successful run, pinned release or manually selected run.
- Tenant-defined rewards need a safe configuration model before custom scoring is exposed.
- Multi-variant comparisons require clear ownership of workflow snapshots and variant labels.
- Production provider calls need rate limit, retry and cancellation behavior outside Agent Trainer.

## Non-goals

This checklist does not include:

- IgnitionRAG repo changes,
- database migrations,
- frontend implementation,
- auth,
- billing,
- real provider integration,
- hosted job infrastructure,
- prompt generation,
- workflow mutation,
- PPO,
- GRPO training,
- model fine-tuning.

## Next Step

After this checklist is reviewed, PR #40 should add a deterministic bridge prototype that maps IgnitionRAG-shaped records into `Dataset` and `AgentVariant` objects without requiring IgnitionRAG app code.
