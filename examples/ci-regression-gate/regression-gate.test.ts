import { describe, expect, it } from "vitest";
import { runRegressionGate } from "./regression-gate";

describe("ci regression gate example", () => {
  it("passes against the committed context-engineering baseline", async () => {
    const comparison = await runRegressionGate();

    expect(comparison.passed).toBe(true);
    expect(comparison.failures).toEqual([]);
    expect(comparison.markdown).toContain("Result: pass");
  });
});
