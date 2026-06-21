# Contributing

## Local development

```bash
bun install
bun run dev
bun run test
bun run typecheck
```

## Package rules

- Keep `@ignitionai/core` dependency-light.
- Adapter packages should keep their framework dependencies as peer dependencies.
- New rewards must return a score between `0` and `1` unless explicitly documented.
- Reports must be serializable to JSON.

## Pull request checklist

- [ ] Tests added or updated.
- [ ] Docs updated when public API changes.
- [ ] No new coupling between core and a specific agent framework.
- [ ] Example added for major features.
