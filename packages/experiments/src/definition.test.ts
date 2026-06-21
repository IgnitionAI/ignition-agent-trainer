import { createDataset, createMockAdapter } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import type { ExperimentConfig } from "@ignitionai/experiments";
import { describe, expect, it } from "vitest";
import { defineExperiment } from "./definition";

const dataset = createDataset([
  {
    id: "q1",
    input: "What is Ignition Agent Trainer?",
    expected: { contains: ["evaluation", "agents"] },
  },
]);

const variants = [
  {
    id: "mock-agent",
    name: "mock-agent",
    adapter: createMockAdapter({
      output: "Ignition Agent Trainer evaluates agents.",
      trace: { steps: [] },
    }),
  },
];

const rewards = [containsAll()];

describe("defineExperiment", () => {
  it("returns a typed runnable experiment definition", async () => {
    const definition = defineExperiment({
      name: "typed-definition-demo",
      dataset,
      variants,
      rewards,
      metadata: { owner: "experiments" },
    });

    expect(definition.kind).toBe("ignition.experiment-definition");
    expect(definition.name).toBe("typed-definition-demo");
    expect(definition.dataset).toBe(dataset);
    expect(definition.variants).toBe(variants);
    expect(definition.rewards).toBe(rewards);

    const result = await definition.run();
    expect(result.name).toBe("typed-definition-demo");
    expect(result.leaderboard[0]?.name).toBe("mock-agent");
  });

  it("can create a fresh experiment instance from the definition", async () => {
    const definition = defineExperiment({
      name: "typed-definition-create",
      dataset,
      variants,
      rewards,
    });

    const result = await definition.create().run();

    expect(result.cases).toHaveLength(1);
    expect(result.failedCases).toHaveLength(0);
  });

  it("fails predictably for invalid definitions", () => {
    expect(() =>
      defineExperiment({
        name: "",
        dataset,
        variants,
        rewards,
      }),
    ).toThrow("Experiment name is required.");

    expect(() =>
      defineExperiment({
        name: "missing-variants",
        dataset,
        variants: [],
        rewards,
      }),
    ).toThrow("At least one variant is required.");

    expect(() =>
      defineExperiment({
        name: "missing-rewards",
        dataset,
        variants,
        rewards: [],
      }),
    ).toThrow("At least one reward is required.");
  });

  it("fails predictably for missing runtime fields from untyped module imports", () => {
    expect(() =>
      defineExperiment({
        name: "missing-dataset",
        variants,
        rewards,
      } as unknown as ExperimentConfig),
    ).toThrow("Experiment dataset is required.");

    expect(() =>
      defineExperiment({
        name: "missing-variants",
        dataset,
        rewards,
      } as unknown as ExperimentConfig),
    ).toThrow("Experiment variants are required.");

    expect(() =>
      defineExperiment({
        name: "missing-rewards",
        dataset,
        variants,
      } as unknown as ExperimentConfig),
    ).toThrow("Experiment rewards are required.");

    expect(() =>
      defineExperiment({
        name: "missing-runner",
        dataset,
        variants: [{ name: "no-runner" }],
        rewards,
      }),
    ).toThrow("Variant no-runner requires an adapter or run function.");
  });
});
