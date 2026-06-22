import { describe, expect, it } from "vitest";
import { runAlphaDogfoodRegressionGate } from "./regression-gate";

describe("alpha dogfood regression gate", () => {
  it("passes against the committed alpha dogfood baseline", async () => {
    const comparison = await runAlphaDogfoodRegressionGate();

    expect(comparison.passed).toBe(true);
    expect(comparison.failures).toEqual([]);
    expect(comparison.markdown).toContain("Result: pass");
  });
});
