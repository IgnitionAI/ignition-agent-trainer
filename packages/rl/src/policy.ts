import type { MaybePromise, Metadata } from "@ignitionai/core";
import type {
  EnvironmentAction,
  Policy as EnvironmentPolicy,
  EnvironmentState,
} from "@ignitionai/environment";

export interface PolicyCandidate<TAction = unknown> {
  id: string;
  name?: string;
  action: TAction;
  score?: number;
  metadata?: Metadata;
}

export interface PolicyContext<TAction = unknown> {
  candidates: Array<PolicyCandidate<TAction>>;
  experimentName?: string;
  metadata?: Metadata;
}

export interface PolicyDecision<TAction = unknown> {
  candidateId: string;
  action: TAction;
  score?: number;
  reason?: string;
  metadata?: Metadata;
}

export interface Policy<TAction = unknown> {
  decide(context: PolicyContext<TAction>): MaybePromise<PolicyDecision<TAction>>;
}

export interface ScoreBasedPolicyOptions<TAction = unknown> {
  scoreCandidate?: (candidate: PolicyCandidate<TAction>, context: PolicyContext<TAction>) => number;
}

export function createStaticPolicy<TAction = unknown>(candidateId: string): Policy<TAction> {
  if (!candidateId.trim()) throw new Error("Static policy candidate id is required.");

  return {
    decide(context) {
      const candidate = findCandidate(context, candidateId);
      if (candidate === undefined) {
        throw new Error(`Static policy candidate not found: ${candidateId}`);
      }

      return candidateDecision(candidate, {
        reason: `Selected static policy candidate ${candidate.id}.`,
      });
    },
  };
}

export function createScoreBasedPolicy<TAction = unknown>(
  options: ScoreBasedPolicyOptions<TAction> = {},
): Policy<TAction> {
  return {
    decide(context) {
      if (context.candidates.length === 0) throw new Error("Score-based policy has no candidates.");

      const scoreCandidate = options.scoreCandidate ?? defaultCandidateScore;
      const scored = context.candidates
        .map((candidate) => ({
          candidate,
          score: scoreCandidate(candidate, context),
        }))
        .map(({ candidate, score }) => {
          if (!Number.isFinite(score)) {
            throw new Error(`Policy candidate score must be finite: ${candidate.id}`);
          }
          return { candidate, score };
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.candidate.id.localeCompare(b.candidate.id) ||
            (a.candidate.name ?? "").localeCompare(b.candidate.name ?? ""),
        );

      const best = scored[0];
      if (best === undefined) throw new Error("Score-based policy has no candidates.");
      return candidateDecision(best.candidate, {
        score: best.score,
        reason: `Selected highest scoring policy candidate ${best.candidate.id}.`,
      });
    },
  };
}

export class RandomPolicy implements EnvironmentPolicy {
  constructor(private readonly random: () => number = Math.random) {}

  async chooseAction(
    _state: EnvironmentState,
    actions: EnvironmentAction[],
  ): Promise<EnvironmentAction> {
    if (actions.length === 0) throw new Error("No action available.");
    const fallbackAction = actions[0];
    if (!fallbackAction) throw new Error("No action available.");
    return actions[Math.floor(this.random() * actions.length)] ?? fallbackAction;
  }
}

export interface PpoDesignPlaceholder {
  note: "PPO is intentionally not implemented in the MVP. Stabilize environment, rewards and rollouts first.";
}

export interface GrpoDesignPlaceholder {
  note: "GRPO-style group optimization can begin as candidate selection before weight updates.";
}

function findCandidate<TAction>(
  context: PolicyContext<TAction>,
  candidateId: string,
): PolicyCandidate<TAction> | undefined {
  return context.candidates.find((candidate) => candidate.id === candidateId);
}

function candidateDecision<TAction>(
  candidate: PolicyCandidate<TAction>,
  options: { score?: number; reason: string },
): PolicyDecision<TAction> {
  const decision: PolicyDecision<TAction> = {
    candidateId: candidate.id,
    action: candidate.action,
    reason: options.reason,
  };

  if (options.score !== undefined) decision.score = options.score;
  if (candidate.metadata !== undefined) decision.metadata = candidate.metadata;
  return decision;
}

function defaultCandidateScore<TAction>(candidate: PolicyCandidate<TAction>): number {
  return candidate.score ?? 0;
}
