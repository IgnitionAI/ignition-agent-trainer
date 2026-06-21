import type { AgentTrace } from "@ignitionai/core";

export function getToolCallNames(trace: AgentTrace): string[] {
  return trace.steps.filter((step) => step.type === "tool_call").map((step) => step.name);
}

export function hasToolCall(trace: AgentTrace, toolName: string): boolean {
  return getToolCallNames(trace).includes(toolName);
}

export function countToolCalls(trace: AgentTrace): number {
  return getToolCallNames(trace).length;
}
