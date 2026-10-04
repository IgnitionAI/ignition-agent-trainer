# Changelog

## Unreleased

- Add a versioned, pseudonymized trajectory import and observed-policy evidence
  comparison contract. Real IgnitionRAG evidence remains unverified without an authorized export.

- Add versioned observation feature fitting and experimental linear Q-learning
  with fixed feature dimensions and frozen evaluation, without changing existing APIs.

- Add tabular Q-learning of discrete environment actions, seeded exploration,
  terminal-aware TD updates and detached frozen evaluation policies.
- Add a learning episode runner with explicit truncation and an executable
  synthetic ReAct learning example. Existing episode APIs are unchanged.

## 0.1.0-alpha.0

Internal alpha readiness:

- package manifests are aligned on `0.1.0-alpha.0`,
- package manifests declare the MIT license,
- local CLI can run typed experiments and write reports,
- regression gates can compare current runs against committed baselines,
- alpha dogfood example validates an IgnitionRAG-style document assistant workflow,
- alpha tag criteria and tag process are documented.

## 0.0.0

Initial scaffold:

- monorepo structure,
- core types,
- eval scorers,
- experiment runner,
- trainer skeleton,
- environment skeleton,
- RL skeleton,
- adapters skeleton,
- basic example,
- roadmap and architecture docs.
