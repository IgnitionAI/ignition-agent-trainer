# @ignitionai/agent-trainer-adapter-ignitionrag

Type-level adapter contract between IgnitionRAG and Ignition Agent Trainer.

This package defines the boundary IgnitionRAG can implement when it is ready to call the open-source evaluation engine from its own backend workers.

```ts
import type {
  IgnitionRagAdapterContract,
  IgnitionRagExperimentExecutionRequest,
} from "@ignitionai/agent-trainer-adapter-ignitionrag";

const adapter: IgnitionRagAdapterContract = {
  async executeExperiment(request: IgnitionRagExperimentExecutionRequest) {
    // IgnitionRAG owns loading workflow snapshots, resolving tenants and turning
    // workflows or agents into executable AgentVariant objects.
    return runInsideIgnitionRag(request);
  },
};
```

## Current API

- `IgnitionRagCollectionReference`
- `IgnitionRagWorkflowReference`
- `IgnitionRagAgentReference`
- `IgnitionRagExperimentVariantReference`
- `IgnitionRagExperimentExecutionRequest`
- `IgnitionRagExperimentExecutionResult`
- `IgnitionRagReportArtifact`
- `IgnitionRagAdapterContract`

## Boundary

Ignition Agent Trainer owns:

- dataset, reward, trace and experiment result types,
- local experiment execution primitives,
- report export shapes,
- deterministic strategy and reward presets.

IgnitionRAG owns:

- tenant/project authorization,
- collection/workflow/agent persistence,
- workflow snapshot loading,
- turning saved workflows into executable `AgentVariant` objects,
- hosted storage and product UI.

## Non-goals

This package does not call IgnitionRAG APIs, read a database, perform auth, create UI, load workflow snapshots, run hosted jobs or call LLM providers.
