import { describe, expect, it } from "vitest";
import {
  citationPresence,
  compositeReward,
  containsAll,
  containsText,
  jsonValidity,
  toolUsagePenalty,
} from "./rewards";

const run = {
  output: "Termination requires 30 days notice. [contract.pdf#p12]",
  trace: { steps: [{ type: "tool_call" as const, name: "search" }] },
};

const item = {
  id: "case-1",
  input: "Find termination clause.",
  expected: {
    contains: ["termination", "notice"],
    citations: ["contract.pdf#p12"],
  },
};

describe("rewards", () => {
  it("scores required text", async () => {
    const reward = containsAll();
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });

  it("keeps containsText as a compatibility alias", async () => {
    const reward = containsText();
    const result = await reward.evaluate(run, item, {});
    expect(result.name).toBe("contains_text");
    expect(result.score).toBe(1);
  });

  it("scores citations", async () => {
    const reward = citationPresence();
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });

  it("scores tool efficiency", async () => {
    const reward = toolUsagePenalty({ maxToolCalls: 1 });
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });

  it("scores JSON validity", async () => {
    const reward = jsonValidity();
    const result = await reward.evaluate({ output: '{"ok":true}', trace: { steps: [] } }, item, {});
    expect(result.score).toBe(1);
  });

  it("combines weighted rewards", async () => {
    const reward = compositeReward([containsAll({ weight: 2 }), citationPresence({ weight: 1 })]);
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
    expect(result.metadata?.components).toHaveLength(2);
  });
});
