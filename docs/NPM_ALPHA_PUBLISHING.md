# npm Alpha Publishing

This document defines the npm alpha publishing policy and manual publishing process for `v0.1.0-alpha.x`.

The goal is to validate Ignition Agent Trainer as a real external dependency before dogfooding it inside IgnitionRAG. Do not publish these packages as `latest`.

## Publishing Policy

Current decision:

- `v0.1.0-alpha.x` publishing is manual only.
- This repository must not contain a GitHub Actions workflow that can publish to npm automatically.
- Alpha packages must be published with the `alpha` dist-tag.
- Never run `npm publish` without `--tag alpha` for an alpha or prerelease version.
- Do not create or store long-lived `NPM_TOKEN` secrets for this repo.
- Do not use granular access tokens for alpha publication unless a future security review explicitly changes this policy.
- Manual publishers must use an npm account with 2FA enabled and publish interactively with OTP when npm requests it.
- If package-level npm settings are configured after first publish, prefer requiring 2FA for publishing/settings and disallowing token-based publish for the manual-alpha phase.

Future automation decision:

- A publish workflow may be added only in a dedicated future PR.
- Any future GitHub Actions publish workflow must use npm Trusted Publishing / OIDC, not long-lived npm tokens.
- Any future publish workflow must use a protected GitHub environment or equivalent manual approval gate.
- Any future prerelease publish workflow must pass `--tag alpha` or another explicit prerelease tag.
- Any future stable publish workflow must be a separate explicit release process and may use `latest` only for a stable version.
- Any future automation PR must include a dry-run or pack verification path and must prove it cannot publish from ordinary pushes.

Provenance policy:

- Manual local alpha publishing does not claim CI provenance.
- If npm Trusted Publishing is introduced later, provenance must be enabled through the trusted-publisher flow and verified after publish.
- Do not add `--provenance` to local manual publish commands.

Official npm references for this policy:

- [npm publish docs](https://docs.npmjs.com/cli/v11/commands/npm-publish/) document that `npm publish` uses `latest` by default unless `--tag` is provided.
- [npm dist-tag docs](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/) recommend using tags such as prerelease tags for unstable versions.
- [npm Trusted Publishing docs](https://docs.npmjs.com/trusted-publishers/) describe OIDC-based publishing without long-lived npm tokens.
- [npm provenance docs](https://docs.npmjs.com/generating-provenance-statements/) note that Trusted Publishing generates provenance automatically.
- [npm 2FA docs](https://docs.npmjs.com/configuring-two-factor-authentication/) describe the current 2FA/token requirement for publishing.

## Package Names

The npm alpha uses Agent Trainer-specific package names because `@ignitionai/core` already exists on npm for another IgnitionAI package.

Install the dogfood set with:

```bash
bun add @ignitionai/agent-trainer-core@alpha
bun add @ignitionai/agent-trainer-evals@alpha
bun add @ignitionai/agent-trainer-experiments@alpha
bun add @ignitionai/agent-trainer-exporters@alpha
bun add @ignitionai/agent-trainer-preset-rag@alpha
bun add @ignitionai/agent-trainer-adapter-ignitionrag@alpha
bun add @ignitionai/agent-trainer@alpha
bun add @ignitionai/agent-trainer-cli@alpha
```

`@ignitionai/agent-trainer-rl` and `@ignitionai/agent-trainer-environment` are also published because `@ignitionai/agent-trainer` depends on them.

## Publishable Packages

Publish only this dependency closure for the first npm alpha:

```txt
@ignitionai/agent-trainer-core
@ignitionai/agent-trainer-environment
@ignitionai/agent-trainer-evals
@ignitionai/agent-trainer-exporters
@ignitionai/agent-trainer-experiments
@ignitionai/agent-trainer-preset-rag
@ignitionai/agent-trainer-rl
@ignitionai/agent-trainer
@ignitionai/agent-trainer-adapter-ignitionrag
@ignitionai/agent-trainer-cli
```

The optional adapters and strategy preset package remain private until real dogfooding requires publishing them.

## Pre-Publish Checks

Run from the repository root:

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
bun run pack:check
```

`bun run pack:check` verifies the publishable package manifests, package files, CLI bin, `publishConfig`, and packed manifests. It must fail if a publishable tarball contains `workspace:*`.

## Tag

Create the tag only after the release commit is on `main` and all pre-publish checks pass. Replace the version with the alpha being published:

```bash
git checkout main
git pull --ff-only origin main
git tag -a v0.1.0-alpha.2 -m "v0.1.0-alpha.2"
git push origin v0.1.0-alpha.2
```

## Manual Publish

Confirm npm authentication:

```bash
npm whoami
```

Use an npm account that belongs to the IgnitionAI npm organization, has publish access to the packages below, and has 2FA enabled. Keep OTP entry interactive unless npm requires `--otp <code>` for the local environment.

Publish in dependency order:

```bash
cd packages/core && npm publish --access public --tag alpha
cd ../environment && npm publish --access public --tag alpha
cd ../evals && npm publish --access public --tag alpha
cd ../exporters && npm publish --access public --tag alpha
cd ../experiments && npm publish --access public --tag alpha
cd ../preset-rag && npm publish --access public --tag alpha
cd ../rl && npm publish --access public --tag alpha
cd ../trainer && npm publish --access public --tag alpha
cd ../adapter-ignitionrag && npm publish --access public --tag alpha
cd ../cli && npm publish --access public --tag alpha
```

Do not publish with the `latest` dist-tag. The explicit `--tag alpha` flag is mandatory because `npm publish` otherwise updates `latest` by default.

## Post-Publish Verification

For each package:

```bash
npm view <package> dist-tags versions --json
```

Create a temporary external Bun project and install the alpha packages:

```bash
mkdir /tmp/iat-alpha-smoke
cd /tmp/iat-alpha-smoke
bun init -y
bun add @ignitionai/agent-trainer-core@alpha
bun add @ignitionai/agent-trainer-evals@alpha
bun add @ignitionai/agent-trainer-experiments@alpha
bun add @ignitionai/agent-trainer-exporters@alpha
bun add @ignitionai/agent-trainer-preset-rag@alpha
bun add @ignitionai/agent-trainer-adapter-ignitionrag@alpha
bun add @ignitionai/agent-trainer@alpha
bun add @ignitionai/agent-trainer-cli@alpha
```

Run a small import smoke test from that external project:

```bash
bun -e 'import { createDataset } from "@ignitionai/agent-trainer-core"; console.log(typeof createDataset)'
```

Then verify the published CLI bin:

```bash
bunx --package @ignitionai/agent-trainer-cli@alpha ignition-agent-trainer eval run ./experiment.ts --bundle reports/smoke
```

## Later Automation

GitHub Actions publishing with npm provenance is intentionally disabled for manual alpha releases. Add it only after the manual alpha has been consumed successfully from IgnitionRAG, and only through a dedicated PR that follows the policy above.
