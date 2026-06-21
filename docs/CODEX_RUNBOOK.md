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
- docs/DEFINITION_OF_DONE.md
- docs/MILESTONES.md

Then implement the next uncompleted PR only.

Follow the exact scope, out-of-scope rules, and acceptance criteria.

Do not skip PRs.
Do not combine PRs.
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
