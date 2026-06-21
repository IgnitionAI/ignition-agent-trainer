import { createDataset } from "@ignitionai/core";
import { containsAll } from "@ignitionai/evals";
import { describe, expect, it } from "vitest";
import {
  createCandidateVariants,
  type EvaluationCandidate,
  evaluateCandidates,
} from "./candidate-evaluation";

const dataset = createDataset([
  {
    id: "case-1",
    input: "Explain Ignition Agent Trainer.",
    expected: { contains: ["evaluation", "agents"] },
  },
]);

describe("candidate evaluation", () => {
  it("evaluates two or more prompt candidates", async () => {
    const candidates: EvaluationCandidate[] = [
      promptCandidate("brief", "Brief answer", "Ignition Agent Trainer compares agents."),
      promptCandidate(
        "complete",
        "Complete answer",
        "Ignition Agent Trainer uses evaluation to compare agents.",
      ),
    ];

    const result = await evaluateCandidates({
      name: "prompt-candidate-test",
      dataset,
      candidates,
      rewards: [containsAll()],
      objective: "quality-first",
    });

    expect(result.report.failedCases).toHaveLength(0);
    expect(result.ranking.map((row) => row.variantId)).toEqual(["complete", "brief"]);
    expect(result.best?.variantId).toBe("complete");
  });

  it("evaluates workflow-like candidates", async () => {
    const candidates: EvaluationCandidate[] = [
      workflowCandidate("direct", { steps: ["answer"] }, "The agent answers directly."),
      workflowCandidate(
        "verify",
        { steps: ["retrieve", "answer", "verify"] },
        "The workflow uses evaluation and verification for agents.",
      ),
    ];

    const result = await evaluateCandidates({
      name: "workflow-candidate-test",
      dataset,
      candidates,
      rewards: [containsAll()],
      objective: "quality-first",
    });

    expect(result.ranking.map((row) => row.variantId)).toEqual(["verify", "direct"]);
  });

  it("preserves deterministic ranking for tied candidates", async () => {
    const candidates: EvaluationCandidate[] = [
      promptCandidate("b-candidate", "Same", "evaluation agents"),
      promptCandidate("a-candidate", "Same", "evaluation agents"),
    ];

    const result = await evaluateCandidates({
      name: "candidate-tie-test",
      dataset,
      candidates,
      rewards: [containsAll()],
      objective: "quality-first",
    });

    expect(result.ranking.map((row) => row.variantId)).toEqual(["a-candidate", "b-candidate"]);
  });

  it("handles an empty candidate list", async () => {
    const result = await evaluateCandidates({
      name: "empty-candidate-test",
      dataset,
      candidates: [],
      rewards: [containsAll()],
    });

    expect(result.report.leaderboard).toEqual([]);
    expect(result.ranking).toEqual([]);
    expect(result.best).toBeNull();
  });

  it("converts candidates into experiment variants", () => {
    const variants = createCandidateVariants([
      promptCandidate("prompt", "Prompt", "evaluation agents"),
      workflowCandidate("workflow", "Workflow", "evaluation agents"),
    ]);

    expect(variants.map((variant) => variant.id)).toEqual(["prompt", "workflow"]);
    expect(variants[0]?.config).toMatchObject({ kind: "prompt", prompt: "Prompt" });
    expect(variants[1]?.config).toMatchObject({ kind: "workflow", workflow: "Workflow" });
  });
});

function promptCandidate(id: string, prompt: string, output: string): EvaluationCandidate {
  return {
    id,
    kind: "prompt",
    prompt,
    run() {
      return {
        output,
        trace: { steps: [{ type: "custom", name: "candidate.prompt", payload: { id } }] },
      };
    },
  };
}

function workflowCandidate(
  id: string,
  workflow: string | Record<string, unknown>,
  output: string,
): EvaluationCandidate {
  return {
    id,
    kind: "workflow",
    workflow,
    run() {
      return {
        output,
        trace: { steps: [{ type: "custom", name: "candidate.workflow", payload: { id } }] },
      };
    },
  };
}
