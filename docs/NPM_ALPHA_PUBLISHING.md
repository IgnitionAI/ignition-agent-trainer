# npm Alpha Publishing

This document defines the manual npm alpha publishing process for `v0.1.0-alpha.1`.

The goal is to validate Ignition Agent Trainer as a real external dependency before dogfooding it inside IgnitionRAG. Do not publish these packages as `latest`.

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

Create the tag only after the npm-readiness PR is merged:

```bash
git checkout main
git pull --ff-only origin main
git tag -a v0.1.0-alpha.1 -m "v0.1.0-alpha.1"
git push origin v0.1.0-alpha.1
```

## Manual Publish

Confirm npm authentication:

```bash
npm whoami
```

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

Do not publish with the `latest` dist-tag.

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

GitHub Actions publishing with npm provenance is intentionally out of scope for `v0.1.0-alpha.1`. Add it only after the manual alpha has been consumed successfully from IgnitionRAG.
