import { describe, expect, it } from "vitest";
import {
  createUnimplementedPPOTrainer,
  PPO_NOT_IMPLEMENTED_MESSAGE,
  type PPOConfig,
  type PPOTrainer,
  type PPOTrainingBatch,
  type PPOTrainingResult,
  UnimplementedPPOTrainer,
} from "./ppo";
import { recordTrajectory } from "./trajectory";

describe("PPO interface skeletons", () => {
  it("defines PPO config, batch and result shapes without running an algorithm", () => {
    const config: PPOConfig = {
      clipRatio: 0.2,
      discountFactor: 0.99,
      gaeLambda: 0.95,
      learningRate: 0.0003,
      epochs: 4,
      batchSize: 32,
      normalizeAdvantages: true,
    };
    const batch: PPOTrainingBatch = {
      id: "ppo-batch-1",
      samples: [
        {
          state: { task: "support", risk: "medium" },
          action: { id: "rag-basic" },
          reward: 0.82,
          advantage: 0.12,
          returnEstimate: 0.94,
          oldLogProbability: -0.4,
        },
      ],
      trajectories: [
        recordTrajectory(
          [{ state: { task: "support" }, action: { id: "rag-basic" }, reward: 0.82 }],
          { id: "trajectory-ppo-skeleton" },
        ),
      ],
    };
    const resultShape: PPOTrainingResult = {
      trainerId: "future-ppo",
      policyId: "policy-before",
      updatedPolicyId: "policy-after",
      sampleCount: batch.samples.length,
      epochCount: config.epochs,
      metrics: { policyLoss: 0 },
    };

    expect(resultShape).toMatchObject({
      sampleCount: 1,
      epochCount: 4,
      metrics: { policyLoss: 0 },
    });
  });

  it("fails clearly when the unimplemented trainer is called", () => {
    const trainer: PPOTrainer = new UnimplementedPPOTrainer();

    expect(() => trainer.train(batch(), config())).toThrow(PPO_NOT_IMPLEMENTED_MESSAGE);
  });

  it("supports a factory for explicit non-implementation placeholders", () => {
    const trainer = createUnimplementedPPOTrainer("Custom PPO implementation required.");

    expect(() => trainer.train(batch(), config())).toThrow("Custom PPO implementation required.");
  });
});

function config(): PPOConfig {
  return {
    clipRatio: 0.2,
    discountFactor: 0.99,
    gaeLambda: 0.95,
    learningRate: 0.0003,
    epochs: 1,
    batchSize: 1,
  };
}

function batch(): PPOTrainingBatch {
  return {
    samples: [
      {
        state: { step: 1 },
        action: "answer",
        reward: 1,
        advantage: 0,
        returnEstimate: 1,
      },
    ],
  };
}
