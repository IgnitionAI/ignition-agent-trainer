import type {
  EnvironmentAction,
  EnvironmentState,
  Policy,
} from "@ignitionai/agent-trainer-environment";
import type { StateFeatureEncoder } from "./feature-encoder";
import { createSeededRandom, type LearningPolicy, type LearningTransition } from "./q-learning";

export interface LinearQLearningOptions {
  alpha: number;
  gamma: number;
  epsilon: number;
  seed: number;
  actionNames: readonly string[];
  encoder: StateFeatureEncoder;
  bindAction?(state: EnvironmentState, action: EnvironmentAction): EnvironmentAction;
}

export class LinearQLearningPolicy implements LearningPolicy {
  private readonly weights: Map<string, number[]>;
  private readonly random: () => number;
  private readonly options: LinearQLearningOptions;
  private readonly dimension: number;

  constructor(options: LinearQLearningOptions) {
    for (const name of ["alpha", "gamma", "epsilon"] as const) {
      const value = options[name];
      if (!Number.isFinite(value) || value < 0 || value > 1 || (name === "alpha" && value === 0))
        throw new Error(`Invalid linear Q-learning ${name}.`);
    }
    if (
      options.actionNames.length === 0 ||
      options.actionNames.some((name) => !name.trim()) ||
      new Set(options.actionNames).size !== options.actionNames.length
    )
      throw new Error("Linear action names must be unique and nonempty.");
    this.dimension = options.encoder.descriptor.featureNames.length;
    if (this.dimension === 0) throw new Error("Linear features are required.");
    this.options = { ...options, actionNames: [...options.actionNames] };
    this.weights = new Map(
      options.actionNames.map((name) => [name, Array<number>(this.dimension).fill(0)]),
    );
    this.random = createSeededRandom(options.seed);
  }

  async chooseAction(
    state: EnvironmentState,
    actions: EnvironmentAction[],
  ): Promise<EnvironmentAction> {
    this.validateActions(actions);
    const features = this.features(state);
    const selected =
      this.random() < this.options.epsilon
        ? actions[Math.floor(this.random() * actions.length)]
        : this.best(features, actions);
    if (!selected) throw new Error("Linear policy has no available action.");
    return this.bind(state, selected);
  }

  update(transition: LearningTransition): void {
    if (!Number.isFinite(transition.reward)) throw new Error("Linear reward must be finite.");
    this.validateActions([transition.action]);
    const features = this.features(transition.state);
    let nextValue = 0;
    if (!transition.done) {
      this.validateActions(transition.nextActions);
      const next = this.features(transition.nextState);
      nextValue = this.value(this.best(next, transition.nextActions).name, next);
    }
    const error =
      transition.reward +
      this.options.gamma * nextValue -
      this.value(transition.action.name, features);
    const old = this.weights.get(transition.action.name);
    if (!old) throw new Error("Unknown linear action.");
    const weights = old.map(
      (weight, index) => weight + this.options.alpha * error * (features[index] ?? 0),
    );
    if (weights.some((weight) => !Number.isFinite(weight)))
      throw new Error("Linear update diverged to non-finite weights.");
    this.weights.set(transition.action.name, weights);
  }

  snapshot(): Record<string, number[]> {
    return Object.fromEntries(
      [...this.weights.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, weights]) => [name, [...weights]]),
    );
  }

  freeze(): Policy {
    const snapshot = new Map(Object.entries(this.snapshot()));
    return {
      chooseAction: async (state, actions) => {
        this.validateActions(actions);
        const features = this.features(state);
        const action = [...actions].sort(
          (a, b) =>
            dot(snapshot.get(b.name) ?? [], features) - dot(snapshot.get(a.name) ?? [], features) ||
            a.name.localeCompare(b.name),
        )[0];
        if (!action) throw new Error("Linear policy has no action.");
        return this.bind(state, action);
      },
    };
  }

  private features(state: EnvironmentState): number[] {
    const features = this.options.encoder.encode(state);
    if (features.length !== this.dimension || features.some((value) => !Number.isFinite(value)))
      throw new Error("Invalid linear feature vector.");
    return features;
  }

  private value(name: string, features: number[]): number {
    const weights = this.weights.get(name);
    if (!weights) throw new Error(`Unknown linear action: ${name}`);
    const value = dot(weights, features);
    if (!Number.isFinite(value)) throw new Error("Linear action value must be finite.");
    return value;
  }

  private best(features: number[], actions: EnvironmentAction[]): EnvironmentAction {
    const best = [...actions].sort(
      (a, b) =>
        this.value(b.name, features) - this.value(a.name, features) || a.name.localeCompare(b.name),
    )[0];
    if (!best) throw new Error("Linear policy has no action.");
    return best;
  }

  private validateActions(actions: EnvironmentAction[]): void {
    if (
      actions.length === 0 ||
      new Set(actions.map(({ name }) => name)).size !== actions.length ||
      actions.some(({ name }) => !this.weights.has(name))
    )
      throw new Error("Invalid or unknown linear action set.");
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

function dot(weights: number[], features: number[]): number {
  const value = weights.reduce((sum, weight, index) => sum + weight * (features[index] ?? 0), 0);
  if (!Number.isFinite(value)) throw new Error("Linear action value must be finite.");
  return value;
}
