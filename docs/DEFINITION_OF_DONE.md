# Definition of Done

This file defines when a PR can be considered complete.

## Every PR is done only when

- scope implemented,
- out-of-scope respected,
- tests added or explicitly unnecessary,
- docs updated if behavior changed,
- examples updated if relevant,
- required commands run,
- CI green or failures explained,
- PR template completed,
- next PR identified.

If any item is missing, the PR is not done. Missing items must be listed in the PR report.

## Runtime feature PR requirements

Runtime feature PRs must include:

- package exports updated,
- package README updated,
- tests for success cases,
- tests for failure or edge cases,
- deterministic examples when useful,
- no live API calls,
- no database,
- no frontend,
- no auth,
- no billing.

Runtime feature PRs should prefer small public APIs that compose with the existing `@ignitionai/core`, `@ignitionai/evals`, `@ignitionai/experiments`, `@ignitionai/trainer` and adapter packages.

## Documentation PR requirements

Documentation PRs must include:

- links between docs,
- no stale references,
- no claims about implemented features unless already merged,
- clear next action.

Documentation PRs must not change runtime source code, package APIs, generated build output, or tooling configuration unless the backlog item explicitly asks for it.

## Tooling PR requirements

Tooling PRs must include:

- isolated tooling changes only,
- no runtime behavior changes,
- commands before and after if fixing a broken command.

Tooling PRs may update CI only when the command works locally first.

## Acceptance checklist

Copy this checklist into PR descriptions when useful:

```md
## Acceptance checklist

- [ ] Backlog item identified
- [ ] Exact branch from `docs/BACKLOG.md` used
- [ ] Scope implemented
- [ ] Out-of-scope respected
- [ ] Public API changes documented or not applicable
- [ ] Tests added or explicitly unnecessary
- [ ] Relevant docs updated
- [ ] Relevant examples updated or not applicable
- [ ] `bun install` run or explicitly skipped with reason
- [ ] `bun run typecheck` passed
- [ ] `bun run test` passed
- [ ] `bun run build` passed
- [ ] Relevant examples run or explicitly skipped with reason
- [ ] CI green or failures explained
- [ ] Known limitations listed
- [ ] Next PR from `docs/BACKLOG.md` identified
```
