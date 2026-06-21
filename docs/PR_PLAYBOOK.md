# PR playbook

Every PR should be small, deterministic and easy to review. The goal is to make steady progress without mixing product work, tooling migrations and speculative architecture.

## Workflow

1. Start from `main`.
2. Pull latest.
3. Identify the next uncompleted PR in [BACKLOG.md](./BACKLOG.md).
4. Create or switch to the exact branch named in that backlog item.
5. Implement one capability only.
6. Keep examples deterministic and mocked unless explicitly told otherwise.
7. Add tests when behavior changes.
8. Update package README files or docs when behavior changes.
9. Run required checks.
10. Push a draft PR, or update the existing draft PR.
11. Summarize changed files, commands run, test results, acceptance checklist, incomplete items, known limitations and recommended next PR.

## Required checks

Run these commands for every PR:

```bash
bun install
bun run typecheck
bun run test
bun run build
```

Run relevant examples too. Current examples include:

```bash
bun run --filter './examples/basic-eval' dev
bun run --filter './examples/context-engineering' dev
bun run --filter './examples/callable-adapter' dev
```

Adjust example commands only when package scripts change.

## Lint status

`bun run lint` is currently blocked by a Biome config/version mismatch. Do not run or fix lint as part of feature PRs.

Lint must be fixed in a dedicated tooling-only PR:

```txt
chore: align Biome config with installed version
```

After lint works, it can be added to CI in that same tooling-only PR.

## Scope control

Codex must not:

- add extra features,
- skip acceptance criteria,
- combine PRs,
- do opportunistic refactors,
- change public APIs without listing migration impact,
- shrink the stated scope because it is faster,
- mark work complete when acceptance is only partially satisfied.

If a PR reveals missing prerequisite work, stop feature work and propose the smallest corrective PR instead of folding it into the current PR.

## Public API rule

Any public export change must include:

- test coverage,
- README update,
- changelog note or docs note,
- migration note if breaking.

Public API names should remain stable unless the backlog item explicitly requires a rename or the PR explains the compatibility impact.

## Example rule

Examples must be:

- deterministic,
- runnable with Bun,
- mocked unless live integration is explicit,
- documented in README or the relevant package/example README,
- small enough to show the intended workflow without unrelated infrastructure.

## Test rule

Tests should cover:

- happy path,
- empty or invalid input,
- errors,
- deterministic ordering where relevant,
- integration with `createExperiment` when relevant.

If tests are explicitly unnecessary, the PR must explain why in the PR template and final report.

## CI rule

If a command is not run, Codex must say why.

If a command fails, Codex must not mark the PR complete.

If CI fails after local checks pass, Codex must inspect the failing job, summarize the cause, and either fix it in scope or document why the PR is blocked.

## Rules

- Do not mix feature work with lint or tooling migration.
- Do not add external LLM calls unless the PR explicitly asks for it.
- Do not add database, frontend, auth or billing.
- Do not implement RL before exporters, CLI, config, adapters and regression gates exist.
- Do not rename public APIs casually.
- Do not create huge PRs.
- Prefer small package-level APIs.
- Prefer structural typing and optional integration surfaces for ecosystem adapters.
- Keep examples deterministic unless the PR is explicitly about live provider integration.

## PR report format

Every PR summary must include:

- PR number / branch,
- summary,
- changed files,
- commands run,
- test results,
- acceptance checklist,
- incomplete items,
- known limitations,
- next recommended PR from [BACKLOG.md](./BACKLOG.md).
