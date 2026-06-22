# Alpha Release Readiness

This document defines the internal `v0.1.0-alpha.0` tag criteria and release process.

The alpha tag is a repository milestone, not an npm publication.

## Target Tag

```txt
v0.1.0-alpha.0
```

All workspace package manifests use:

```txt
version: 0.1.0-alpha.0
license: MIT
```

The root package remains private. Package publication is explicitly out of scope for this tag.

## Alpha Criteria

The tag can be created only after these conditions are true on `main`:

- all workspace package versions are `0.1.0-alpha.0`,
- all workspace packages declare `license: MIT`,
- `docs/ALPHA_READINESS.md` reflects package maturity honestly,
- `CHANGELOG.md` contains `0.1.0-alpha.0` release notes,
- the alpha dogfood experiment exists and is documented,
- local validation commands pass,
- GitHub CI is green on the readiness PR.

The alpha may include partial or prototype packages only when those packages are clearly labeled as partial or prototype in docs.

## Validation Commands

Run the standard repository checks:

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

Run the alpha validation flow:

```bash
bun run --filter './examples/alpha-dogfood' dev
bun run --filter './examples/alpha-dogfood' gate
bun run --filter '@ignitionai/agent-trainer-cli' dev -- eval run ./examples/alpha-dogfood/experiment.ts --bundle reports/alpha-dogfood
```

Generated `reports` and package `dist` folders must not be committed.

## Tag Process

After the readiness PR is merged:

1. Check out `main`.
2. Pull latest with `git pull --ff-only origin main`.
3. Run the validation commands above.
4. Remove generated local artifacts.
5. Create an annotated tag:

```bash
git tag -a v0.1.0-alpha.0 -m "v0.1.0-alpha.0"
```

6. Push the tag:

```bash
git push origin v0.1.0-alpha.0
```

Do not run `npm publish` or `bun publish` as part of this internal alpha tag.

## Non-goals

The internal alpha tag does not add:

- npm publication,
- production deployment,
- frontend,
- database,
- SaaS auth or billing,
- real provider calls,
- public API redesign,
- PPO implementation,
- GRPO training,
- model fine-tuning.
