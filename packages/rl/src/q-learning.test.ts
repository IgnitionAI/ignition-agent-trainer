import type { AgentEnvironment, EnvironmentState } from "@ignitionai/agent-trainer-environment";
import { expect, test } from "vitest";
import { runLearningEpisode } from "./learning-episode";
import { TabularQLearningPolicy } from "./q-learning";

const state = (id: string): EnvironmentState => ({ id, observation: {} });
const options = {
  alpha: 0.5,
  gamma: 0.9,
  epsilon: 0,
  seed: 1,
  encodeState: (value: EnvironmentState) => value.id,
};

test("Q updates use observed reward, available next actions and no terminal bootstrap", async () => {
  const policy = new TabularQLearningPolicy(options);
  policy.update({
    state: state("next"),
    action: { name: "available" },
    reward: 4,
    nextState: state("end"),
    nextActions: [],
    done: true,
  });
  policy.update({
    state: state("next"),
    action: { name: "unavailable" },
    reward: 100,
    nextState: state("end"),
    nextActions: [],
    done: true,
  });
  policy.update({
    state: state("start"),
    action: { name: "lookup" },
    reward: 1,
    nextState: state("next"),
    nextActions: [{ name: "available" }],
    done: false,
  });
  expect(policy.snapshot().find((entry) => entry.state === "start")?.values.lookup).toBeCloseTo(
    1.4,
  );
  policy.update({
    state: state("start"),
    action: { name: "lookup" },
    reward: -2,
    nextState: state("next"),
    nextActions: [{ name: "unavailable" }],
    done: true,
  });
  expect(policy.snapshot().find((entry) => entry.state === "start")?.values.lookup).toBeCloseTo(
    -0.3,
  );
  expect((await policy.chooseAction(state("next"), [{ name: "available" }])).name).toBe(
    "available",
  );
});

test("frozen decisions are detached from learning, snapshots and prototype property names", async () => {
  const policy = new TabularQLearningPolicy({ ...options, epsilon: 1 });
  policy.update({
    state: state("s"),
    action: { name: "b" },
    reward: 4,
    nextState: state("end"),
    nextActions: [],
    done: true,
  });
  const frozen = policy.freeze();
  const snapshot = policy.snapshot();
  const entry = snapshot[0];
  if (entry) entry.values.a = 100;
  policy.update({
    state: state("s"),
    action: { name: "a" },
    reward: 100,
    nextState: state("end"),
    nextActions: [],
    done: true,
  });
  expect((await frozen.chooseAction(state("s"), [{ name: "a" }, { name: "b" }])).name).toBe("b");
  expect((await frozen.chooseAction(state("s"), [{ name: "toString" }, { name: "b" }])).name).toBe(
    "b",
  );
});

test("rejects invalid learning parameters, transitions, encoders and action sets", async () => {
  for (const invalid of [{ alpha: 0 }, { gamma: -1 }, { epsilon: Number.NaN }, { seed: 0.5 }]) {
    expect(() => new TabularQLearningPolicy({ ...options, ...invalid })).toThrow();
  }
  const policy = new TabularQLearningPolicy(options);
  for (const actions of [[], [{ name: "" }], [{ name: "a" }, { name: "a" }]]) {
    await expect(policy.chooseAction(state("s"), actions)).rejects.toThrow();
  }
  expect(() =>
    policy.update({
      state: state("s"),
      action: { name: "a" },
      reward: Infinity,
      nextState: state("s"),
      nextActions: [],
      done: true,
    }),
  ).toThrow();
  await expect(
    new TabularQLearningPolicy({ ...options, encodeState: () => "" }).chooseAction(state("s"), [
      { name: "a" },
    ]),
  ).rejects.toThrow();
});

test("learning runner exposes budget truncation and does not execute unavailable actions", async () => {
  let executed = 0;
  const environment: AgentEnvironment = {
    async reset() {
      return state("s");
    },
    async actions() {
      return [{ name: "wait" }];
    },
    async step() {
      executed += 1;
      return { state: state("s"), reward: { name: "cost", score: -0.1, weight: 1 }, done: false };
    },
  };
  const episode = await runLearningEpisode(environment, new TabularQLearningPolicy(options), {
    maxSteps: 2,
  });
  expect(episode.truncated).toBe(true);
  expect(episode.done).toBe(false);
  expect(episode.steps).toHaveLength(2);
  expect(episode.totalReward).toBeCloseTo(-0.2);
  await expect(
    runLearningEpisode(
      environment,
      {
        async chooseAction() {
          return { name: "forbidden" };
        },
      },
      { maxSteps: 2 },
    ),
  ).rejects.toThrow("Unavailable action");
  expect(executed).toBe(2);
  await expect(
    runLearningEpisode(environment, new TabularQLearningPolicy(options), { maxSteps: 0 }),
  ).rejects.toThrow();
});
