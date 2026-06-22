import type { Metadata } from "@ignitionai/core";

export type GroupRelativeCandidateKind = "prompt" | "workflow" | "strategy";

export interface GroupRelativeCandidate {
  id: string;
  name?: string;
  score: number;
  kind?: GroupRelativeCandidateKind;
  metadata?: Metadata;
}

export interface GroupRelativeCandidateGroup {
  id: string;
  name?: string;
  kind?: GroupRelativeCandidateKind;
  candidates: readonly GroupRelativeCandidate[];
  metadata?: Metadata;
}

export interface RankedGroupRelativeCandidate {
  candidateId: string;
  groupId: string;
  rankInGroup: number;
  globalRank?: number;
  name?: string;
  kind?: GroupRelativeCandidateKind;
  score: number;
  groupAverageScore: number;
  relativeScore: number;
  reason: string;
  metadata?: Metadata;
}

export interface RankedCandidateGroup {
  groupId: string;
  groupRank: number;
  name?: string;
  kind?: GroupRelativeCandidateKind;
  candidateCount: number;
  averageScore: number;
  bestScore: number;
  bestRelativeScore: number;
  candidates: RankedGroupRelativeCandidate[];
  bestCandidate?: RankedGroupRelativeCandidate;
  metadata?: Metadata;
}

export interface GroupRelativeSelectionResult {
  selected: RankedGroupRelativeCandidate | null;
  groups: RankedCandidateGroup[];
  rankings: RankedGroupRelativeCandidate[];
}

export function rankCandidateGroup(group: GroupRelativeCandidateGroup): RankedCandidateGroup {
  validateGroup(group);

  const averageScore =
    group.candidates.length === 0
      ? 0
      : group.candidates.reduce((sum, candidate) => sum + candidate.score, 0) /
        group.candidates.length;
  const candidates = group.candidates
    .map((candidate) => rankCandidate(candidate, group, averageScore))
    .sort(compareRankedCandidates)
    .map((candidate, index) => ({ ...candidate, rankInGroup: index + 1 }));
  const bestCandidate = candidates[0];

  return {
    groupId: group.id,
    groupRank: 1,
    ...(group.name !== undefined ? { name: group.name } : {}),
    ...(group.kind !== undefined ? { kind: group.kind } : {}),
    candidateCount: group.candidates.length,
    averageScore,
    bestScore: bestCandidate?.score ?? 0,
    bestRelativeScore: bestCandidate?.relativeScore ?? 0,
    candidates,
    ...(bestCandidate !== undefined ? { bestCandidate } : {}),
    ...(group.metadata !== undefined ? { metadata: group.metadata } : {}),
  };
}

export function selectGroupRelativeBest(
  groups: readonly GroupRelativeCandidateGroup[],
): GroupRelativeSelectionResult {
  validateUniqueGroupIds(groups);

  const rankedGroups = groups
    .map(rankCandidateGroup)
    .sort(compareRankedGroups)
    .map((group, index) => withGroupRank(group, index + 1));
  const rankings = rankedGroups
    .flatMap((group) => group.candidates)
    .sort(compareRankedCandidates)
    .map((candidate, index) => ({ ...candidate, globalRank: index + 1 }));

  return {
    selected: rankings[0] ?? null,
    groups: rankedGroups,
    rankings,
  };
}

function rankCandidate(
  candidate: GroupRelativeCandidate,
  group: GroupRelativeCandidateGroup,
  groupAverageScore: number,
): RankedGroupRelativeCandidate {
  const kind = candidate.kind ?? group.kind;

  return {
    candidateId: candidate.id,
    groupId: group.id,
    rankInGroup: 0,
    ...(candidate.name !== undefined ? { name: candidate.name } : {}),
    ...(kind !== undefined ? { kind } : {}),
    score: candidate.score,
    groupAverageScore,
    relativeScore: candidate.score - groupAverageScore,
    reason: `${candidate.id} is scored relative to group ${group.id}.`,
    ...(candidate.metadata !== undefined ? { metadata: candidate.metadata } : {}),
  };
}

function compareRankedCandidates(
  a: RankedGroupRelativeCandidate,
  b: RankedGroupRelativeCandidate,
): number {
  return (
    b.relativeScore - a.relativeScore ||
    b.score - a.score ||
    a.groupId.localeCompare(b.groupId) ||
    a.candidateId.localeCompare(b.candidateId)
  );
}

function compareRankedGroups(a: RankedCandidateGroup, b: RankedCandidateGroup): number {
  if (a.bestCandidate === undefined && b.bestCandidate !== undefined) return 1;
  if (a.bestCandidate !== undefined && b.bestCandidate === undefined) return -1;
  return (
    b.bestRelativeScore - a.bestRelativeScore ||
    b.bestScore - a.bestScore ||
    b.averageScore - a.averageScore ||
    a.groupId.localeCompare(b.groupId)
  );
}

function withGroupRank(group: RankedCandidateGroup, groupRank: number): RankedCandidateGroup {
  const candidates = group.candidates.map((candidate) => ({
    ...candidate,
    groupRank,
  }));
  const bestCandidate = candidates[0];

  const rankedGroup = {
    ...group,
    groupRank,
    candidates,
  };

  return bestCandidate !== undefined ? { ...rankedGroup, bestCandidate } : rankedGroup;
}

function validateGroup(group: GroupRelativeCandidateGroup): void {
  if (!group.id.trim()) throw new Error("Group-relative candidate group id is required.");

  const seenCandidateIds = new Set<string>();
  for (const candidate of group.candidates) {
    if (!candidate.id.trim()) {
      throw new Error(`Group-relative candidate id is required for group ${group.id}.`);
    }
    if (seenCandidateIds.has(candidate.id)) {
      throw new Error(
        `Duplicate group-relative candidate id ${candidate.id} in group ${group.id}.`,
      );
    }
    seenCandidateIds.add(candidate.id);
    if (!Number.isFinite(candidate.score)) {
      throw new Error(
        `Group-relative candidate score must be finite for ${group.id}/${candidate.id}.`,
      );
    }
  }
}

function validateUniqueGroupIds(groups: readonly GroupRelativeCandidateGroup[]): void {
  const seenGroupIds = new Set<string>();
  for (const group of groups) {
    if (seenGroupIds.has(group.id)) {
      throw new Error(`Duplicate group-relative candidate group id: ${group.id}`);
    }
    seenGroupIds.add(group.id);
  }
}
