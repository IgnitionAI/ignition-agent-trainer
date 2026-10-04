import { spawn } from "node:child_process";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import type { EnvironmentState } from "@ignitionai/agent-trainer-environment";
import { describe, expect, it } from "vitest";
import { LinearQLearningPolicy } from "./linear-q-learning";
import {
  createPolicyArtifact,
  loadPolicyArtifact,
  type PolicyArtifactBody,
  parsePolicyArtifact,
} from "./policy-artifact";
import { LocalPolicyRegistry, type PolicyGateInput } from "./policy-registry";
import { TabularQLearningPolicy } from "./q-learning";

const actions = [{ name: "lookup" }, { name: "answer" }];
const state = (x: number): EnvironmentState => ({
  id: `heldout-${x}`,
  observation: { x },
  done: false,
});
const metadata = {
  schemaVersion: 1 as const,
  encoder: { id: "test-observable", version: 1, parameters: { fields: ["x"] } },
  actions: actions.map((action) => action.name),
  hyperparameters: { alpha: 1, gamma: 0, epsilon: 0 },
  seeds: [57],
  provenance: {
    reference: "synthetic-calibration-v1",
    mode: "synthetic" as const,
    fingerprint: "calibration-sha256",
  },
  rewardConfigId: "quality-tool-cost-v1",
  evaluationReportId: "heldout-v1",
};
function body(
  parameters: PolicyArtifactBody["parameters"],
  algorithm: PolicyArtifactBody["algorithm"] = "tabular-q",
): PolicyArtifactBody {
  return { ...metadata, algorithm, parameters };
}
function gate(baselineId: string, candidateId: string): PolicyGateInput {
  return {
    baselineId,
    candidateId,
    corpusId: "heldout-v1",
    evaluationReportId: "heldout-v1",
    mode: "synthetic",
    baseline: { successRate: 1, reward: 0.9, tools: 2, costUsd: null },
    candidate: { successRate: 1, reward: 0.95, tools: 1, costUsd: null },
    thresholds: {
      maxSuccessDrop: 0,
      maxRewardDrop: 0,
      maxToolIncrease: 0,
      maxCostIncreaseUsd: null,
    },
  };
}

describe("versioned policies and local registry", () => {
  it("reloads both learned algorithms without calibration data on an independent corpus", async () => {
    const encode = (value: EnvironmentState) => String(Number(value.observation.x) > 0);
    const tabular = new TabularQLearningPolicy({
      ...metadata.hyperparameters,
      seed: 57,
      encodeState: encode,
    });
    const encoder = {
      descriptor: {
        schema: { id: "test", version: 1, numeric: ["x"], categorical: {} },
        normalization: [],
        featureNames: ["x"],
      },
      encode: (value: EnvironmentState) => [Number(value.observation.x)],
    };
    const linear = new LinearQLearningPolicy({
      ...metadata.hyperparameters,
      seed: 57,
      actionNames: metadata.actions,
      encoder,
    });
    for (const policy of [tabular, linear]) {
      policy.update({
        state: state(1),
        action: { name: "answer" },
        reward: 1,
        nextState: state(1),
        nextActions: [],
        done: true,
      });
      policy.update({
        state: state(-1),
        action: { name: "lookup" },
        reward: 1,
        nextState: state(-1),
        nextActions: [],
        done: true,
      });
    }
    const variants = [
      {
        original: tabular.freeze(),
        artifact: createPolicyArtifact(body(tabular.snapshot())),
        encodeState: encode,
      },
      {
        original: linear.freeze(),
        artifact: createPolicyArtifact(body(linear.snapshot(), "linear-q")),
        encodeState: encoder.encode,
      },
    ];
    for (const variant of variants) {
      const loaded = loadPolicyArtifact(JSON.parse(JSON.stringify(variant.artifact)), {
        encoder: metadata.encoder,
        actions: metadata.actions,
        encodeState: variant.encodeState,
      });
      for (const x of [-10, -3, 0, 2, 100]) {
        expect(await loaded.chooseAction(state(x), [...actions].reverse())).toEqual(
          await variant.original.chooseAction(state(x), actions),
        );
      }
    }
  });

  it("rejects corruption, unknown versions and incompatible encoders at the loading boundary", async () => {
    expect(() =>
      createPolicyArtifact({ ...body({ "a|b": [1] }, "linear-q"), actions: ["a", "b"] }),
    ).toThrow("fields");
    expect(() =>
      createPolicyArtifact(body({ lookup: Array<number>(2), answer: [0, 0] }, "linear-q")),
    ).toThrow("finite JSON");
    const sparseRuntime = loadPolicyArtifact(
      createPolicyArtifact(body({ lookup: [1, 0], answer: [0, 1] }, "linear-q")),
      { encoder: metadata.encoder, actions: metadata.actions, encodeState: () => Array<number>(2) },
    );
    await expect(sparseRuntime.chooseAction(state(1), actions)).rejects.toThrow("feature vector");
    const artifact = createPolicyArtifact(body([{ state: "true", values: { answer: 1 } }]));
    for (const changed of [
      { ...artifact, schemaVersion: 2 },
      { ...artifact, parameters: [{ state: "true", values: { answer: 100 } }] },
      { ...artifact, extra: true },
      { ...artifact, hyperparameters: { ...artifact.hyperparameters, alpha: Number.NaN } },
    ])
      expect(() => parsePolicyArtifact(changed)).toThrow();
    expect(() =>
      loadPolicyArtifact(artifact, {
        encoder: { ...metadata.encoder, version: 2 },
        actions: metadata.actions,
        encodeState: () => "true",
      }),
    ).toThrow("Incompatible");
    expect(() =>
      loadPolicyArtifact(artifact, {
        encoder: metadata.encoder,
        actions: ["private"],
        encodeState: () => "true",
      }),
    ).toThrow("Incompatible");
  });

  it("blocks regressions, promotes explicitly, survives a precommit interruption and rolls back baseline choices", async () => {
    const directory = await mkdtemp(join(tmpdir(), "policy-registry-"));
    const registry = new LocalPolicyRegistry(directory);
    const baseline = createPolicyArtifact(body([{ state: "true", values: { lookup: 1 } }]));
    const candidate = createPolicyArtifact(body([{ state: "true", values: { answer: 1 } }]));
    await registry.register(baseline);
    await registry.register(candidate);
    await registry.initialize(baseline.id);
    expect((await registry.active()).activeId).toBe(baseline.id);
    await writeFile(join(directory, ".writer.lock"), "another writer");
    await expect(registry.promote(gate(baseline.id, candidate.id))).rejects.toThrow();
    expect((await registry.active()).activeId).toBe(baseline.id);
    await unlink(join(directory, ".writer.lock"));
    const incomplete = gate(baseline.id, candidate.id);
    delete (incomplete.thresholds as Partial<PolicyGateInput["thresholds"]>).maxSuccessDrop;
    await expect(registry.promote(incomplete)).rejects.toThrow("thresholds");
    expect((await registry.active()).activeId).toBe(baseline.id);
    const regression = gate(baseline.id, candidate.id);
    regression.candidate.successRate = 0;
    const rejected = await registry.promote(regression);
    expect(rejected.passed).toBe(false);
    expect(rejected.reasons).toContain("success-regression");
    expect(rejected.thresholds.maxSuccessDrop).toBe(0);
    expect((await registry.active()).activeId).toBe(baseline.id);
    const costRequired = gate(baseline.id, candidate.id);
    costRequired.thresholds.maxCostIncreaseUsd = 0;
    expect((await registry.promote(costRequired)).reasons).toContain("cost-not-observed");
    await expect(registry.register({ ...candidate, parameters: [] })).rejects.toThrow("checksum");
    expect((await registry.active()).activeId).toBe(baseline.id);
    // A terminated writer can leave only an incomplete staging file, never the published pointer.
    await writeFile(join(directory, ".active-interrupted.tmp"), '{"activeId":');
    expect((await registry.active()).activeId).toBe(baseline.id);
    expect((await registry.promote(gate(baseline.id, candidate.id))).passed).toBe(true);
    const promoted = await registry.active();
    expect(promoted.activeId).toBe(candidate.id);
    expect(promoted.baselineId).toBe(baseline.id);
    const savedReport = JSON.parse(
      await readFile(join(directory, "reports", `${promoted.gateReportId}.json`), "utf8"),
    );
    expect(savedReport.candidateId).toBe(candidate.id);
    expect(savedReport.baselineId).toBe(baseline.id);
    await expect(registry.promote(gate(baseline.id, candidate.id))).rejects.toThrow("pinned");
    const restored = await registry.rollback();
    expect(restored.activeId).toBe(baseline.id);
    expect(restored.baselineId).toBe(baseline.id);
    const loaded = loadPolicyArtifact(await registry.readVersion(restored.activeId), {
      encoder: metadata.encoder,
      actions: metadata.actions,
      encodeState: () => "true",
    });
    expect((await loaded.chooseAction(state(8), actions)).name).toBe("lookup");
    await expect(registry.rollback()).rejects.toThrow("No previous");
  });
  it("keeps a checksummed active version when a real writer process is terminated", async () => {
    const directory = await mkdtemp(join(tmpdir(), "policy-crash-"));
    const registry = new LocalPolicyRegistry(directory);
    const baseline = createPolicyArtifact(body([{ state: "true", values: { lookup: 1 } }]));
    const candidate = createPolicyArtifact(body([{ state: "true", values: { answer: 1 } }]));
    await registry.register(baseline);
    await registry.register(candidate);
    await registry.initialize(baseline.id);
    const script = `import { LocalPolicyRegistry } from ${JSON.stringify(new URL("./policy-registry.ts", import.meta.url).pathname)};
      import { writeFile } from "node:fs/promises";
      const registry = new LocalPolicyRegistry(${JSON.stringify(directory)});
      const gate = ${JSON.stringify(gate(baseline.id, candidate.id))};
      await registry.promote(gate); await registry.rollback();
      await writeFile(${JSON.stringify(join(directory, "ready"))}, "ready");
      for (;;) { await registry.promote(gate); await registry.rollback(); }`;
    const child = spawn("bun", ["--eval", script], { stdio: ["ignore", "ignore", "pipe"] });
    let childError = "";
    child.stderr.on("data", (chunk) => {
      childError += String(chunk);
    });
    const exited = new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        try {
          await readFile(join(directory, "ready"));
          ready = true;
          break;
        } catch {
          await setTimeout(5);
        }
        if (child.exitCode !== null)
          throw new Error(childError || "Writer exited before readiness.");
      }
      expect(ready).toBe(true);
      child.kill("SIGKILL");
      await exited;
      const pointer = await registry.active();
      expect([baseline.id, candidate.id]).toContain(pointer.activeId);
      expect((await registry.readVersion(pointer.activeId)).id).toBe(pointer.activeId);
      expect(pointer.baselineId).toBe(baseline.id);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  });
});
