import type { JsonRecord, JsonValue, MaybePromise, Metadata } from "@ignitionai/agent-trainer-core";
import type { Trajectory } from "./trajectory";

export const PPO_NOT_IMPLEMENTED_MESSAGE =
  "PPO training is intentionally not implemented. This package exposes PPO interfaces only.";

export interface PPOConfig {
  clipRatio: number;
  discountFactor: number;
  gaeLambda: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
  normalizeAdvantages?: boolean;
  metadata?: Metadata;
}

export interface PPOTrainingSample {
  state: JsonRecord;
  action: JsonValue;
  reward: number;
  advantage: number;
  returnEstimate: number;
  oldLogProbability?: number;
  metadata?: Metadata;
}

export interface PPOTrainingBatch {
  id?: string;
  samples: readonly PPOTrainingSample[];
  trajectories?: readonly Trajectory[];
  metadata?: Metadata;
}

export interface PPOTrainingResult {
  trainerId?: string;
  policyId?: string;
  updatedPolicyId?: string;
  sampleCount: number;
  epochCount: number;
  metrics?: Record<string, number>;
  metadata?: Metadata;
}

export interface PPOTrainer {
  train(batch: PPOTrainingBatch, config: PPOConfig): MaybePromise<PPOTrainingResult>;
}

export class UnimplementedPPOTrainer implements PPOTrainer {
  constructor(private readonly message: string = PPO_NOT_IMPLEMENTED_MESSAGE) {}

  train(_batch: PPOTrainingBatch, _config: PPOConfig): never {
    throw new Error(this.message);
  }
}

export function createUnimplementedPPOTrainer(message?: string): PPOTrainer {
  return new UnimplementedPPOTrainer(message);
}
