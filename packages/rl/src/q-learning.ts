import type {
  EnvironmentAction,
  EnvironmentState,
  Policy,
} from "@ignitionai/agent-trainer-environment";

export interface LearningTransition {
  state: EnvironmentState;
  action: EnvironmentAction;
  reward: number;
  nextState: EnvironmentState;
  nextActions: EnvironmentAction[];
  done: boolean;
}

export interface LearningPolicy extends Policy {
  update(transition: LearningTransition): void;
}

export interface QLearningOptions {
  alpha: number;
  gamma: number;
  epsilon: number;
  seed: number;
  encodeState(state: EnvironmentState): string;
  bindAction?(state: EnvironmentState, action: EnvironmentAction): EnvironmentAction;
}

export interface QTableEntry {
  state: string;
  values: Record<string, number>;
}

export class TabularQLearningPolicy implements LearningPolicy {
  private readonly table = new Map<string, Map<string, number>>();
  private readonly random: () => number;
  private readonly options: QLearningOptions;

  constructor(options: QLearningOptions) {
    for (const name of ["alpha", "gamma", "epsilon"] as const) {
      const value = options[name];
      if (!Number.isFinite(value) || value < 0 || value > 1 || (name === "alpha" && value === 0)) {
        throw new Error(`Invalid Q-learning ${name}: ${value}`);
      }
    }
    this.options = { ...options };
    this.random = createSeededRandom(options.seed);
  }

  async chooseAction(
    state: EnvironmentState,
    actions: EnvironmentAction[],
  ): Promise<EnvironmentAction> {
    const available = validateActions(actions);
    const key = this.encode(state);
    const selected =
      this.random() < this.options.epsilon
        ? available[Math.floor(this.random() * available.length)]
        : this.best(key, available);
    if (!selected) throw new Error("Q-learning has no available action.");
    return this.bind(state, selected);
  }

  update(transition: LearningTransition): void {
    if (!Number.isFinite(transition.reward)) throw new Error("Q-learning reward must be finite.");
    if (!transition.action.name.trim()) throw new Error("Q-learning action name is required.");
    const key = this.encode(transition.state);
    const previous = this.value(key, transition.action.name);
    const future = transition.done ? 0 : this.nextValue(transition);
    const target = transition.reward + this.options.gamma * future;
    const value = previous + this.options.alpha * (target - previous);
    if (!Number.isFinite(value)) throw new Error("Q-learning update must be finite.");
    const values = this.table.get(key) ?? new Map<string, number>();
    values.set(transition.action.name, value);
    this.table.set(key, values);
  }

  snapshot(): QTableEntry[] {
    return [...this.table.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, values]) => ({
        state,
        values: Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b))),
      }));
  }

  freeze(): Policy {
    const table = new Map(
      this.snapshot().map(({ state, values }) => [state, new Map(Object.entries(values))]),
    );
    const encode = this.options.encodeState;
    const bind = this.options.bindAction;
    return {
      async chooseAction(state, actions) {
        const key = encode(state);
        if (!key.trim()) throw new Error("Q-learning state key is required.");
        const selected = bestAction(
          validateActions(actions),
          (action) => table.get(key)?.get(action.name) ?? 0,
        );
        const bound = bind ? bind(state, { ...selected }) : { ...selected };
        if (bound.name !== selected.name)
          throw new Error("Action binder cannot change the selected action.");
        return bound;
      },
    };
  }

  private nextValue(transition: LearningTransition): number {
    const actions = validateActions(transition.nextActions);
    const key = this.encode(transition.nextState);
    return this.value(key, this.best(key, actions).name);
  }

  private best(key: string, actions: EnvironmentAction[]): EnvironmentAction {
    return bestAction(actions, (action) => this.value(key, action.name));
  }

  private value(key: string, action: string): number {
    return this.table.get(key)?.get(action) ?? 0;
  }

  private encode(state: EnvironmentState): string {
    const key = this.options.encodeState(state);
    if (!key.trim()) throw new Error("Q-learning state key is required.");
    return key;
  }

  private bind(state: EnvironmentState, action: EnvironmentAction): EnvironmentAction {
    const bound = this.options.bindAction
      ? this.options.bindAction(state, { ...action })
      : { ...action };
    if (bound.name !== action.name)
      throw new Error("Action binder cannot change the selected action.");
    return bound;
  }
}

/** Mulberry32; local reproducibility, not cryptographic randomness. */
export function createSeededRandom(seed: number): () => number {
  if (!Number.isSafeInteger(seed)) throw new Error("Random seed must be a safe integer.");
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function validateActions(actions: EnvironmentAction[]): EnvironmentAction[] {
  if (actions.length === 0) throw new Error("Q-learning has no available action.");
  const names = actions.map(({ name }) => name);
  if (names.some((name) => !name.trim()) || new Set(names).size !== names.length) {
    throw new Error("Q-learning requires distinct nonempty action names.");
  }
  return actions;
}

function bestAction(
  actions: EnvironmentAction[],
  score: (action: EnvironmentAction) => number,
): EnvironmentAction {
  const best = [...actions].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
  if (!best) throw new Error("Q-learning has no available action.");
  return best;
}
