import type { ImportedEpisode, TrajectoryImportResult } from "./trajectory-import";

export function splitTrajectoryEvidence(episodes: readonly ImportedEpisode[], cutoff: string) {
  const time = Date.parse(cutoff);
  if (!Number.isFinite(time)) throw new Error("Split cutoff must be a valid timestamp.");
  if (episodes.some((episode) => !Number.isFinite(Date.parse(episode.collectedAt))))
    throw new Error("All episode collection timestamps must be valid.");
  const training = episodes.filter((episode) => Date.parse(episode.collectedAt) < time);
  const tasks = new Set(training.map(({ taskId }) => taskId));
  const snapshots = new Set(training.map(({ workflowSnapshotId }) => workflowSnapshotId));
  const evaluation: ImportedEpisode[] = [];
  const excluded: Array<{ episodeId: string; reason: string }> = [];
  for (const episode of episodes.filter((row) => Date.parse(row.collectedAt) >= time)) {
    if (tasks.has(episode.taskId) || snapshots.has(episode.workflowSnapshotId))
      excluded.push({
        episodeId: episode.episodeId,
        reason: "Training task or snapshot overlaps evaluation.",
      });
    else evaluation.push(episode);
  }
  return { cutoff: new Date(time).toISOString(), training, evaluation, excluded };
}

export interface ObservedComparisonOptions {
  baselinePolicyId: string;
  learnedPolicyId: string;
  minimumPairs: number;
  minimumQualityGain: number;
  maximumToolIncrease: number;
  actionKinds: Readonly<Record<string, "tool" | "control">>;
}

/** Paired observed outcomes, never a counterfactual estimate from unchosen actions. */
export function compareObservedTrajectoryPolicies(
  data: TrajectoryImportResult,
  options: ObservedComparisonOptions,
) {
  if (
    options.baselinePolicyId === options.learnedPolicyId ||
    !Number.isSafeInteger(options.minimumPairs) ||
    options.minimumPairs < 2 ||
    !Number.isFinite(options.minimumQualityGain) ||
    options.minimumQualityGain <= 0 ||
    !Number.isFinite(options.maximumToolIncrease) ||
    options.maximumToolIncrease < 0 ||
    !options.actionKinds ||
    typeof options.actionKinds !== "object" ||
    Array.isArray(options.actionKinds)
  )
    throw new Error("Invalid observed policy comparison protocol.");
  const observedNames = data.episodes.flatMap((episode) =>
    episode.transitions.map((step) => step.action.name),
  );
  if (
    observedNames.some(
      (name) =>
        !Object.hasOwn(options.actionKinds, name) ||
        !["tool", "control"].includes(options.actionKinds[name] ?? ""),
    )
  )
    throw new Error("Every observed action requires an explicit tool/control classification.");
  const baseline = observedByTask(data.episodes, options.baselinePolicyId);
  const learned = observedByTask(data.episodes, options.learnedPolicyId);
  const paired = [];
  const excluded: Array<{ taskId: string; reason: string }> = [];
  for (const key of new Set([...baseline.keys(), ...learned.keys()])) {
    const left = baseline.get(key);
    const right = learned.get(key);
    if (!left || !right || left.length !== 1 || right.length !== 1) {
      excluded.push({
        taskId: key,
        reason: "Missing or repeated baseline/learned observations for task and snapshot.",
      });
      continue;
    }
    const a = left[0];
    const b = right[0];
    if (!a || !b) continue;
    paired.push({
      taskId: a.taskId,
      snapshotId: a.workflowSnapshotId,
      qualityDelta: b.qualityScore - a.qualityScore,
      toolDelta: toolCount(b, options.actionKinds) - toolCount(a, options.actionKinds),
      costDelta:
        measuredTotal(b, "costUsd") !== null && measuredTotal(a, "costUsd") !== null
          ? Number(measuredTotal(b, "costUsd")) - Number(measuredTotal(a, "costUsd"))
          : null,
      latencyDelta:
        measuredTotal(b, "latencyMs") !== null && measuredTotal(a, "latencyMs") !== null
          ? Number(measuredTotal(b, "latencyMs")) - Number(measuredTotal(a, "latencyMs"))
          : null,
      truncated: a.truncated || b.truncated,
    });
  }
  const quality = summarize(paired.map(({ qualityDelta }) => qualityDelta));
  const tools = summarize(paired.map(({ toolDelta }) => toolDelta));
  const costComplete = paired.length > 0 && paired.every(({ costDelta }) => costDelta !== null);
  const latencyComplete =
    paired.length > 0 && paired.every(({ latencyDelta }) => latencyDelta !== null);
  const reasons: string[] = [];
  if (data.evidenceMode !== "real")
    reasons.push("Synthetic evidence cannot establish production improvement.");
  if (paired.length < options.minimumPairs) reasons.push("Insufficient paired observations.");
  if (excluded.length > 0 || data.rejected.length > 0)
    reasons.push("Incomplete or rejected observations require investigation.");
  if (paired.some(({ truncated }) => truncated)) reasons.push("Truncated paired episodes.");
  if (quality.mean < options.minimumQualityGain || quality.lower95 === null || quality.lower95 <= 0)
    reasons.push("Quality gain is absent or uncertainty is insufficient/includes no gain.");
  if (tools.mean > options.maximumToolIncrease)
    reasons.push("Tool use exceeds the protocol threshold.");
  if (costComplete && paired.some(({ costDelta }) => Number(costDelta) > 0))
    reasons.push("Measured cost regression.");
  return {
    protocol: options,
    sourceFingerprint: data.sourceFingerprint,
    declaredEvidenceMode: data.evidenceMode,
    paired,
    excluded,
    quality,
    tools,
    cost: costComplete ? summarize(paired.map(({ costDelta }) => Number(costDelta))) : null,
    latency: latencyComplete
      ? summarize(paired.map(({ latencyDelta }) => Number(latencyDelta)))
      : null,
    uncertaintyMethod:
      "Paired normal approximation, reported only for at least 30 independent tasks; not a guarantee under correlated tasks.",
    alternativeActionsEstimated: false,
    decision: reasons.length ? "do-not-adopt" : "observed-gain-requires-provenance-review",
    reasons,
  };
}

function observedByTask(episodes: readonly ImportedEpisode[], policyId: string) {
  const groups = new Map<string, ImportedEpisode[]>();
  for (const episode of episodes.filter((row) => row.policyId === policyId)) {
    const key = `${episode.taskId}:${episode.workflowSnapshotId}`;
    groups.set(key, [...(groups.get(key) ?? []), episode]);
  }
  return groups;
}

function toolCount(
  episode: ImportedEpisode,
  actionKinds: ObservedComparisonOptions["actionKinds"],
): number {
  return episode.transitions.filter((step) => actionKinds[step.action.name] === "tool").length;
}

function measuredTotal(episode: ImportedEpisode, field: "costUsd" | "latencyMs"): number | null {
  if (episode.transitions.some((step) => step[field] === undefined)) return null;
  const total = episode.transitions.reduce((sum, step) => sum + Number(step[field]), 0);
  if (!Number.isFinite(total)) throw new Error("Measured usage total must be finite.");
  return total;
}

function summarize(values: number[]) {
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const variance =
    values.length > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
      : 0;
  const standardError = values.length > 1 ? Math.sqrt(variance / values.length) : null;
  const margin = values.length >= 30 && standardError !== null ? 1.96 * standardError : null;
  return {
    count: values.length,
    mean,
    standardError,
    lower95: margin === null ? null : mean - margin,
    upper95: margin === null ? null : mean + margin,
  };
}
