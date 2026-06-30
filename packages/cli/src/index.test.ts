import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDataset,
  createMockAdapter,
  type ExperimentResult,
  type RewardFunction,
  type VariantSummary,
} from "@ignitionai/agent-trainer-core";
import {
  appendExperimentHistory,
  defineExperiment,
  type ExperimentDefinition,
  readExperimentHistory,
} from "@ignitionai/agent-trainer-experiments";
import { describe, expect, it } from "vitest";
import { parseCliArgs, runCli } from "./index";

describe("parseCliArgs", () => {
  it("parses a valid experiment path with report output flags", () => {
    expect(
      parseCliArgs([
        "eval",
        "run",
        "./experiment.ts",
        "--json",
        "reports/result.json",
        "--markdown",
        "reports/result.md",
        "--bundle",
        "reports/bundles",
      ]),
    ).toEqual({
      ok: true,
      command: {
        kind: "eval-run",
        experimentPath: "./experiment.ts",
        jsonOutputPath: "reports/result.json",
        markdownOutputPath: "reports/result.md",
        bundleOutputDirectory: "reports/bundles",
        regressionOptions: {},
      },
    });
  });

  it("parses history, baseline and regression options for eval runs", () => {
    expect(
      parseCliArgs([
        "eval",
        "run",
        "./experiment.ts",
        "--history",
        ".ignition/history.jsonl",
        "--baseline",
        "latest",
        "--regression",
        "--max-score-drop",
        "0.05",
        "--max-latency-increase-ms",
        "100",
        "--max-cost-increase-usd",
        "0.001",
        "--variant",
        "strong-agent",
        "--regression-markdown",
        "reports/regression.md",
        "--record-history",
      ]),
    ).toEqual({
      ok: true,
      command: {
        kind: "eval-run",
        experimentPath: "./experiment.ts",
        historyPath: ".ignition/history.jsonl",
        baseline: "latest",
        regression: true,
        regressionMarkdownOutputPath: "reports/regression.md",
        recordHistory: true,
        regressionOptions: {
          maxScoreDrop: 0.05,
          maxLatencyIncreaseMs: 100,
          maxCostIncreaseUsd: 0.001,
          variantIds: ["strong-agent"],
        },
      },
    });
  });

  it("parses history list and show commands", () => {
    expect(
      parseCliArgs([
        "eval",
        "history",
        "list",
        ".ignition/history.jsonl",
        "--experiment",
        "cli-definition-demo",
        "--limit",
        "2",
      ]),
    ).toEqual({
      ok: true,
      command: {
        kind: "eval-history-list",
        historyPath: ".ignition/history.jsonl",
        experimentName: "cli-definition-demo",
        limit: 2,
      },
    });

    expect(
      parseCliArgs([
        "eval",
        "history",
        "show",
        ".ignition/history.jsonl",
        "latest",
        "--experiment",
        "cli-definition-demo",
      ]),
    ).toEqual({
      ok: true,
      command: {
        kind: "eval-history-show",
        historyPath: ".ignition/history.jsonl",
        selector: "latest",
        experimentName: "cli-definition-demo",
      },
    });
  });

  it("rejects regression flags that cannot select a baseline", () => {
    expect(parseCliArgs(["eval", "run", "./experiment.ts", "--regression"])).toEqual({
      ok: false,
      message: "--regression requires --baseline.",
      exitCode: 1,
    });
    expect(parseCliArgs(["eval", "run", "./experiment.ts", "--baseline", "latest"])).toEqual({
      ok: false,
      message: "--baseline requires --history.",
      exitCode: 1,
    });
  });

  it("reports an invalid command clearly", () => {
    const parsed = parseCliArgs(["train", "run"]);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toContain("Unknown command: train run");
    expect(parsed.exitCode).toBe(1);
    expect(parsed.showUsage).toBe(true);
  });
});

describe("runCli", () => {
  it("reports a missing experiment file clearly", async () => {
    const output = createOutput();

    const exitCode = await runCli(["eval", "run", "./missing.ts"], {
      cwd: "/workspace",
      stdout: output.stdout,
      stderr: output.stderr,
      fileExists: () => false,
    });

    expect(exitCode).toBe(1);
    expect(output.out).toEqual([]);
    expect(output.err.join("\n")).toContain("Experiment file not found: ./missing.ts");
  });

  it("runs a deterministic experiment and prints a leaderboard", async () => {
    const definition = createCliExperimentDefinition();
    const output = createOutput();

    const exitCode = await runCli(["eval", "run", "./examples/context-engineering/experiment.ts"], {
      cwd: "/workspace/packages/cli",
      stdout: output.stdout,
      stderr: output.stderr,
      fileExists: (absolutePath) =>
        absolutePath === "/workspace/examples/context-engineering/experiment.ts",
      importModule: async (specifier) => {
        expect(specifier).toBe("file:///workspace/examples/context-engineering/experiment.ts");
        return { default: definition };
      },
    });

    expect(exitCode).toBe(0);
    expect(output.err).toEqual([]);

    const stdout = output.out.join("\n");
    expect(stdout).toContain("Experiment: cli-definition-demo");
    expect(stdout).toContain("Dataset items: 1");
    expect(stdout).toContain("Variants: strong-agent, weak-agent");
    expect(stdout).toContain("Leaderboard:");
    expect(stdout).toContain("1. strong-agent - 1.00");
    expect(stdout).toContain("2. weak-agent - 0.00");
    expect(stdout).toContain("Recommendation:");
    expect(stdout).toContain("Use strong-agent because it achieved the highest overall score.");
  });

  it("writes JSON and Markdown reports when output flags are provided", async () => {
    const definition = createCliExperimentDefinition();
    const output = createOutput();
    const writes = new Map<string, string>();
    const directories: string[] = [];

    const exitCode = await runCli(
      [
        "eval",
        "run",
        "./experiment.ts",
        "--json",
        "reports/result.json",
        "--markdown",
        "reports/result.md",
      ],
      {
        cwd: "/workspace",
        stdout: output.stdout,
        stderr: output.stderr,
        fileExists: (absolutePath) => absolutePath === "/workspace/experiment.ts",
        importModule: async () => ({ default: definition }),
        ensureDirectory: async (absolutePath) => {
          directories.push(absolutePath);
        },
        writeFile: async (absolutePath, contents) => {
          writes.set(absolutePath, contents);
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(output.err).toEqual([]);
    expect(directories).toEqual(["/workspace/reports", "/workspace/reports"]);

    const json = writes.get("/workspace/reports/result.json");
    expect(json).toBeDefined();
    expect(JSON.parse(json ?? "{}")).toMatchObject({
      schemaVersion: "ignition.experiment-report.v1",
      recommendation: { winner: "strong-agent" },
    });

    const markdown = writes.get("/workspace/reports/result.md");
    expect(markdown).toContain("# Experiment report: cli-definition-demo");
    expect(markdown).toContain("## Leaderboard");
    expect(markdown).toContain("## Recommendation");
    expect(output.out.join("\n")).toContain("JSON report: reports/result.json");
    expect(output.out.join("\n")).toContain("Markdown report: reports/result.md");
  });

  it("writes a timestamped report bundle when requested", async () => {
    const definition = createCliExperimentDefinition();
    const output = createOutput();
    const workspace = await mkdtemp(join(tmpdir(), "ignition-cli-bundle-"));
    const bundleRoot = join(workspace, "reports");

    const exitCode = await runCli(["eval", "run", "./experiment.ts", "--bundle", "reports"], {
      cwd: workspace,
      stdout: output.stdout,
      stderr: output.stderr,
      fileExists: (absolutePath) => absolutePath === join(workspace, "experiment.ts"),
      importModule: async () => ({ default: definition }),
    });

    expect(exitCode).toBe(0);
    expect(output.err).toEqual([]);

    const bundleDirectories = await readdir(bundleRoot);
    expect(bundleDirectories).toHaveLength(1);
    const bundleName = bundleDirectories[0];
    expect(bundleName).toBeDefined();
    if (bundleName === undefined) throw new Error("Expected one report bundle directory.");
    expect(bundleName).toMatch(/^cli-definition-demo-/);

    const bundleDirectory = join(bundleRoot, bundleName);
    const json = JSON.parse(await readFile(join(bundleDirectory, "report.json"), "utf8"));
    expect(json).toMatchObject({
      schemaVersion: "ignition.experiment-report.v1",
      experiment: { name: "cli-definition-demo" },
      recommendation: { winner: "strong-agent" },
    });

    const markdown = await readFile(join(bundleDirectory, "report.md"), "utf8");
    expect(markdown).toContain("# Experiment report: cli-definition-demo");

    const metadata = JSON.parse(await readFile(join(bundleDirectory, "metadata.json"), "utf8"));
    expect(metadata).toMatchObject({
      schemaVersion: "ignition.report-bundle.v1",
      files: {
        json: "report.json",
        markdown: "report.md",
        metadata: "metadata.json",
      },
    });
    expect(output.out.join("\n")).toContain(`Report bundle: ${bundleDirectory}`);
  });

  it("lists and shows experiment history entries", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "ignition-cli-history-"));
    const historyPath = join(workspace, ".ignition", "history.jsonl");
    await appendExperimentHistory(historyPath, createHistoryResult(0.82), {
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
    await appendExperimentHistory(historyPath, createHistoryResult(0.93), {
      recordedAt: "2026-01-02T00:00:00.000Z",
    });

    const listOutput = createOutput();
    const listExitCode = await runCli(
      [
        "eval",
        "history",
        "list",
        ".ignition/history.jsonl",
        "--experiment",
        "cli-definition-demo",
        "--limit",
        "1",
      ],
      {
        cwd: workspace,
        stdout: listOutput.stdout,
        stderr: listOutput.stderr,
      },
    );

    expect(listExitCode).toBe(0);
    expect(listOutput.err).toEqual([]);
    const listStdout = listOutput.out.join("\n");
    expect(listStdout).toContain("Entries: 2");
    expect(listStdout).toContain("cli-definition-demo-2026-01-02T00-00-00-000Z");
    expect(listStdout).not.toContain("cli-definition-demo-2026-01-01T00-00-00-000Z");

    const showOutput = createOutput();
    const showExitCode = await runCli(
      [
        "eval",
        "history",
        "show",
        ".ignition/history.jsonl",
        "latest",
        "--experiment",
        "cli-definition-demo",
      ],
      {
        cwd: workspace,
        stdout: showOutput.stdout,
        stderr: showOutput.stderr,
      },
    );

    expect(showExitCode).toBe(0);
    expect(showOutput.err).toEqual([]);
    const showStdout = showOutput.out.join("\n");
    expect(showStdout).toContain("History entry: cli-definition-demo-2026-01-02T00-00-00-000Z");
    expect(showStdout).toContain("Experiment: cli-definition-demo");
    expect(showStdout).toContain("1. strong-agent - score 0.930");
  });

  it("records history and passes a regression check against the latest baseline", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "ignition-cli-regression-pass-"));
    const historyPath = join(workspace, ".ignition", "history.jsonl");
    await appendExperimentHistory(historyPath, createHistoryResult(0.9), {
      recordedAt: "2026-01-01T00:00:00.000Z",
    });

    const output = createOutput();
    const exitCode = await runCli(
      [
        "eval",
        "run",
        "./experiment.ts",
        "--history",
        ".ignition/history.jsonl",
        "--baseline",
        "latest",
        "--regression",
        "--max-score-drop",
        "0.2",
        "--regression-markdown",
        "reports/regression.md",
        "--record-history",
      ],
      {
        cwd: workspace,
        stdout: output.stdout,
        stderr: output.stderr,
        fileExists: (absolutePath) => absolutePath === join(workspace, "experiment.ts"),
        importModule: async () => ({ default: createCliExperimentDefinition() }),
      },
    );

    expect(exitCode).toBe(0);
    expect(output.err).toEqual([]);
    const stdout = output.out.join("\n");
    expect(stdout).toContain("Baseline: cli-definition-demo-2026-01-01T00-00-00-000Z");
    expect(stdout).toContain("Regression gate: pass");
    expect(stdout).toContain("Regression Markdown: reports/regression.md");
    expect(stdout).toContain("History entry: cli-definition-demo-");

    const entries = await readExperimentHistory(historyPath);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.metadata).toEqual({
      source: "cli",
      experimentPath: "./experiment.ts",
    });

    const markdown = await readFile(join(workspace, "reports", "regression.md"), "utf8");
    expect(markdown).toContain("# Regression gate summary");
    expect(markdown).toContain("Result: pass");
  });

  it("fails clearly when regression checks fail", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "ignition-cli-regression-fail-"));
    const historyPath = join(workspace, ".ignition", "history.jsonl");
    await appendExperimentHistory(historyPath, createHistoryResult(1), {
      recordedAt: "2026-01-01T00:00:00.000Z",
    });

    const output = createOutput();
    const exitCode = await runCli(
      [
        "eval",
        "run",
        "./experiment.ts",
        "--history",
        ".ignition/history.jsonl",
        "--baseline",
        "latest",
        "--regression",
      ],
      {
        cwd: workspace,
        stdout: output.stdout,
        stderr: output.stderr,
        fileExists: (absolutePath) => absolutePath === join(workspace, "experiment.ts"),
        importModule: async () => ({
          default: createCliExperimentDefinition({ strongOutput: "wrong answer" }),
        }),
      },
    );

    expect(exitCode).toBe(1);
    expect(output.out.join("\n")).toContain("Regression gate: fail");
    expect(output.out.join("\n")).toContain("Result: fail");
    expect(output.err.join("\n")).toContain("Regression gate failed:");
    expect(output.err.join("\n")).toContain("Variant strong-agent score dropped");
  });
});

function createCliExperimentDefinition(
  options: { strongOutput?: string; weakOutput?: string } = {},
): ExperimentDefinition {
  const qualityReward: RewardFunction = {
    name: "quality",
    evaluate(run) {
      return {
        name: "quality",
        score: String(run.output).includes("correct") ? 1 : 0,
        passed: String(run.output).includes("correct"),
      };
    },
  };

  return defineExperiment({
    name: "cli-definition-demo",
    dataset: createDataset([{ id: "case-1", input: "Answer correctly." }]),
    variants: [
      {
        id: "strong-agent",
        name: "strong-agent",
        adapter: createMockAdapter({
          output: options.strongOutput ?? "correct answer",
          trace: { steps: [] },
          usage: { latencyMs: 100, costUsd: 0.001 },
        }),
      },
      {
        id: "weak-agent",
        name: "weak-agent",
        adapter: createMockAdapter({
          output: options.weakOutput ?? "wrong answer",
          trace: { steps: [] },
          usage: { latencyMs: 50, costUsd: 0.0005 },
        }),
      },
    ],
    rewards: [qualityReward],
  });
}

function createHistoryResult(strongScore: number): ExperimentResult {
  return {
    name: "cli-definition-demo",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:01.000Z",
    leaderboard: [
      variantSummary({
        id: "strong-agent",
        score: strongScore,
        latencyMs: 100,
        costUsd: 0.001,
      }),
      variantSummary({
        id: "weak-agent",
        score: 0,
        latencyMs: 50,
        costUsd: 0.0005,
      }),
    ],
    cases: [],
    failedCases: [],
  };
}

function variantSummary(input: {
  id: string;
  score: number;
  latencyMs: number;
  costUsd: number;
}): VariantSummary {
  return {
    variantId: input.id,
    name: input.id,
    score: input.score,
    totalCases: 1,
    averageLatencyMs: input.latencyMs,
    totalCostUsd: input.costUsd,
    rewardAverages: { quality: input.score },
    failedCases: 0,
  };
}

function createOutput(): {
  out: string[];
  err: string[];
  stdout: (line: string) => void;
  stderr: (line: string) => void;
} {
  const out: string[] = [];
  const err: string[] = [];

  return {
    out,
    err,
    stdout(line) {
      out.push(line);
    },
    stderr(line) {
      err.push(line);
    },
  };
}
