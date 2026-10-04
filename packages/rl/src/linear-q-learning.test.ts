import type { EnvironmentState } from "@ignitionai/agent-trainer-environment";
import { expect, test } from "vitest";
import { fitObservationFeatureEncoder, type StateFeatureEncoder } from "./feature-encoder";
import { LinearQLearningPolicy } from "./linear-q-learning";

const state = (x: number): EnvironmentState => ({ id: `s:${x}`, observation: { x } });
const encoder: StateFeatureEncoder = {
  descriptor: {
    schema: { id: "two-features", version: 1, numeric: ["x"], categorical: {} },
    normalization: [],
    featureNames: ["bias", "x"],
  },
  encode: (value) => [1, Number(value.observation.x)],
};
const options = { alpha: 0.5, gamma: 0.9, epsilon: 0, seed: 1, encoder, actionNames: ["a", "b"] };

test("linear TD learns individual weights from observed transitions and freezes an independent policy", async () => {
  const policy = new LinearQLearningPolicy(options);
  policy.update({
    state: state(0),
    action: { name: "b" },
    reward: 4,
    nextState: state(100),
    nextActions: [],
    done: true,
  });
  policy.update({
    state: state(2),
    action: { name: "a" },
    reward: 1,
    nextState: state(0),
    nextActions: [{ name: "b" }],
    done: false,
  });
  expect(policy.snapshot().a).toEqual([1.4, 2.8]);
  const frozen = policy.freeze();
  policy.update({
    state: state(2),
    action: { name: "a" },
    reward: 0,
    nextState: state(0),
    nextActions: [{ name: "b" }],
    done: true,
  });
  expect(policy.snapshot().a?.[0]).toBeCloseTo(-2.1);
  expect(policy.snapshot().a?.[1]).toBeCloseTo(-4.2);
  expect((await frozen.chooseAction(state(2), [{ name: "a" }, { name: "b" }])).name).toBe("a");
  expect((await policy.chooseAction(state(2), [{ name: "a" }, { name: "b" }])).name).toBe("b");
  expect((await frozen.chooseAction(state(2), [{ name: "b" }])).name).toBe("b");
});

test("feature fitting handles unseen categories and missing values without refitting", () => {
  const fitted = fitObservationFeatureEncoder(
    {
      id: "observed-only",
      version: 1,
      numeric: ["x"],
      categorical: { taskType: ["order", "invoice"] },
    },
    [state(2), state(4)],
  );
  const descriptor = structuredClone(fitted.descriptor);
  expect(
    fitted.encode({
      id: "eval",
      observation: { x: 3, taskType: "order", hiddenPrice: 999, correct: true },
    }),
  ).toEqual([1, 0, 0, 1, 0, 0]);
  expect(fitted.encode({ id: "eval", observation: { x: 100, taskType: "unknown" } })).toEqual([
    1, 3, 0, 0, 0, 1,
  ]);
  expect(fitted.encode({ id: "missing", observation: {} })).toEqual([1, 0, 1, 0, 0, 1]);
  expect(fitted.descriptor).toEqual(descriptor);
  expect(() => fitted.encode(state(Infinity))).toThrow();
  expect(() =>
    fitObservationFeatureEncoder({ id: "empty", version: 1, numeric: [], categorical: {} }, []),
  ).toThrow();
});

test("linear policy rejects malformed vectors, unavailable actions and invalid parameters", async () => {
  expect(() => new LinearQLearningPolicy({ ...options, alpha: 0 })).toThrow();
  expect(() => new LinearQLearningPolicy({ ...options, actionNames: ["a", "a"] })).toThrow();
  const policy = new LinearQLearningPolicy(options);
  for (const actions of [[], [{ name: "unknown" }], [{ name: "a" }, { name: "a" }]]) {
    await expect(policy.chooseAction(state(0), actions)).rejects.toThrow();
  }
  for (const features of [[1], [1, NaN], Array<number>(2)]) {
    const invalid = new LinearQLearningPolicy({
      ...options,
      encoder: { ...encoder, encode: () => features },
    });
    await expect(invalid.chooseAction(state(0), [{ name: "a" }])).rejects.toThrow("feature vector");
  }
});
