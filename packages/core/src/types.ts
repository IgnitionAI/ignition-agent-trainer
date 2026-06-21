export type Primitive = string | number | boolean | null;
export type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;
export type Metadata = Record<string, unknown>;
export type MaybePromise<T> = T | Promise<T>;

export interface ExpectedOutput {
  exact?: string;
  contains?: string[];
  citations?: string[];
  json?: JsonValue;
  metadata?: Metadata;
}

export interface DatasetItem {
  id: string;
  input: string;
  expected?: ExpectedOutput;
  metadata?: Metadata;
}

export interface Dataset {
  name: string;
  description?: string;
  items: DatasetItem[];
  metadata?: Metadata;
}

export interface UsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface AgentInput {
  id: string;
  input: string;
  expected?: ExpectedOutput;
  metadata?: Metadata;
}

export type AgentOutput = string | JsonValue | Record<string, unknown> | unknown[];

export interface ToolCall {
  name: string;
  input?: unknown;
  output?: unknown;
  startedAt?: string;
  endedAt?: string;
  latencyMs?: number;
  metadata?: Metadata;
}

export type TraceStep =
  | {
      type: "message";
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      metadata?: Metadata;
    }
  | ({ type: "tool_call" } & ToolCall)
  | {
      type: "decision";
      action: string;
      reason?: string;
      confidence?: number;
      metadata?: Metadata;
    }
  | {
      type: "custom";
      name: string;
      payload?: unknown;
      metadata?: Metadata;
    };

export interface Trace {
  steps: TraceStep[];
  metadata?: Metadata;
}

export type AgentTrace = Trace;

export interface RunResult {
  output: AgentOutput;
  trace: Trace;
  usage?: UsageMetrics;
  metadata?: Metadata;
}

export type AgentRun = RunResult;

export interface RunContext {
  experimentName?: string;
  variantId?: string;
  caseId?: string;
  signal?: AbortSignal;
  metadata?: Metadata;
}

export type AgentAdapterResult = AgentOutput | (Omit<RunResult, "trace"> & { trace?: Trace });

export interface AgentAdapter {
  name?: string;
  run(input: AgentInput, context: RunContext): MaybePromise<AgentAdapterResult>;
}

export interface AgentVariant {
  id?: string;
  name: string;
  description?: string;
  config?: Metadata;
  adapter?: AgentAdapter;
  run?(item: DatasetItem, context: RunContext): MaybePromise<AgentAdapterResult>;
}

export interface MetricResult {
  name: string;
  score: number;
  passed?: boolean;
  weight?: number;
  reason?: string;
  metadata?: Metadata;
}

export interface RewardResult extends MetricResult {
  weight: number;
}

export interface Reward {
  name: string;
  weight?: number;
  evaluate(run: RunResult, item: DatasetItem, context: RunContext): MaybePromise<MetricResult>;
}

export type RewardFunction = Reward;

export interface RunError {
  message: string;
  name?: string;
  stack?: string;
}

export interface CaseResult {
  caseId: string;
  variantId: string;
  variantName: string;
  output: AgentOutput;
  trace: Trace;
  usage?: UsageMetrics;
  rewards: MetricResult[];
  score: number;
  error?: RunError;
  metadata?: Metadata;
}

export interface VariantSummary {
  variantId: string;
  name: string;
  score: number;
  totalCases: number;
  averageLatencyMs?: number;
  totalCostUsd?: number;
  rewardAverages: Record<string, number>;
  failedCases: number;
}

export type Leaderboard = VariantSummary[];

export interface ExperimentResult {
  name: string;
  startedAt: string;
  endedAt: string;
  leaderboard: Leaderboard;
  cases: CaseResult[];
  failedCases: CaseResult[];
  metadata?: Metadata;
}

export type ExperimentReport = ExperimentResult;
