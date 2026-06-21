# IgnitionRAG integration plan

See [IgnitionRAG Integration Design](./10-ignitionrag-integration-design.md) for the detailed product surfaces, data contracts, execution model and open questions.

## Why IgnitionRAG is the ideal host

IgnitionRAG already owns the primitives that matter:

- collections,
- documents,
- chunks,
- retrieval,
- workflows,
- agents,
- tools,
- MCP server,
- observability hooks.

Adding evaluation and optimization is not a pivot. It is a maturity layer.

## Product modules

### 1. Evaluation Center

Users can create datasets from:

- manual questions,
- production traces,
- uploaded CSV/JSON,
- synthetic cases generated from documents,
- failed user conversations.

They can run one workflow against a dataset and get a score report.

### 2. Experiment Lab

Users compare multiple strategies:

```txt
Workflow A: simple RAG
Workflow B: RAG + rerank
Workflow C: RAG + verify
```

Output:

- leaderboard,
- metric breakdown,
- cost/latency comparison,
- failed cases,
- winning strategy.

### 3. Optimization Lab

The system proposes improvements:

- prompt variants,
- retrieval parameters,
- reranker on/off,
- HyDE on/off,
- verification step on/off,
- topK values,
- model choices.

### 4. Agent Trainer

The long-term module.

It learns routing and action policies:

```txt
For legal questions: verify always.
For FAQ questions: simple RAG.
For ambiguous questions: ask clarification.
For compliance questions: require citations.
```

## Data model sketch

### tables

```txt
evaluation_datasets
  id
  tenant_id
  name
  description
  created_at

 evaluation_cases
  id
  dataset_id
  input
  expected_json
  metadata_json

experiment_runs
  id
  tenant_id
  dataset_id
  name
  status
  created_at

experiment_variants
  id
  experiment_run_id
  name
  config_json

experiment_case_results
  id
  experiment_run_id
  variant_id
  case_id
  output_json
  trace_json
  usage_json
  score
  score_breakdown_json
```

## First IgnitionRAG MVP

1. Add dataset management.
2. Add run evaluation button on workflow page.
3. Run local evaluator in backend worker.
4. Store report.
5. Show leaderboard.
6. Export report as JSON/Markdown.

## Client-facing value

Instead of delivering only an agent, IgnitionAI can deliver:

```txt
Agent + evaluation dataset + performance report + optimization history.
```

That is more defensible and more premium.
