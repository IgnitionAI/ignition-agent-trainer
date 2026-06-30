import type { ExperimentReport } from "@ignitionai/agent-trainer-core";

export function reportToJson(report: ExperimentReport): string {
  return JSON.stringify(report, null, 2);
}

export function reportToMarkdown(report: ExperimentReport): string {
  const rows = report.leaderboard
    .map(
      (row, index) =>
        `| ${index + 1} | ${row.name} | ${row.score.toFixed(3)} | ${row.totalCases} | ${row.failedCases} | ${formatMs(
          row.averageLatencyMs,
        )} | ${formatUsd(row.totalCostUsd)} |`,
    )
    .join("\n");

  return `# Experiment report: ${report.name}

Started: ${report.startedAt}  
Ended: ${report.endedAt}

| Rank | Variant | Score | Cases | Failed | Avg latency | Total cost |
|---:|---|---:|---:|---:|---:|---:|
${rows}
`;
}

function formatMs(value?: number): string {
  return value === undefined ? "n/a" : `${Math.round(value)}ms`;
}

function formatUsd(value?: number): string {
  return value === undefined ? "n/a" : `$${value.toFixed(4)}`;
}
