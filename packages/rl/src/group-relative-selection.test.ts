import { describe, expect, it } from "vitest";
import {
  type GroupRelativeCandidateGroup,
  rankCandidateGroup,
  selectGroupRelativeBest,
} from "./group-relative-selection";

describe("group-relative candidate selection", () => {
  it("ranks candidates inside a group by relative advantage", () => {
    const group = rankCandidateGroup({
      id: "prompt-set-a",
      kind: "prompt",
      candidates: [
        { id: "prompt-short", score: 0.5 },
        { id: "prompt-cited", score: 0.9 },
        { id: "prompt-balanced", score: 0.7 },
      ],
    });

    expect(group.averageScore).toBeCloseTo(0.7);
    expect(group.bestCandidate).toMatchObject({
      candidateId: "prompt-cited",
      rankInGroup: 1,
      kind: "prompt",
    });
    expect(group.bestCandidate?.relativeScore).toBeCloseTo(0.2);
    expect(group.candidates.map((candidate) => candidate.candidateId)).toEqual([
      "prompt-cited",
      "prompt-balanced",
      "prompt-short",
    ]);
  });

  it("selects the best candidate across prompt, workflow and strategy groups", () => {
    const result = selectGroupRelativeBest([
      group("prompt", "prompt", [
        ["prompt-basic", 0.7],
        ["prompt-verified", 0.9],
      ]),
      group("workflow", "workflow", [
        ["workflow-basic", 0.4],
        ["workflow-rerank", 0.95],
      ]),
      group("strategy", "strategy", [
        ["strategy-direct", 0.8],
        ["strategy-rag", 0.85],
      ]),
    ]);

    expect(result.selected).toMatchObject({
      candidateId: "workflow-rerank",
      groupId: "workflow",
      globalRank: 1,
    });
    expect(result.selected?.relativeScore).toBeCloseTo(0.275);
    expect(result.groups.map((entry) => [entry.groupId, entry.groupRank])).toEqual([
      ["workflow", 1],
      ["prompt", 2],
      ["strategy", 3],
    ]);
  });

  it("uses deterministic tie-breaking for equal relative scores", () => {
    const result = selectGroupRelativeBest([
      group("beta", "strategy", [
        ["candidate-b", 0.9],
        ["candidate-b-low", 0.7],
      ]),
      group("alpha", "strategy", [
        ["candidate-a", 0.9],
        ["candidate-a-low", 0.7],
      ]),
    ]);

    expect(result.selected?.candidateId).toBe("candidate-a");
    expect(result.rankings.map((candidate) => candidate.candidateId)).toEqual([
      "candidate-a",
      "candidate-b",
      "candidate-a-low",
      "candidate-b-low",
    ]);
  });

  it("handles empty input and empty groups deterministically", () => {
    expect(selectGroupRelativeBest([])).toEqual({
      selected: null,
      groups: [],
      rankings: [],
    });

    const result = selectGroupRelativeBest([{ id: "empty", candidates: [] }]);

    expect(result.selected).toBeNull();
    expect(result.groups).toEqual([
      {
        groupId: "empty",
        groupRank: 1,
        candidateCount: 0,
        averageScore: 0,
        bestScore: 0,
        bestRelativeScore: 0,
        candidates: [],
      },
    ]);
  });

  it("reports invalid candidate groups predictably", () => {
    expect(() => rankCandidateGroup({ id: "", candidates: [] })).toThrow(
      "Group-relative candidate group id is required.",
    );
    expect(() => rankCandidateGroup({ id: "bad", candidates: [{ id: "", score: 1 }] })).toThrow(
      "Group-relative candidate id is required for group bad.",
    );
    expect(() =>
      rankCandidateGroup({
        id: "bad",
        candidates: [
          { id: "duplicate", score: 0.5 },
          { id: "duplicate", score: 0.6 },
        ],
      }),
    ).toThrow("Duplicate group-relative candidate id duplicate in group bad.");
    expect(() =>
      rankCandidateGroup({ id: "bad", candidates: [{ id: "nan", score: Number.NaN }] }),
    ).toThrow("Group-relative candidate score must be finite for bad/nan.");
    expect(() =>
      selectGroupRelativeBest([
        { id: "duplicate", candidates: [] },
        { id: "duplicate", candidates: [] },
      ]),
    ).toThrow("Duplicate group-relative candidate group id: duplicate");
  });
});

function group(
  id: string,
  kind: "prompt" | "workflow" | "strategy",
  candidates: Array<[string, number]>,
): GroupRelativeCandidateGroup {
  return {
    id,
    kind,
    candidates: candidates.map(([candidateId, score]) => ({ id: candidateId, score })),
  };
}
