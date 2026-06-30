import { describe, expect, it } from "vitest";
import {
  type AgentEnvironment,
  defineEnvironmentEpisode,
  type EnvironmentAction,
  type EnvironmentState,
  type Policy,
  runEpisode,
} from "./environment";

describe("runEpisode", () => {
  it("runs a complete weighted episode and preserves state transitions", async () => {
    const environment = new ScriptedEnvironment([
      {
        action: "search",
        score: 0.5,
        weight: 0.4,
        nextState: "searched",
      },
      {
        action: "answer",
        score: 1,
        weight: 0.6,
        nextState: "answered",
        done: true,
        metadata: { accepted: true },
      },
    ]);

    const result = await runEpisode(environment, new OrderedPolicy(), {
      policyId: "ordered-rag",
      metadata: { source: "unit-test" },
    });

    expect(result).toMatchObject({
      totalReward: 0.8,
      averageReward: 0.4,
      done: true,
      policyId: "ordered-rag",
      metadata: { source: "unit-test" },
      finalState: { id: "answered", done: true },
    });
    expect(result.steps.map((step) => step.action.name)).toEqual(["search", "answer"]);
    expect(result.steps[0]).toMatchObject({
      state: { id: "initial" },
      nextState: { id: "searched" },
      done: false,
    });
    expect(result.steps[1]?.metadata).toEqual({ accepted: true });
  });

  it("passes seed to reset", async () => {
    const environment = new ScriptedEnvironment([
      {
        action: "answer",
        score: 1,
        weight: 1,
        nextState: "answered",
        done: true,
      },
    ]);

    await runEpisode(environment, new OrderedPolicy(), { seed: 42 });

    expect(environment.seed).toBe(42);
  });

  it("stops unsafe infinite episodes with maxSteps", async () => {
    const environment = new ScriptedEnvironment([
      {
        action: "search",
        score: 0.2,
        weight: 1,
        nextState: "loop",
      },
      {
        action: "search",
        score: 0.2,
        weight: 1,
        nextState: "loop",
      },
    ]);

    await expect(runEpisode(environment, new OrderedPolicy(), { maxSteps: 1 })).rejects.toThrow(
      "Episode exceeded maxSteps (1).",
    );
  });

  it("rejects empty action lists", async () => {
    const environment: AgentEnvironment = {
      async reset() {
        return state("initial");
      },
      async actions() {
        return [];
      },
      async step() {
        throw new Error("Unexpected step.");
      },
    };

    await expect(runEpisode(environment, new OrderedPolicy())).rejects.toThrow(
      "Environment returned no actions for state initial.",
    );
  });

  it("rejects non-finite reward values", async () => {
    const environment = new ScriptedEnvironment([
      {
        action: "answer",
        score: Number.NaN,
        weight: 1,
        nextState: "answered",
        done: true,
      },
    ]);

    await expect(runEpisode(environment, new OrderedPolicy())).rejects.toThrow(
      "Environment reward score must be finite for action answer.",
    );
  });

  it("defines reusable environment episode modules with overridable options", async () => {
    const definition = defineEnvironmentEpisode({
      name: "scripted-environment",
      environment: () =>
        new ScriptedEnvironment([
          {
            action: "answer",
            score: 1,
            weight: 1,
            nextState: "answered",
            done: true,
          },
        ]),
      policy: () => new OrderedPolicy(),
      options: {
        seed: 1,
        policyId: "default-policy",
        metadata: { defaultOption: true },
      },
      metadata: { source: "unit-test" },
    });

    const episode = await definition.run({
      seed: 2,
      policyId: "override-policy",
      metadata: { overrideOption: true },
    });

    expect(definition.kind).toBe("ignition.environment-episode-definition");
    expect(episode.policyId).toBe("override-policy");
    expect(episode.metadata).toEqual({
      source: "unit-test",
      defaultOption: true,
      overrideOption: true,
    });
    expect(episode.finalState.id).toBe("answered");
  });

  it("rejects invalid environment episode definitions clearly", async () => {
    expect(() =>
      defineEnvironmentEpisode({
        name: " ",
        environment: new ScriptedEnvironment([]),
        policy: new OrderedPolicy(),
      }),
    ).toThrow("Environment episode name is required.");

    const definition = defineEnvironmentEpisode({
      name: "bad-environment",
      environment: () => ({}) as AgentEnvironment,
      policy: new OrderedPolicy(),
    });

    await expect(Promise.resolve().then(() => definition.run())).rejects.toThrow(
      "Environment episode environment must implement reset, actions and step.",
    );
  });
});

interface ScriptedTransition {
  action: string;
  score: number;
  weight: number;
  nextState: string;
  done?: boolean;
  metadata?: Record<string, unknown>;
}

class ScriptedEnvironment implements AgentEnvironment {
  seed: number | undefined;
  private index = 0;

  constructor(private readonly transitions: ScriptedTransition[]) {}

  async reset(seed?: number): Promise<EnvironmentState> {
    this.seed = seed;
    this.index = 0;
    return state("initial");
  }

  async actions(): Promise<EnvironmentAction[]> {
    const transition = this.transitions[this.index] ?? this.transitions.at(-1);
    return transition === undefined ? [] : [{ name: transition.action }];
  }

  async step() {
    const transition = this.transitions[this.index] ?? this.transitions.at(-1);
    if (transition === undefined) throw new Error("Missing scripted transition.");
    this.index += 1;

    return {
      state: state(transition.nextState, transition.done),
      reward: {
        name: transition.action,
        score: transition.score,
        weight: transition.weight,
      },
      done: transition.done ?? false,
      ...(transition.metadata !== undefined ? { metadata: transition.metadata } : {}),
    };
  }
}

class OrderedPolicy implements Policy {
  async chooseAction(_state: EnvironmentState, actions: EnvironmentAction[]) {
    const action = actions[0];
    if (action === undefined) throw new Error("No action available.");
    return action;
  }
}

function state(id: string, done = false): EnvironmentState {
  return {
    id,
    observation: { id },
    ...(done ? { done: true } : {}),
  };
}
