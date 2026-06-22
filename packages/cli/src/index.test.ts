import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDataset,
  createMockAdapter,
  type RewardFunction,
} from "@ignitionai/agent-trainer-core";
import { defineExperiment, type ExperimentDefinition } from "@ignitionai/agent-trainer-experiments";
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
      },
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
});

function createCliExperimentDefinition(): ExperimentDefinition {
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
          output: "correct answer",
          trace: { steps: [] },
          usage: { latencyMs: 100, costUsd: 0.001 },
        }),
      },
      {
        id: "weak-agent",
        name: "weak-agent",
        adapter: createMockAdapter({
          output: "wrong answer",
          trace: { steps: [] },
          usage: { latencyMs: 50, costUsd: 0.0005 },
        }),
      },
    ],
    rewards: [qualityReward],
  });
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
