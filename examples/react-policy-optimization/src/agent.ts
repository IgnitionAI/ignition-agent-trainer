import type {
  AgentEnvironment,
  EnvironmentAction,
  EnvironmentState,
  EnvironmentStepResult,
  Policy,
} from "@ignitionai/agent-trainer-environment";

export interface OrderTask {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
}

export type Strategy = "direct" | "lookup" | "react";
const TOOL_COST = 0.02;

/** A deterministic ReAct controller: decide, invoke a tool, observe, decide again. */
export function createOrderPolicy(strategy: Strategy): Policy {
  return {
    async chooseAction(state, actions) {
      const { unitPrice, total, quantity } = state.observation;
      if (strategy !== "direct" && typeof unitPrice !== "number") {
        return requireAction(actions, "lookup_price");
      }
      if (strategy === "react" && quantity !== 1 && typeof total !== "number") {
        return requireAction(actions, "calculate_total");
      }
      return { name: "answer", input: total ?? unitPrice ?? 0 };
    },
  };
}

function requireAction(actions: EnvironmentAction[], name: string): EnvironmentAction {
  const action = actions.find((candidate) => candidate.name === name);
  if (!action) throw new Error(`Unavailable tool: ${name}`);
  return action;
}

export class OrderEnvironment implements AgentEnvironment {
  constructor(private readonly task: OrderTask) {}

  async reset(): Promise<EnvironmentState> {
    return {
      id: this.task.id,
      observation: { product: this.task.product, quantity: this.task.quantity },
    };
  }

  async actions(state: EnvironmentState): Promise<EnvironmentAction[]> {
    if (state.done) return [];
    const actions: EnvironmentAction[] = [{ name: "answer" }];
    if (typeof state.observation.unitPrice !== "number") actions.push({ name: "lookup_price" });
    if (typeof state.observation.unitPrice === "number" && state.observation.total === undefined) {
      actions.push({ name: "calculate_total" });
    }
    return actions;
  }

  async step(state: EnvironmentState, action: EnvironmentAction): Promise<EnvironmentStepResult> {
    if (!(await this.actions(state)).some(({ name }) => name === action.name)) {
      throw new Error(`Invalid action: ${action.name}`);
    }
    if (action.name === "answer") return this.answer(state, action);
    const observation = { ...state.observation };
    if (action.name === "lookup_price") observation.unitPrice = this.task.unitPrice;
    else observation.total = Number(observation.unitPrice) * Number(observation.quantity);
    return {
      state: { id: `${state.id}:${action.name}`, observation },
      reward: { name: "tool_cost", score: -TOOL_COST, weight: 1 },
      done: false,
      metadata: { tool: action.name },
    };
  }

  private answer(state: EnvironmentState, action: EnvironmentAction): EnvironmentStepResult {
    const correct = action.input === this.task.unitPrice * this.task.quantity;
    return {
      state: {
        id: `${state.id}:answer`,
        observation: { ...state.observation, answer: action.input ?? null, correct },
        done: true,
      },
      reward: { name: "answer_correctness", score: correct ? 1 : 0, weight: 1 },
      done: true,
    };
  }
}
