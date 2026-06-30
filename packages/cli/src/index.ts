#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { recommendVariant, type VariantRecommendation } from "@ignitionai/agent-trainer";
import type { ExperimentResult } from "@ignitionai/agent-trainer-core";
import {
  appendExperimentHistory,
  compareExperimentResults,
  type ExperimentDefinition,
  type ExperimentHistoryEntry,
  getLatestExperimentHistoryEntry,
  type RegressionGateOptions,
  readExperimentHistory,
} from "@ignitionai/agent-trainer-experiments";
import {
  type ExperimentResultExportOptions,
  toJsonReport,
  toMarkdownReport,
  writeReportBundle,
} from "@ignitionai/agent-trainer-exporters";

export interface EvalRunCommand {
  kind: "eval-run";
  experimentPath: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
  bundleOutputDirectory?: string;
  historyPath?: string;
  recordHistory?: boolean;
  baseline?: string;
  regression?: boolean;
  regressionMarkdownOutputPath?: string;
  regressionOptions: RegressionGateOptions;
}

export interface EvalHistoryListCommand {
  kind: "eval-history-list";
  historyPath: string;
  experimentName?: string;
  limit?: number;
}

export interface EvalHistoryShowCommand {
  kind: "eval-history-show";
  historyPath: string;
  selector: string;
  experimentName?: string;
}

export type CliCommand = EvalRunCommand | EvalHistoryListCommand | EvalHistoryShowCommand;

export type ParseCliArgsResult =
  | { ok: true; command: CliCommand }
  | { ok: false; message: string; exitCode: number; showUsage?: boolean };

export interface CliEnvironment {
  cwd?: string;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  fileExists?: (absolutePath: string) => boolean | Promise<boolean>;
  importModule?: (specifier: string) => Promise<unknown>;
  writeFile?: (absolutePath: string, contents: string) => Promise<void>;
  ensureDirectory?: (absolutePath: string) => Promise<void>;
}

interface ResolvedCliEnvironment {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  fileExists: (absolutePath: string) => boolean | Promise<boolean>;
  importModule: (specifier: string) => Promise<unknown>;
  writeFile: (absolutePath: string, contents: string) => Promise<void>;
  ensureDirectory: (absolutePath: string) => Promise<void>;
}

const usage = `Ignition Agent Trainer CLI

Usage:
  ignition-agent-trainer eval run <experiment.ts> [--json <report.json>] [--markdown <report.md>] [--bundle <reports-dir>]
  ignition-agent-trainer eval history list <history.jsonl> [--experiment <name>] [--limit <count>]
  ignition-agent-trainer eval history show <history.jsonl> <entry-id|latest> [--experiment <name>]

Options:
  --json <path>                         Write a JSON experiment report.
  --markdown <path>                     Write a Markdown experiment report.
  --bundle <dir>                        Write a timestamped JSON/Markdown report bundle.
  --history <path>                      Read/write local experiment history JSONL.
  --record-history                      Append the current result to --history after a passing run.
  --baseline <latest|entry-id>          Compare the current result against a history baseline.
  --regression                          Fail when the baseline comparison has regressions.
  --max-score-drop <number>             Maximum allowed score drop. Defaults to 0.
  --max-latency-increase-ms <number>    Maximum allowed latency increase.
  --max-cost-increase-usd <number>      Maximum allowed cost increase.
  --variant <id>                        Restrict regression checks to a variant. Repeatable.
  --regression-markdown <path>          Write regression comparison Markdown.
  --experiment <name>                   Filter history entries by experiment name.
  --limit <count>                       Limit history list output.
  -h, --help                            Show this help message.`;

export function parseCliArgs(args: string[]): ParseCliArgsResult {
  if (args.length === 0) {
    return { ok: false, message: "Missing command.", exitCode: 1, showUsage: true };
  }

  if (args[0] === "-h" || args[0] === "--help") {
    return { ok: false, message: usage, exitCode: 0 };
  }

  if (args[0] !== "eval") {
    return {
      ok: false,
      message: `Unknown command: ${args.join(" ")}`,
      exitCode: 1,
      showUsage: true,
    };
  }

  if (args[1] === "history") {
    return parseHistoryCommand(args);
  }

  if (args[1] !== "run") {
    return {
      ok: false,
      message: `Unknown command: ${args.join(" ")}`,
      exitCode: 1,
      showUsage: true,
    };
  }

  const experimentPath = args[2];
  if (experimentPath === undefined || experimentPath.startsWith("-")) {
    return {
      ok: false,
      message: "Missing experiment path. Expected: ignition-agent-trainer eval run <experiment.ts>",
      exitCode: 1,
      showUsage: true,
    };
  }

  const command: EvalRunCommand = {
    kind: "eval-run",
    experimentPath,
    regressionOptions: {},
  };

  for (let index = 3; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) break;

    if (arg === "--json") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --json.", exitCode: 1 };
      }
      command.jsonOutputPath = value;
      index += 1;
      continue;
    }

    if (arg === "--markdown") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --markdown.", exitCode: 1 };
      }
      command.markdownOutputPath = value;
      index += 1;
      continue;
    }

    if (arg === "--bundle") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --bundle.", exitCode: 1 };
      }
      command.bundleOutputDirectory = value;
      index += 1;
      continue;
    }

    if (arg === "--history") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --history.", exitCode: 1 };
      }
      command.historyPath = value;
      index += 1;
      continue;
    }

    if (arg === "--record-history") {
      command.recordHistory = true;
      continue;
    }

    if (arg === "--baseline") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --baseline.", exitCode: 1 };
      }
      command.baseline = value;
      index += 1;
      continue;
    }

    if (arg === "--regression") {
      command.regression = true;
      continue;
    }

    if (arg === "--max-score-drop") {
      const parsed = parseNumberOption(args[index + 1], "--max-score-drop");
      if (!parsed.ok) return parsed;
      command.regressionOptions.maxScoreDrop = parsed.value;
      index += 1;
      continue;
    }

    if (arg === "--max-latency-increase-ms") {
      const parsed = parseNumberOption(args[index + 1], "--max-latency-increase-ms");
      if (!parsed.ok) return parsed;
      command.regressionOptions.maxLatencyIncreaseMs = parsed.value;
      index += 1;
      continue;
    }

    if (arg === "--max-cost-increase-usd") {
      const parsed = parseNumberOption(args[index + 1], "--max-cost-increase-usd");
      if (!parsed.ok) return parsed;
      command.regressionOptions.maxCostIncreaseUsd = parsed.value;
      index += 1;
      continue;
    }

    if (arg === "--variant") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --variant.", exitCode: 1 };
      }
      command.regressionOptions.variantIds = [
        ...(command.regressionOptions.variantIds ?? []),
        value,
      ];
      index += 1;
      continue;
    }

    if (arg === "--regression-markdown") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --regression-markdown.", exitCode: 1 };
      }
      command.regressionMarkdownOutputPath = value;
      index += 1;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      return { ok: false, message: usage, exitCode: 0 };
    }

    return { ok: false, message: `Unknown option: ${arg}`, exitCode: 1 };
  }

  const validation = validateEvalRunCommand(command);
  if (validation !== null) return validation;

  return { ok: true, command };
}

export async function runCli(
  args: string[] = process.argv.slice(2),
  environment: CliEnvironment = {},
): Promise<number> {
  const env = resolveEnvironment(environment);
  const parsed = parseCliArgs(args);

  if (!parsed.ok) {
    const write = parsed.exitCode === 0 ? env.stdout : env.stderr;
    writeLines(write, parsed.message);
    if (parsed.showUsage === true) {
      write("");
      writeLines(write, usage);
    }
    return parsed.exitCode;
  }

  try {
    await runCommand(parsed.command, env);
    return 0;
  } catch (error) {
    env.stderr(errorMessage(error));
    return 1;
  }
}

async function runCommand(command: CliCommand, env: ResolvedCliEnvironment): Promise<void> {
  if (command.kind === "eval-history-list") {
    await printHistoryList(command, env);
    return;
  }

  if (command.kind === "eval-history-show") {
    await printHistoryEntry(command, env);
    return;
  }

  if (command.kind !== "eval-run") {
    throw new Error(`Unsupported command: ${(command as { kind: string }).kind}`);
  }

  const history = await readRequestedHistory(command, env);
  const definition = await loadExperimentDefinition(command.experimentPath, env);
  const result = await definition.run();
  const recommendation = recommendVariant(result);

  printExperimentSummary(result, definition, recommendation, env.stdout);
  await writeRequestedReports(command, result, recommendation, env);
  await compareAgainstBaseline(command, result, history, env);
  await recordHistoryEntry(command, result, env);
}

async function loadExperimentDefinition(
  experimentPath: string,
  env: ResolvedCliEnvironment,
): Promise<ExperimentDefinition> {
  const absolutePath = await resolveExistingExperimentPath(experimentPath, env);
  if (absolutePath === null) {
    throw new Error(`Experiment file not found: ${experimentPath}`);
  }

  let module: unknown;
  try {
    module = await env.importModule(pathToFileURL(absolutePath).href);
  } catch (error) {
    throw new Error(`Failed to load experiment file ${experimentPath}: ${errorMessage(error)}`);
  }

  const definition = readExperimentDefinition(module);
  if (definition === null) {
    throw new Error(
      `Experiment file must default export an ExperimentDefinition from defineExperiment(): ${experimentPath}`,
    );
  }

  return definition;
}

async function resolveExistingExperimentPath(
  experimentPath: string,
  env: ResolvedCliEnvironment,
): Promise<string | null> {
  if (isAbsolute(experimentPath)) {
    return (await env.fileExists(experimentPath)) ? experimentPath : null;
  }

  let currentDirectory = env.cwd;
  while (true) {
    const candidate = resolve(currentDirectory, experimentPath);
    if (await env.fileExists(candidate)) return candidate;

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return null;
    currentDirectory = parentDirectory;
  }
}

function readExperimentDefinition(module: unknown): ExperimentDefinition | null {
  if (!isRecord(module)) return null;
  const candidate = module.default;
  if (!isRecord(candidate)) return null;
  if (candidate.kind !== "ignition.experiment-definition") return null;
  if (typeof candidate.run !== "function") return null;
  if (typeof candidate.create !== "function") return null;
  return candidate as unknown as ExperimentDefinition;
}

function printExperimentSummary(
  result: ExperimentResult,
  definition: ExperimentDefinition,
  recommendation: VariantRecommendation | null,
  write: (line: string) => void,
): void {
  write(`Experiment: ${result.name}`);
  write(`Dataset items: ${definition.dataset.items.length}`);
  write(`Variants: ${definition.variants.map((variant) => variant.name).join(", ")}`);
  write("");
  write("Leaderboard:");

  if (result.leaderboard.length === 0) {
    write("No variants were reported.");
  } else {
    for (const [index, row] of result.leaderboard.entries()) {
      write(`${index + 1}. ${row.name} - ${row.score.toFixed(2)}`);
    }
  }

  write("");
  write("Recommendation:");
  if (recommendation === null) {
    write("No recommendation is available for an empty leaderboard.");
    return;
  }

  write(recommendation.summary);
  write("Reasons:");
  for (const reason of recommendation.reasons) {
    write(`- ${reason}`);
  }
  write("Tradeoffs:");
  for (const tradeoff of recommendation.tradeoffs) {
    write(`- ${tradeoff}`);
  }
  write(`Confidence: ${recommendation.confidence}`);
}

async function writeRequestedReports(
  command: EvalRunCommand,
  result: ExperimentResult,
  recommendation: VariantRecommendation | null,
  env: ResolvedCliEnvironment,
): Promise<void> {
  const exportOptions: ExperimentResultExportOptions =
    recommendation === null ? {} : { recommendation };

  if (command.jsonOutputPath !== undefined) {
    await writeReport(command.jsonOutputPath, toJsonReport(result, exportOptions), env);
    env.stdout(`JSON report: ${command.jsonOutputPath}`);
  }

  if (command.markdownOutputPath !== undefined) {
    await writeReport(command.markdownOutputPath, toMarkdownReport(result, exportOptions), env);
    env.stdout(`Markdown report: ${command.markdownOutputPath}`);
  }

  if (command.bundleOutputDirectory !== undefined) {
    const outputDirectory = resolveOutputPath(command.bundleOutputDirectory, env);
    const bundle = await writeReportBundle(result, {
      ...exportOptions,
      outputDirectory,
      includeMetadataFile: true,
    });
    env.stdout(`Report bundle: ${bundle.directory}`);
  }
}

async function readRequestedHistory(
  command: EvalRunCommand,
  env: ResolvedCliEnvironment,
): Promise<ExperimentHistoryEntry[] | null> {
  if (command.historyPath === undefined) return null;
  return readExperimentHistory(resolveCliPath(command.historyPath, env));
}

async function compareAgainstBaseline(
  command: EvalRunCommand,
  result: ExperimentResult,
  history: ExperimentHistoryEntry[] | null,
  env: ResolvedCliEnvironment,
): Promise<void> {
  if (command.baseline === undefined) return;
  if (history === null) {
    throw new Error("--baseline requires --history.");
  }

  const baseline = selectHistoryEntry(history, command.baseline, result.name);
  if (baseline === null) {
    throw new Error(`Baseline not found: ${command.baseline} for experiment ${result.name}.`);
  }

  const comparison = compareExperimentResults(result, baseline.result, command.regressionOptions);
  env.stdout("");
  env.stdout(`Baseline: ${baseline.id} (${baseline.recordedAt})`);
  env.stdout(`Regression gate: ${comparison.passed ? "pass" : "fail"}`);
  writeLines(env.stdout, comparison.markdown.trimEnd());

  if (command.regressionMarkdownOutputPath !== undefined) {
    await writeReport(command.regressionMarkdownOutputPath, comparison.markdown, env);
    env.stdout(`Regression Markdown: ${command.regressionMarkdownOutputPath}`);
  }

  if (command.regression === true && !comparison.passed) {
    throw new Error(
      `Regression gate failed:\n${comparison.failures
        .map((failure) => `- ${failure.message}`)
        .join("\n")}`,
    );
  }
}

async function recordHistoryEntry(
  command: EvalRunCommand,
  result: ExperimentResult,
  env: ResolvedCliEnvironment,
): Promise<void> {
  if (command.recordHistory !== true) return;
  if (command.historyPath === undefined) {
    throw new Error("--record-history requires --history.");
  }

  const entry = await appendExperimentHistory(resolveCliPath(command.historyPath, env), result, {
    metadata: {
      source: "cli",
      experimentPath: command.experimentPath,
    },
  });
  env.stdout(`History entry: ${entry.id}`);
}

async function printHistoryList(
  command: EvalHistoryListCommand,
  env: ResolvedCliEnvironment,
): Promise<void> {
  const entries = await readExperimentHistory(resolveCliPath(command.historyPath, env));
  const filtered = filterHistoryEntries(entries, command.experimentName);
  const visible =
    command.limit === undefined
      ? filtered
      : filtered.slice(Math.max(0, filtered.length - command.limit));

  env.stdout(`History: ${command.historyPath}`);
  if (command.experimentName !== undefined) {
    env.stdout(`Experiment filter: ${command.experimentName}`);
  }
  env.stdout(`Entries: ${filtered.length}`);

  if (filtered.length === 0) {
    env.stdout("No history entries found.");
    return;
  }

  env.stdout("");
  for (const entry of [...visible].reverse()) {
    const winner = entry.result.leaderboard[0];
    env.stdout(
      `${entry.id} | ${entry.recordedAt} | ${entry.result.name} | ${formatWinner(winner)}`,
    );
  }
}

async function printHistoryEntry(
  command: EvalHistoryShowCommand,
  env: ResolvedCliEnvironment,
): Promise<void> {
  const entries = await readExperimentHistory(resolveCliPath(command.historyPath, env));
  const entry = selectHistoryEntry(entries, command.selector, command.experimentName);
  if (entry === null) {
    throw new Error(`History entry not found: ${command.selector}.`);
  }

  env.stdout(`History entry: ${entry.id}`);
  env.stdout(`Recorded at: ${entry.recordedAt}`);
  env.stdout(`Experiment: ${entry.result.name}`);
  env.stdout(`Cases: ${entry.result.cases.length}`);
  env.stdout(`Failed cases: ${entry.result.failedCases.length}`);
  if (entry.metadata !== undefined) {
    env.stdout(`Metadata: ${JSON.stringify(entry.metadata)}`);
  }
  env.stdout("");
  env.stdout("Leaderboard:");
  if (entry.result.leaderboard.length === 0) {
    env.stdout("No variants were reported.");
    return;
  }

  for (const [index, row] of entry.result.leaderboard.entries()) {
    env.stdout(
      `${index + 1}. ${row.name} - score ${row.score.toFixed(3)} (${row.totalCases} cases, ${
        row.failedCases
      } failed)`,
    );
  }
}

async function writeReport(
  outputPath: string,
  contents: string,
  env: ResolvedCliEnvironment,
): Promise<void> {
  const absolutePath = resolveOutputPath(outputPath, env);
  await env.ensureDirectory(dirname(absolutePath));
  await env.writeFile(absolutePath, contents);
}

function resolveOutputPath(outputPath: string, env: ResolvedCliEnvironment): string {
  return resolveCliPath(outputPath, env);
}

function resolveCliPath(inputPath: string, env: ResolvedCliEnvironment): string {
  return isAbsolute(inputPath) ? inputPath : resolve(env.cwd, inputPath);
}

function parseHistoryCommand(args: string[]): ParseCliArgsResult {
  const action = args[2];
  const historyPath = args[3];

  if (action !== "list" && action !== "show") {
    return {
      ok: false,
      message:
        "Missing history action. Expected: ignition-agent-trainer eval history <list|show> <history.jsonl>",
      exitCode: 1,
      showUsage: true,
    };
  }

  if (historyPath === undefined || historyPath.startsWith("-")) {
    return {
      ok: false,
      message: `Missing history path. Expected: ignition-agent-trainer eval history ${action} <history.jsonl>`,
      exitCode: 1,
      showUsage: true,
    };
  }

  if (action === "list") {
    const command: EvalHistoryListCommand = {
      kind: "eval-history-list",
      historyPath,
    };
    for (let index = 4; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === "--experiment") {
        const value = args[index + 1];
        if (value === undefined || value.startsWith("-")) {
          return { ok: false, message: "Missing value for --experiment.", exitCode: 1 };
        }
        command.experimentName = value;
        index += 1;
        continue;
      }
      if (arg === "--limit") {
        const parsed = parseIntegerOption(args[index + 1], "--limit");
        if (!parsed.ok) return parsed;
        command.limit = parsed.value;
        index += 1;
        continue;
      }
      return { ok: false, message: `Unknown option: ${arg}`, exitCode: 1 };
    }
    return { ok: true, command };
  }

  const selector = args[4];
  if (selector === undefined || selector.startsWith("-")) {
    return {
      ok: false,
      message:
        "Missing history entry selector. Expected: ignition-agent-trainer eval history show <history.jsonl> <entry-id|latest>",
      exitCode: 1,
      showUsage: true,
    };
  }

  const command: EvalHistoryShowCommand = {
    kind: "eval-history-show",
    historyPath,
    selector,
  };
  for (let index = 5; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--experiment") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, message: "Missing value for --experiment.", exitCode: 1 };
      }
      command.experimentName = value;
      index += 1;
      continue;
    }
    return { ok: false, message: `Unknown option: ${arg}`, exitCode: 1 };
  }
  return { ok: true, command };
}

function validateEvalRunCommand(command: EvalRunCommand): ParseCliArgsResult | null {
  if (command.recordHistory === true && command.historyPath === undefined) {
    return { ok: false, message: "--record-history requires --history.", exitCode: 1 };
  }
  if (command.baseline !== undefined && command.historyPath === undefined) {
    return { ok: false, message: "--baseline requires --history.", exitCode: 1 };
  }
  if (command.regression === true && command.baseline === undefined) {
    return { ok: false, message: "--regression requires --baseline.", exitCode: 1 };
  }
  if (command.regressionMarkdownOutputPath !== undefined && command.baseline === undefined) {
    return { ok: false, message: "--regression-markdown requires --baseline.", exitCode: 1 };
  }
  return null;
}

function parseNumberOption(
  value: string | undefined,
  optionName: string,
): { ok: true; value: number } | { ok: false; message: string; exitCode: number } {
  if (value === undefined || value.startsWith("-")) {
    return { ok: false, message: `Missing value for ${optionName}.`, exitCode: 1 };
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { ok: false, message: `Invalid value for ${optionName}: ${value}`, exitCode: 1 };
  }
  return { ok: true, value: number };
}

function parseIntegerOption(
  value: string | undefined,
  optionName: string,
): { ok: true; value: number } | { ok: false; message: string; exitCode: number } {
  const parsed = parseNumberOption(value, optionName);
  if (!parsed.ok) return parsed;
  if (!Number.isInteger(parsed.value) || parsed.value < 1) {
    return { ok: false, message: `Invalid value for ${optionName}: ${value}`, exitCode: 1 };
  }
  return parsed;
}

function selectHistoryEntry(
  entries: readonly ExperimentHistoryEntry[],
  selector: string,
  experimentName?: string,
): ExperimentHistoryEntry | null {
  if (selector === "latest") {
    return getLatestExperimentHistoryEntry(entries, experimentName);
  }

  return (
    entries.find(
      (entry) =>
        entry.id === selector &&
        (experimentName === undefined || entry.result.name === experimentName),
    ) ?? null
  );
}

function filterHistoryEntries(
  entries: readonly ExperimentHistoryEntry[],
  experimentName: string | undefined,
): ExperimentHistoryEntry[] {
  if (experimentName === undefined) return [...entries];
  return entries.filter((entry) => entry.result.name === experimentName);
}

function formatWinner(winner: ExperimentResult["leaderboard"][number] | undefined): string {
  if (winner === undefined) return "no winner";
  return `winner ${winner.name} score ${winner.score.toFixed(3)}`;
}

function resolveEnvironment(environment: CliEnvironment): ResolvedCliEnvironment {
  return {
    cwd: environment.cwd ?? process.cwd(),
    stdout: environment.stdout ?? ((line) => console.log(line)),
    stderr: environment.stderr ?? ((line) => console.error(line)),
    fileExists: environment.fileExists ?? ((absolutePath) => existsSync(absolutePath)),
    importModule: environment.importModule ?? ((specifier) => import(specifier)),
    writeFile:
      environment.writeFile ?? ((absolutePath, contents) => writeFile(absolutePath, contents)),
    ensureDirectory:
      environment.ensureDirectory ??
      (async (absolutePath) => {
        await mkdir(absolutePath, { recursive: true });
      }),
  };
}

function writeLines(write: (line: string) => void, block: string): void {
  for (const line of block.split("\n")) {
    write(line);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

if (isMainModule()) {
  const exitCode = await runCli();
  if (exitCode !== 0) process.exitCode = exitCode;
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
}
