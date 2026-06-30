# Codex runbook

This is the main instruction file for future Codex implementation sessions in Ignition Agent Trainer.

## Required startup protocol

Every future Codex session must start by reading:

```txt
README.md
docs/IMPLEMENTATION_PLAN.md
docs/CODEX_RUNBOOK.md
docs/PR_PLAYBOOK.md
docs/BACKLOG.md
docs/POST_20_ROADMAP.md
docs/PROJECT_AUDIT.md
docs/ALPHA_VALIDATION_PLAN.md
docs/DEFINITION_OF_DONE.md
docs/MILESTONES.md
```

Then it must identify:

```txt
- current branch
- current PR number if any
- latest completed PR in BACKLOG
- next uncompleted PR
- exact scope of the current PR
```

Use the current worktree, GitHub PR state and repository files as authoritative. Do not rely only on previous chat context.

## Autonomous execution rule

Codex must implement only the next uncompleted PR from `docs/BACKLOG.md`, unless the user explicitly asks otherwise.

Codex must not skip PRs.

Codex must not combine multiple backlog PRs into one PR.

Codex must not silently shrink the scope.

Codex must not mark a goal complete unless every acceptance criterion is satisfied or explicitly documented as not possible.

If the user asks for a broad continuation, the default interpretation is:

```txt
Read the repo docs, find the next uncompleted backlog PR, and implement only that PR.
```

## Post-#20 execution rule

After PR #20, Codex must not jump directly to PPO or deep RL.

It must follow the post-#20 backlog in order. If the backlog is unclear, Codex must create or update docs before implementing runtime features.

The bandit from PR #20 is a prototype. It does not mean the project is ready for PPO.

## Alpha validation rule

After PR #35, Codex must stop adding framework abstractions by default.

The next sequence must prove the framework end to end on an IgnitionRAG-style alpha dogfood case:

```txt
alpha validation plan -> alpha dogfood experiment -> alpha readiness tag prep -> IgnitionRAG checklist -> IgnitionRAG bridge prototype
```

Do not add more RL abstractions, PPO, GRPO training, real provider calls, database code or frontend code unless a specific backlog PR explicitly asks for it.

## Alpha freeze rule

After the IgnitionRAG bridge prototype and `v0.1.0-alpha.0` release notes are complete, Codex must stop adding framework abstractions by default.

The only allowed bridge before dogfooding is npm alpha publishing readiness:

```txt
PR #42 packaging readiness
-> tag v0.1.0-alpha.1 after merge
-> manual npm publish with dist-tag alpha
-> external install smoke test
```

PR #42 must not publish to npm during the PR and must not add runtime features.

After the npm alpha is published, the next phase is dogfooding inside IgnitionRAG:

```txt
IgnitionRAG Evaluation Center prototype
-> Experiment Lab prototype
-> Context Engineering Recommendation view
-> regression check for agent or workflow changes
```

Return to this repository only when real dogfooding exposes a concrete framework issue such as missing types, awkward APIs, weak reports, CLI friction, incomplete adapter contracts or regression-gate ergonomics.

## Required report format

Every Codex result must include:

```txt
- PR number / branch
- summary
- changed files
- commands run
- test results
- acceptance checklist
- incomplete items
- known limitations
- next recommended PR
```

## If blocked

If blocked, Codex must:

```txt
- stop feature work
- explain the blocker
- list attempted commands
- list files inspected
- propose the smallest corrective PR
```

No guessing.

No pretending completion.

Do not continue adding adjacent features to hide the blocker.

## Completion audit

Before reporting completion, Codex must verify the current state against:

- the active backlog item,
- the acceptance commands,
- the Definition of Done,
- the PR template,
- CI status when a PR exists.

If any item is not proven complete, report it as incomplete.

## Stable continuation prompt

Use this prompt to continue the project in a future Codex session:

```md
Continue Ignition Agent Trainer from the repository docs.

First read:

- README.md
- docs/IMPLEMENTATION_PLAN.md
- docs/CODEX_RUNBOOK.md
- docs/PR_PLAYBOOK.md
- docs/BACKLOG.md
- docs/POST_20_ROADMAP.md
- docs/PROJECT_AUDIT.md
- docs/ALPHA_VALIDATION_PLAN.md
- docs/DEFINITION_OF_DONE.md
- docs/MILESTONES.md

Then implement the next uncompleted PR only.

Follow the exact scope, out-of-scope rules, and acceptance criteria.

Do not skip PRs.
Do not combine PRs.
Do not jump to PPO.
Do not implement RL unless the backlog explicitly reaches that phase.
Do not add external LLM calls unless the PR explicitly asks for it.
Do not change public APIs unless the PR explicitly asks for it.

Create or update a draft PR.

Report:

- summary
- changed files
- commands run
- test results
- acceptance checklist
- incomplete items
- known limitations
- next recommended PR
```
