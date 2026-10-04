import { describe, expect, test } from "vitest";
import { fitObservationFeatureEncoder } from "./feature-encoder";
import { createIgnitionRagPolicyBinding } from "./ignitionrag-policy-binding";
import { createPolicyArtifact, type PolicyArtifactBody } from "./policy-artifact";

const observation = { modelCalls: 1, toolCalls: 0, lastToolFailed: false };
function artifact(overrides: Partial<PolicyArtifactBody> = {}) {
  return createPolicyArtifact({
    schemaVersion: 1,
    algorithm: "tabular-q",
    encoder: {
      id: "ignitionrag.evaluation.observation",
      version: 1,
      parameters: { fields: ["modelCalls", "toolCalls", "lastToolFailed"] },
    },
    actions: ["lookup", "__answer__"],
    hyperparameters: { alpha: 0.3, gamma: 1, epsilon: 0.2 },
    seeds: [56],
    provenance: { mode: "synthetic", reference: "binding-fixture", fingerprint: "fixture" },
    rewardConfigId: "ignitionrag.sparse-quality.v1",
    evaluationReportId: "independent-quality-fixture",
    parameters: [
      {
        state: '{"lastToolFailed":false,"modelCalls":1,"toolCalls":0}',
        values: { lookup: 0.9, __answer__: 0.1 },
      },
    ],
    ...overrides,
  });
}
function binding(input = artifact(), actionNames = ["lookup", "__answer__"]) {
  return createIgnitionRagPolicyBinding({
    artifact: input,
    actionNames,
    expectedProvenanceMode: "synthetic",
  });
}

describe("IgnitionRAG artifact binding", () => {
  test("chooses learned actions, obeys the live mask and isolates artifact mutation", async () => {
    const input = artifact();
    const profile = binding(input);
    input.parameters = [];
    profile.encoder.parameters.fields = [];
    expect(await profile.chooseAction(observation, ["lookup", "__answer__"])).toBe("lookup");
    expect(await profile.chooseAction(observation, ["__answer__"])).toBe("__answer__");
    await expect(profile.chooseAction(observation, ["unapproved"])).rejects.toThrow();
  });

  test("rejects incompatible live contracts before execution", () => {
    for (const change of [
      { rewardConfigId: "other-reward" },
      { provenance: { mode: "real" as const, reference: "real", fingerprint: "real" } },
      { encoder: { id: "other", version: 1, parameters: {} } },
    ])
      expect(() => binding(artifact(change))).toThrow();
    expect(() => binding(artifact(), ["lookup"])).toThrow();
  });

  test("rejects raw content, missing fields and invalid counters at the live observation boundary", async () => {
    const profile = binding();
    for (const input of [
      { ...observation, rawText: "private" },
      { modelCalls: 1, toolCalls: 0 },
      { ...observation, toolCalls: -1 },
      { ...observation, modelCalls: 0.5 },
      { ...observation, lastToolFailed: "false" },
    ])
      await expect(profile.chooseAction(input, ["lookup"])).rejects.toThrow();
  });
});

test("loads trained linear features without refitting on evaluation observations", async () => {
  const featureEncoder = fitObservationFeatureEncoder(
    { id: "ignitionrag-trained", version: 1, numeric: ["modelCalls"], categorical: {} },
    [{ id: "training", observation }],
  );
  const input = artifact({
    algorithm: "linear-q",
    encoder: {
      id: "ignitionrag-trained",
      version: 1,
      parameters: featureEncoder.descriptor as unknown as Record<string, unknown>,
    },
    parameters: { lookup: [0, 1, 0], __answer__: [1, 0, 0] },
  });
  const profile = createIgnitionRagPolicyBinding({
    artifact: input,
    actionNames: input.actions,
    expectedProvenanceMode: "synthetic",
    featureEncoder,
  });
  expect(await profile.chooseAction({ ...observation, modelCalls: 3 }, input.actions)).toBe(
    "lookup",
  );
  expect(await profile.chooseAction(observation, input.actions)).toBe("__answer__");
  expect(() => binding(input)).toThrow();
  const incompatible = fitObservationFeatureEncoder(
    { id: "ignitionrag-trained", version: 1, numeric: ["rawText"], categorical: {} },
    [{ id: "training", observation: { rawText: 1 } }],
  );
  expect(() =>
    createIgnitionRagPolicyBinding({
      artifact: input,
      actionNames: input.actions,
      expectedProvenanceMode: "synthetic",
      featureEncoder: incompatible,
    }),
  ).toThrow();
});
