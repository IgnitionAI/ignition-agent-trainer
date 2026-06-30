import type {
  AgentAdapter,
  AgentVariant,
  Dataset,
  DatasetItem,
  ExpectedOutput,
  JsonValue,
  Metadata,
  MetricResult,
  RewardResult,
  RunResult,
  Trace,
  TraceStep,
  UsageMetrics,
} from "./types";

export type RuntimeValidationResult<T> = { ok: true; value: T } | { ok: false; error: Error };

export function validateDataset(value: unknown): RuntimeValidationResult<Dataset> {
  return captureValidation(value, assertDataset);
}

export function validateAgentVariant(value: unknown): RuntimeValidationResult<AgentVariant> {
  return captureValidation(value, assertAgentVariant);
}

export function validateRunResult(value: unknown): RuntimeValidationResult<RunResult> {
  return captureValidation(value, assertRunResult);
}

export function validateUsageMetrics(value: unknown): RuntimeValidationResult<UsageMetrics> {
  return captureValidation(value, assertUsageMetrics);
}

export function validateTrace(value: unknown): RuntimeValidationResult<Trace> {
  return captureValidation(value, assertTrace);
}

export function validateMetricResult(value: unknown): RuntimeValidationResult<MetricResult> {
  return captureValidation(value, assertMetricResult);
}

export function assertDataset(value: unknown): asserts value is Dataset {
  assertRecord(value, "Dataset");
  assertRequiredString(value.name, "Dataset name");
  assertOptionalString(value.description, "Dataset description");
  assertOptionalMetadata(value.metadata, "Dataset metadata");

  if (!Array.isArray(value.items)) {
    throw new Error("Dataset items must be an array.");
  }

  const seen = new Set<string>();
  for (const [index, item] of value.items.entries()) {
    assertDatasetItem(item, `Dataset item ${index}`);
    if (seen.has(item.id)) {
      throw new Error(`Duplicate dataset item id: ${item.id}`);
    }
    seen.add(item.id);
  }
}

export function assertDatasetItem(
  value: unknown,
  path = "Dataset item",
): asserts value is DatasetItem {
  assertRecord(value, path);
  assertRequiredString(value.id, `${path} id`);
  assertRequiredString(value.input, `${path} ${String(value.id)} input`);
  assertExpectedOutput(value.expected, `${path} expected`);
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

export function assertAgentVariant(
  value: unknown,
  path = "Agent variant",
): asserts value is AgentVariant {
  assertRecord(value, path);
  assertOptionalString(value.id, `${path} id`, { allowBlank: false });
  assertRequiredString(value.name, `${path} name`);
  assertOptionalString(value.description, `${path} description`);
  assertOptionalMetadata(value.config, `${path} config`);

  if (value.adapter !== undefined) {
    assertAgentAdapter(value.adapter, `${path} adapter`);
  }
  if (value.run !== undefined && typeof value.run !== "function") {
    throw new Error(`${path} run must be a function.`);
  }
  if (value.adapter === undefined && value.run === undefined) {
    throw new Error(`${path} requires an adapter or run function.`);
  }
}

export function assertAgentAdapter(
  value: unknown,
  path = "Agent adapter",
): asserts value is AgentAdapter {
  assertRecord(value, path);
  assertOptionalString(value.name, `${path} name`, { allowBlank: false });
  if (typeof value.run !== "function") {
    throw new Error(`${path} run must be a function.`);
  }
}

export function assertRunResult(value: unknown): asserts value is RunResult {
  assertRecord(value, "Run result");
  if (!("output" in value)) {
    throw new Error("Run result output is required.");
  }
  assertTrace(value.trace);
  if (value.usage !== undefined) {
    assertUsageMetrics(value.usage);
  }
  assertOptionalMetadata(value.metadata, "Run result metadata");
}

export function assertUsageMetrics(value: unknown): asserts value is UsageMetrics {
  assertRecord(value, "Usage metrics");
  assertOptionalNonNegativeInteger(value.inputTokens, "Usage metrics inputTokens");
  assertOptionalNonNegativeInteger(value.outputTokens, "Usage metrics outputTokens");
  assertOptionalNonNegativeInteger(value.totalTokens, "Usage metrics totalTokens");
  assertOptionalNonNegativeNumber(value.costUsd, "Usage metrics costUsd");
  assertOptionalNonNegativeNumber(value.latencyMs, "Usage metrics latencyMs");
}

export function assertTrace(value: unknown): asserts value is Trace {
  assertRecord(value, "Trace");
  if (!Array.isArray(value.steps)) {
    throw new Error("Trace steps must be an array.");
  }
  for (const [index, step] of value.steps.entries()) {
    assertTraceStep(step, `Trace step ${index}`);
  }
  assertOptionalMetadata(value.metadata, "Trace metadata");
}

export function assertTraceStep(value: unknown, path = "Trace step"): asserts value is TraceStep {
  assertRecord(value, path);

  if (value.type === "message") {
    assertMessageTraceStep(value, path);
    return;
  }
  if (value.type === "tool_call") {
    assertToolCallTraceStep(value, path);
    return;
  }
  if (value.type === "decision") {
    assertDecisionTraceStep(value, path);
    return;
  }
  if (value.type === "custom") {
    assertCustomTraceStep(value, path);
    return;
  }

  throw new Error(`${path} type must be one of message, tool_call, decision or custom.`);
}

export function assertMetricResult(
  value: unknown,
  path = "Metric result",
): asserts value is MetricResult {
  assertRecord(value, path);
  assertRequiredString(value.name, `${path} name`);
  assertNormalizedScore(value.score, `${path} score`);
  assertOptionalBoolean(value.passed, `${path} passed`);
  assertOptionalNonNegativeNumber(value.weight, `${path} weight`);
  assertOptionalString(value.reason, `${path} reason`);
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

export function assertRewardResult(
  value: unknown,
  path = "Reward result",
): asserts value is RewardResult {
  assertMetricResult(value, path);
  if (!Number.isFinite(value.weight)) {
    throw new Error(`${path} weight must be finite.`);
  }
}

export function assertNormalizedScore(value: unknown, path = "Score"): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`${path} must be between 0 and 1.`);
  }
}

export function assertJsonValue(value: unknown, path = "JSON value"): asserts value is JsonValue {
  if (value === null) return;
  if (typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} number must be finite.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertJsonValue(item, `${path}[${index}]`);
    }
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertJsonValue(item, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`${path} must be JSON-compatible.`);
}

function assertExpectedOutput(
  value: unknown,
  path: string,
): asserts value is ExpectedOutput | undefined {
  if (value === undefined) return;
  assertRecord(value, path);
  assertOptionalString(value.exact, `${path} exact`);
  assertOptionalStringArray(value.contains, `${path} contains`);
  assertOptionalStringArray(value.citations, `${path} citations`);
  if (value.json !== undefined) {
    assertJsonValue(value.json, `${path} json`);
  }
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

function assertMessageTraceStep(value: Record<string, unknown>, path: string): void {
  const roles = new Set(["system", "user", "assistant", "tool"]);
  if (typeof value.role !== "string" || !roles.has(value.role)) {
    throw new Error(`${path} role must be one of system, user, assistant or tool.`);
  }
  assertRequiredString(value.content, `${path} content`, { allowBlank: true });
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

function assertToolCallTraceStep(value: Record<string, unknown>, path: string): void {
  assertRequiredString(value.name, `${path} name`);
  assertOptionalString(value.startedAt, `${path} startedAt`);
  assertOptionalString(value.endedAt, `${path} endedAt`);
  assertOptionalNonNegativeNumber(value.latencyMs, `${path} latencyMs`);
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

function assertDecisionTraceStep(value: Record<string, unknown>, path: string): void {
  assertRequiredString(value.action, `${path} action`);
  assertOptionalString(value.reason, `${path} reason`);
  if (value.confidence !== undefined) {
    assertNormalizedScore(value.confidence, `${path} confidence`);
  }
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

function assertCustomTraceStep(value: Record<string, unknown>, path: string): void {
  assertRequiredString(value.name, `${path} name`);
  assertOptionalMetadata(value.metadata, `${path} metadata`);
}

function captureValidation<T>(
  value: unknown,
  assertValue: (input: unknown) => asserts input is T,
): RuntimeValidationResult<T> {
  try {
    assertValue(value);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }
}

function assertRequiredString(
  value: unknown,
  path: string,
  options: { allowBlank?: boolean } = {},
): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${path} is required.`);
  }
  if (options.allowBlank !== true && !value.trim()) {
    throw new Error(`${path} is required.`);
  }
}

function assertOptionalString(
  value: unknown,
  path: string,
  options: { allowBlank?: boolean } = {},
): asserts value is string | undefined {
  if (value === undefined) return;
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string.`);
  }
  if (options.allowBlank === false && !value.trim()) {
    throw new Error(`${path} must be a non-empty string.`);
  }
}

function assertOptionalStringArray(
  value: unknown,
  path: string,
): asserts value is string[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${path} must be an array of strings.`);
  }
}

function assertOptionalBoolean(value: unknown, path: string): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean.`);
  }
}

function assertOptionalNonNegativeInteger(
  value: unknown,
  path: string,
): asserts value is number | undefined {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${path} must be a non-negative integer.`);
  }
}

function assertOptionalNonNegativeNumber(
  value: unknown,
  path: string,
): asserts value is number | undefined {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${path} must be a non-negative finite number.`);
  }
}

function assertOptionalMetadata(
  value: unknown,
  path: string,
): asserts value is Metadata | undefined {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
