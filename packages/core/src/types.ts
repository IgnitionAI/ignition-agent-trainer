export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface ExpectedOutput {
  exact?: string;
  contains?: string[];
  citations?: string[];
  json?: JsonValue;
  metadata?: JsonRecord;
}

export interface DatasetItem {
  id: string;
  input: string;
  expected?: ExpectedOutput;
  metadata?: JsonRecord;
}

export interface Dataset {
  name: string;
  description?: string;
  items: DatasetItem[];
  metadata?: JsonRecord;
}

export interface UsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export type TraceStep =
  | {
      type: "message";
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      metadata?: JsonRecord;
    }
  | {
      type: "tool_call";
      name: string;
      input?: JsonValue;
      output?: JsonValue;
      startedAt?: string;
      endedAt?: string;
      latencyMs?: number;
      metadata?: JsonRecord;
    }
  | {
      type: "decision";
      action: string;
      reason?: string;
      confidence?: number;
      metadata?: JsonRecord;
    }
  | {
      type: "custom";
      name: string;
      payload?: JsonValue;
      metadata?: JsonRecord;
    };

export interface AgentTrace {
  steps: TraceStep[];
  metadata?: JsonRecord;
}

export interface AgentRun {
  output: string | JsonValue;
  trace: AgentTrace;
  usage?: UsageMetrics;
  metadata?: JsonRecord;
}

export interface RunContext {
  experimentName?: string;
  variantId?: string;
  caseId?: string;
  signal?: AbortSignal;
  metadata?: JsonRecord;
}

export interface AgentVariant {
  id: string;
  name: string;
  description?: string;
  config?: JsonRecord;
  run(item: DatasetItem, context: RunContext): Promise<AgentRun>;
}

export interface RewardResult {
  name: string;
  score: number;
  weight: number;
  passed?: boolean;
  reason?: string;
  metadata?: JsonRecord;
}

export interface RewardFunction {
  name: string;
  weight: number;
  evaluate(run: AgentRun, item: DatasetItem, context: RunContext): Promise<RewardResult>;
}

export interface CaseResult {
  caseId: string;
  variantId: string;
  output: AgentRun["output"];
  trace: AgentTrace;
  usage?: UsageMetrics;
  rewards: RewardResult[];
  score: number;
  metadata?: JsonRecord;
}

export interface VariantSummary {
  variantId: string;
  name: string;
  score: number;
  totalCases: number;
  averageLatencyMs?: number;
  totalCostUsd?: number;
  rewardAverages: Record<string, number>;
}

export interface ExperimentReport {
  name: string;
  startedAt: string;
  endedAt: string;
  leaderboard: VariantSummary[];
  cases: CaseResult[];
  metadata?: JsonRecord;
}
