import type { JsonRecord } from "@ignitionai/agent-trainer-core";
import { canonicalPolicyJson, loadPolicyArtifact, parsePolicyArtifact } from "./policy-artifact";

export interface IgnitionRagPolicyBinding {
  policyId: string;
  artifactId: string;
  encoder: { id: string; version: number; parameters: Record<string, unknown> };
  rewardConfigId: "ignitionrag.sparse-quality.v1";
  actionNames: readonly string[];
  chooseAction(observation: JsonRecord, actionNames: readonly string[]): Promise<string>;
}

export interface IgnitionRagPolicyBindingOptions {
  artifact: unknown;
  actionNames: readonly string[];
  expectedProvenanceMode: "real" | "synthetic";
}

const encoder = {
  id: "ignitionrag.evaluation.observation",
  version: 1,
  parameters: { fields: ["modelCalls", "toolCalls", "lastToolFailed"] },
};
const rewardConfigId = "ignitionrag.sparse-quality.v1";

/** Bind a frozen tabular artifact to the declared live observation projection.
 * Provenance mode is checked as a declaration, never treated as proof of authenticity.
 * Independent output quality and execution limits remain the runner's responsibility.
 */
export function createIgnitionRagPolicyBinding(
  options: IgnitionRagPolicyBindingOptions,
): IgnitionRagPolicyBinding {
  const artifact = parsePolicyArtifact(options.artifact);
  if (
    artifact.algorithm !== "tabular-q" ||
    artifact.rewardConfigId !== rewardConfigId ||
    artifact.provenance.mode !== options.expectedProvenanceMode
  ) {
    throw new Error("Incompatible IgnitionRAG algorithm, reward or provenance mode.");
  }
  const actionNames = [...options.actionNames];
  if (!actionNames.includes("__answer__") || new Set(actionNames).size !== actionNames.length) {
    throw new Error("IgnitionRAG actions require unique names and __answer__.");
  }
  const policy = loadPolicyArtifact(artifact, {
    encoder,
    actions: actionNames,
    encodeState: (state) => encodeObservation(state.observation),
  });
  return {
    policyId: artifact.id,
    artifactId: artifact.id,
    encoder: structuredClone(encoder),
    rewardConfigId,
    actionNames: Object.freeze(actionNames),
    async chooseAction(observation, availableActionNames) {
      const stateKey = encodeObservation(observation);
      const action = await policy.chooseAction(
        { id: stateKey, observation: structuredClone(observation) },
        availableActionNames.map((name) => ({ name })),
      );
      return action.name;
    },
  };
}

function encodeObservation(observation: JsonRecord): string {
  if (
    canonicalPolicyJson(Object.keys(observation).sort()) !==
      canonicalPolicyJson([...encoder.parameters.fields].sort()) ||
    !Number.isSafeInteger(observation.modelCalls) ||
    Number(observation.modelCalls) < 0 ||
    !Number.isSafeInteger(observation.toolCalls) ||
    Number(observation.toolCalls) < 0 ||
    typeof observation.lastToolFailed !== "boolean"
  ) {
    throw new Error("Invalid IgnitionRAG observation projection.");
  }
  return canonicalPolicyJson(observation);
}
