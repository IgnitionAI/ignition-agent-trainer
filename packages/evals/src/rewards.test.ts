import { describe, expect, it } from "vitest";
import { containsText, citationPresence, toolCallCountPenalty } from "./rewards";

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
    const reward = containsText();
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });

  it("scores citations", async () => {
    const reward = citationPresence();
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });

  it("scores tool efficiency", async () => {
    const reward = toolCallCountPenalty({ maxToolCalls: 1 });
    const result = await reward.evaluate(run, item, {});
    expect(result.score).toBe(1);
  });
});
