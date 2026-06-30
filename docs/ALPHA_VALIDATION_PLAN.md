# Alpha Validation Plan

## Objective

The alpha validation objective is:

```txt
A developer should be able to define a realistic agent/RAG experiment, run it locally through the CLI, export a report, compare against a baseline, and understand which strategy should be used.
```

This phase intentionally stops adding framework abstractions until the end-to-end developer workflow has been proven on a realistic IgnitionRAG-style case.

## Alpha Scenario

Use case:

```txt
RAG agent strategy evaluation for an IgnitionRAG-style document assistant.
```

The scenario should feel like a real Evaluation Center workflow:

```txt
business questions
-> document-grounded answers
-> citations
-> strategy variants
-> rewards
-> leaderboard
-> recommendation
-> regression gate
-> local history
```

No real LLM API key is required for alpha dogfood. Responses may be mocked or semi-real, but the flow must match how a developer would evaluate an IgnitionRAG document assistant.

## Dataset

The alpha dataset should contain 20 to 50 representative business questions.

Dataset requirements:

- include document-grounded lookup questions,
- include synthesis questions that need multiple facts,
- include at least five citation-sensitive questions,
- include at least five cases where direct answers should underperform RAG,
- include metadata for task type, citation requirement and expected risk level,
- include expected text fragments through `contains`,
- include expected citation identifiers where applicable.

Example document assistant domains:

- customer support policy,
- contract review,
- onboarding handbook,
- product documentation,
- compliance FAQ.

The first dogfood experiment should use one coherent domain rather than a mixed demo dataset.

## Variants

The alpha experiment should compare these variants:

```txt
direct-answer
rag-basic
rag-rerank
rag-with-verification
agentic-rag
```

Expected behavior:

- `direct-answer`: no retrieval; useful baseline for hallucination and missing citation failures.
- `rag-basic`: retrieves context and answers with citations.
- `rag-rerank`: retrieves wider context, reranks, then answers.
- `rag-with-verification`: checks answer support before final response.
- `agentic-rag`: uses a multi-step trace with search, rerank, extract, verify and answer decisions.

The initial implementation can use deterministic mocked adapters if their traces, costs, latencies and outputs represent the intended strategy behavior.

## Rewards

The alpha experiment should use these rewards:

```txt
containsAll
citationPresence
groundedness-like score
latencyPenalty
costPenalty
compositeReward
```

Reward expectations:

- `containsAll`: verifies expected answer fragments are present.
- `citationPresence`: rewards required citations and penalizes missing citations.
- `groundedness-like score`: starts as a deterministic simple score based on citations, required text and trace support; it is not a model grader.
- `latencyPenalty`: makes slow strategies visible in the leaderboard.
- `costPenalty`: makes expensive strategies visible in the leaderboard.
- `compositeReward`: creates one quality/cost/latency objective for reporting and recommendations.

No LLM-as-judge reward should be required for alpha.

## Expected Outputs

The dogfood run must produce:

```txt
leaderboard
recommendation
JSON report
Markdown report
regression gate result
local history entry
```

A developer should be able to review the Markdown report without opening source code and understand:

- which variant won,
- why it won,
- which cases failed,
- how quality traded off against cost and latency,
- whether the current run regressed against the baseline.

## CLI Command

The expected CLI shape for the dogfood experiment is:

```bash
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --json reports/alpha-dogfood/report.json --markdown reports/alpha-dogfood/report.md --bundle reports/alpha-dogfood
```

The exact paths may change in PR #37, but the final command must:

- run the typed experiment through the CLI,
- generate JSON output,
- generate Markdown output,
- generate a timestamped report bundle.

## Regression Threshold

The alpha regression gate should compare the current result against a committed baseline.

Initial thresholds:

```txt
minimum overall score: 0.75
maximum score drop: 0.03
maximum latency increase: 20%
maximum cost increase: 20%
required variants: direct-answer, rag-basic, rag-rerank, rag-with-verification, agentic-rag
```

The gate should fail CI when:

- the best score drops beyond the allowed threshold,
- a required variant disappears,
- latency or cost increases beyond the configured threshold,
- the report cannot be generated.

## Alpha Usability Criteria

The alpha is usable only when:

- experiment can be run from CLI,
- output is understandable by a developer,
- report can be reviewed without reading source code,
- regression gate can fail CI when score drops,
- recommendation explains quality/cost/latency tradeoffs,
- no real LLM API key is required for alpha dogfood.

## Non-goals

Do not include these in the alpha validation plan:

- frontend,
- database,
- SaaS integration,
- real OpenAI or Anthropic calls,
- PPO implementation,
- GRPO training,
- model fine-tuning,
- production IgnitionRAG integration.

## Next PR Sequence

### PR #37 - `feat: add alpha dogfood experiment`

Goal:

Create the runnable dogfood experiment described by this plan.

Scope:

- add `examples/alpha-dogfood`,
- add a 20 to 50 case deterministic dataset,
- add the five required variants,
- add rewards and a recommendation path,
- add JSON/Markdown/report-bundle output docs,
- add a regression-gate example for the dogfood baseline.

Out of scope:

- real LLM calls,
- frontend,
- database,
- production IgnitionRAG integration,
- PPO or GRPO training.

Acceptance commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run --filter './examples/alpha-dogfood' dev
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --bundle reports/alpha-dogfood
```

Definition of done:

- dogfood experiment runs end to end,
- reports are generated,
- regression gate behavior is documented,
- no API key is required.

### PR #38 - `chore: prepare v0.1.0-alpha.0 readiness`

Goal:

Prepare the repository for a first internal alpha tag.

Scope:

- audit package versions and package metadata,
- document alpha tag criteria,
- update release notes or changelog docs,
- confirm all alpha validation commands pass.

Out of scope:

- npm publication,
- runtime feature work,
- API redesign,
- production deployment.

Acceptance commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- alpha readiness criteria are explicit,
- package metadata is internally consistent,
- tag process is documented but not necessarily executed.

### PR #39 - `docs: add IgnitionRAG Evaluation Center integration checklist`

Goal:

Translate the alpha dogfood workflow into an IgnitionRAG Evaluation Center integration checklist.

Scope:

- define Evaluation Center user flow,
- map datasets, variants, rewards, reports and regression gates to IgnitionRAG concepts,
- list backend worker responsibilities,
- list data required from IgnitionRAG,
- identify open integration risks.

Out of scope:

- IgnitionRAG repo changes,
- database migrations,
- frontend implementation,
- auth or billing.

Acceptance commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- checklist is actionable for an IgnitionRAG implementation PR,
- open risks are explicit,
- no runtime code is changed.

### PR #40 - `feat: add IgnitionRAG evaluation bridge prototype`

Goal:

Create a minimal bridge prototype showing how IgnitionRAG-shaped records can become an Ignition Agent Trainer experiment.

Scope:

- add a small prototype module or example,
- map IgnitionRAG-style dataset and workflow records to `Dataset` and `AgentVariant`,
- run the alpha-style evaluation loop locally,
- keep the bridge deterministic and provider-free.

Out of scope:

- production IgnitionRAG integration,
- database access,
- auth,
- SaaS UI,
- real provider calls,
- PPO or GRPO training.

Acceptance commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Definition of done:

- bridge prototype proves the data mapping,
- no IgnitionRAG app code is required,
- limitations are documented.
