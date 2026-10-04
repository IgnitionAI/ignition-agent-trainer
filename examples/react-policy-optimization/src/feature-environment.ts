import type {
  AgentEnvironment,
  EnvironmentAction,
  EnvironmentState,
  EnvironmentStepResult,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import {
  failureAwareReact,
  type RobustnessTask,
  RobustOrderEnvironment,
} from "./robustness-environment";

export interface FeatureOrderTask extends RobustnessTask {
  taskType: string;
  verificationRequired: boolean;
  toolQuality: number | null;
  budget: number;
}

export class FeatureOrderEnvironment implements AgentEnvironment {
  private readonly base: RobustOrderEnvironment;
  constructor(private readonly task: FeatureOrderTask) {
    this.base = new RobustOrderEnvironment(task);
  }

  async reset(): Promise<EnvironmentState> {
    return this.decorate(await this.base.reset(), 0, false);
  }

  async actions(state: EnvironmentState): Promise<EnvironmentAction[]> {
    const actions = await this.base.actions(state);
    const ready =
      typeof state.observation.total === "number" ||
      (state.observation.quantity === 1 && typeof state.observation.unitPrice === "number");
    if (
      !state.done &&
      ready &&
      state.observation.verificationRequired === 1 &&
      state.observation.verified !== true
    )
      actions.push({ name: "verify_total" });
    return actions;
  }

  async step(state: EnvironmentState, action: EnvironmentAction): Promise<EnvironmentStepResult> {
    if (!(await this.actions(state)).some(({ name }) => name === action.name))
      throw new Error("Invalid feature environment action.");
    const stepCount = Number(state.observation.stepCount) + 1;
    if (action.name === "verify_total") {
      const actual = state.observation.total ?? state.observation.unitPrice;
      const verified =
        actual === Number(state.observation.unitPrice) * Number(state.observation.quantity);
      return {
        state: this.decorate({ ...state, id: `${state.id}:verified` }, stepCount, verified),
        reward: { name: "verification_cost", score: -0.02, weight: 1 },
        done: false,
      };
    }
    const result = await this.base.step(state, action);
    const next = this.decorate(result.state, stepCount, state.observation.verified === true);
    if (
      action.name === "answer" &&
      this.task.verificationRequired &&
      state.observation.verified !== true
    ) {
      next.observation.correct = false;
      return { ...result, state: next, reward: { name: "unverified_answer", score: 0, weight: 1 } };
    }
    return { ...result, state: next };
  }

  private decorate(
    state: EnvironmentState,
    stepCount: number,
    verified: boolean,
  ): EnvironmentState {
    const observation = { ...state.observation };
    const price = typeof observation.unitPrice === "number";
    const total = typeof observation.total === "number";
    const single = observation.quantity === 1;
    return {
      ...state,
      observation: {
        ...observation,
        phase: !price ? "lookup" : total ? "total" : single ? "single" : "calculate",
        taskType: this.task.taskType,
        verificationRequired: this.task.verificationRequired ? 1 : 0,
        verificationPending:
          this.task.verificationRequired && !verified && (total || (price && single)) ? 1 : 0,
        verified,
        toolQuality: price ? this.task.toolQuality : null,
        errorKind: observation.toolError ?? "none",
        remainingBudget: this.task.budget - stepCount,
        stepCount,
      },
    };
  }
}

export const verificationAwareReact: Policy = {
  async chooseAction(state, actions) {
    if (state.observation.verificationPending === 1) {
      const verify = actions.find(({ name }) => name === "verify_total");
      if (verify) return verify;
    }
    return failureAwareReact.chooseAction(state, actions);
  },
};

export const trainingContexts = [
  { taskType: "order", verificationRequired: false, toolQuality: 1, budget: 4 },
  { taskType: "order", verificationRequired: true, toolQuality: 0.5, budget: 6 },
  { taskType: "invoice", verificationRequired: true, toolQuality: 1, budget: 4 },
  { taskType: "invoice", verificationRequired: false, toolQuality: 0.5, budget: 6 },
] as const;

const validationContexts = [
  { taskType: "order", verificationRequired: true, toolQuality: 0.75, budget: 5 },
  { taskType: "invoice", verificationRequired: false, toolQuality: null, budget: 5 },
];

const heldOutContexts = [
  { taskType: "order", verificationRequired: true, toolQuality: 1, budget: 6 },
  { taskType: "invoice", verificationRequired: false, toolQuality: 1, budget: 4 },
  { taskType: "quote", verificationRequired: true, toolQuality: null, budget: 7 },
  { taskType: "quote", verificationRequired: false, toolQuality: 0.75, budget: 7 },
];

export function featureTasks(split: "train" | "validation" | "evaluation"): FeatureOrderTask[] {
  const contexts =
    split === "train"
      ? trainingContexts
      : split === "validation"
        ? validationContexts
        : heldOutContexts;
  return contexts.flatMap((context, group) =>
    Array.from({ length: 8 }, (_, index) => ({
      ...context,
      id: `${split}-features:${group}:${index}`,
      product: `${split}-item:${group}:${index}`,
      quantity: index % 2 === 0 ? 1 : split === "train" ? 2 : index + 4,
      unitPrice: split === "train" ? index + 2 : index + 20,
      category: "new-values" as const,
    })),
  );
}
