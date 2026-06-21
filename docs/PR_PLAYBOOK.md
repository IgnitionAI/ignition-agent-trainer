# PR playbook

Every PR should be small, deterministic and easy to review. The goal is to make steady progress without mixing product work, tooling migrations and speculative architecture.

## Workflow

1. Start from `main`.
2. Pull latest.
3. Create one focused branch.
4. Implement one capability only.
5. Keep examples deterministic and mocked unless explicitly told otherwise.
6. Add tests.
7. Update package README files or docs when the behavior changes.
8. Run required checks.
9. Push a draft PR.
10. Summarize changed files, commands run, test results, known limitations and recommended next PR.

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

Lint must be fixed in a dedicated PR:

```txt
chore: align Biome config with installed version
```

After lint works, it can be added to CI in that same tooling-only PR.

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

Every PR summary should include:

- summary of implemented work,
- changed files,
- commands run,
- test results,
- known limitations,
- next recommended PR from [BACKLOG.md](./BACKLOG.md).
