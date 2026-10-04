import type {
  AgentEnvironment,
  EnvironmentAction,
  EnvironmentState,
  EnvironmentStepResult,
  Policy,
} from "@ignitionai/agent-trainer-environment";

export const categories = [
  "interpolation",
  "new-values",
  "missing-price",
  "unknown-product",
  "transient-error",
  "permanent-error",
  "incomplete-observation",
  "missing-quantity",
] as const;
export type RobustnessCategory = (typeof categories)[number];
export interface RobustnessTask {
  id: string;
  product: string;
  quantity: number | null;
  unitPrice: number | null;
  category: RobustnessCategory;
}

export const robustnessTasks: RobustnessTask[] = categories.flatMap((category) =>
  Array.from({ length: 10 }, (_, index) => ({
    id: `robust-v1:${category}:${index}`,
    product: `held-${category}-${index}`,
    quantity: category === "missing-quantity" ? null : category === "interpolation" ? 2 : 4 + index,
    unitPrice: category === "missing-price" ? null : category === "interpolation" ? 2 : 30 + index,
    category,
  })),
);

/** Domain tool contract: answer only from complete observations, bounded retries. */
export class RobustOrderEnvironment implements AgentEnvironment {
  constructor(private readonly task: RobustnessTask) {}

  async reset(): Promise<EnvironmentState> {
    return {
      id: this.task.id,
      observation: { product: this.task.product, quantity: this.task.quantity, attempts: 0 },
    };
  }

  async actions(state: EnvironmentState): Promise<EnvironmentAction[]> {
    if (state.done) return [];
    const { quantity, unitPrice, total, toolError, attempts } = state.observation;
    if (typeof quantity !== "number") return [{ name: "clarify" }];
    if (typeof unitPrice !== "number") {
      if (toolError && (toolError !== "transient" || Number(attempts) >= 2))
        return [{ name: "abstain" }];
      return [{ name: "lookup_price" }, { name: "abstain" }];
    }
    if (quantity !== 1 && typeof total !== "number")
      return [{ name: "calculate_total" }, { name: "answer" }, { name: "abstain" }];
    return [{ name: "answer" }, { name: "abstain" }];
  }

  async step(state: EnvironmentState, action: EnvironmentAction): Promise<EnvironmentStepResult> {
    if (!(await this.actions(state)).some(({ name }) => name === action.name))
      throw new Error(`Invalid robust action: ${action.name}`);
    if (["answer", "clarify", "abstain"].includes(action.name)) return this.finish(state, action);
    const observation = { ...state.observation };
    if (action.name === "calculate_total")
      observation.total = Number(observation.unitPrice) * Number(observation.quantity);
    else {
      observation.attempts = Number(observation.attempts) + 1;
      const error = this.lookupError(Number(observation.attempts));
      if (error) observation.toolError = error;
      else {
        observation.unitPrice = this.task.unitPrice;
        observation.toolError = null;
      }
    }
    return {
      state: { id: `${state.id}:${action.name}`, observation },
      reward: { name: "tool_cost", score: -0.02, weight: 1 },
      done: false,
      metadata: { tool: action.name },
    };
  }

  private lookupError(attempt: number): string | null {
    const errors: Partial<Record<RobustnessCategory, string>> = {
      "missing-price": "missing-price",
      "unknown-product": "not-found",
      "permanent-error": "permanent",
      "incomplete-observation": "invalid-response",
    };
    if (this.task.category === "transient-error" && attempt === 1) return "transient";
    return errors[this.task.category] ?? null;
  }

  private finish(state: EnvironmentState, action: EnvironmentAction): EnvironmentStepResult {
    const expectedAction =
      this.task.quantity === null
        ? "clarify"
        : [
              "missing-price",
              "unknown-product",
              "permanent-error",
              "incomplete-observation",
            ].includes(this.task.category)
          ? "abstain"
          : "answer";
    const numericAnswer = typeof action.input === "number";
    const supported =
      typeof state.observation.unitPrice === "number" &&
      typeof state.observation.quantity === "number";
    const correct =
      action.name === expectedAction &&
      (action.name !== "answer" ||
        action.input === Number(this.task.unitPrice) * Number(this.task.quantity));
    return {
      state: {
        id: `${state.id}:done`,
        done: true,
        observation: {
          ...state.observation,
          response: action.name,
          answer: action.input ?? null,
          correct,
          unsupportedAnswer: numericAnswer && !supported,
        },
      },
      reward: { name: "task_success", score: correct ? 1 : 0, weight: 1 },
      done: true,
    };
  }
}

export const failureAwareReact: Policy = {
  async chooseAction(state, actions) {
    const { unitPrice, total, quantity } = state.observation;
    const desired =
      typeof quantity !== "number"
        ? "clarify"
        : typeof unitPrice !== "number"
          ? "lookup_price"
          : quantity !== 1 && typeof total !== "number"
            ? "calculate_total"
            : "answer";
    const action =
      actions.find(({ name }) => name === desired) ??
      actions.find(({ name }) => name === "abstain" || name === "clarify");
    if (!action) throw new Error("No valid reference action.");
    return action.name === "answer" ? { ...action, input: total ?? unitPrice ?? 0 } : { ...action };
  },
};
