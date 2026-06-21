#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ExperimentResult } from "@ignitionai/core";
import type { ExperimentDefinition } from "@ignitionai/experiments";
import {
  type ExperimentResultExportOptions,
  toJsonReport,
  toMarkdownReport,
} from "@ignitionai/exporters";
import { recommendVariant, type VariantRecommendation } from "@ignitionai/trainer";

export interface EvalRunCommand {
  kind: "eval-run";
  experimentPath: string;
  jsonOutputPath?: string;
  markdownOutputPath?: string;
}

export type CliCommand = EvalRunCommand;

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
  ignition eval run <experiment.ts> [--json <report.json>] [--markdown <report.md>]

Options:
  --json <path>       Write a JSON experiment report.
  --markdown <path>   Write a Markdown experiment report.
  -h, --help          Show this help message.`;

export function parseCliArgs(args: string[]): ParseCliArgsResult {
  if (args.length === 0) {
    return { ok: false, message: "Missing command.", exitCode: 1, showUsage: true };
  }

  if (args[0] === "-h" || args[0] === "--help") {
    return { ok: false, message: usage, exitCode: 0 };
  }

  if (args[0] !== "eval" || args[1] !== "run") {
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
      message: "Missing experiment path. Expected: ignition eval run <experiment.ts>",
      exitCode: 1,
      showUsage: true,
    };
  }

  const command: EvalRunCommand = {
    kind: "eval-run",
    experimentPath,
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

    if (arg === "-h" || arg === "--help") {
      return { ok: false, message: usage, exitCode: 0 };
    }

    return { ok: false, message: `Unknown option: ${arg}`, exitCode: 1 };
  }

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
  if (command.kind !== "eval-run") {
    throw new Error(`Unsupported command: ${command.kind}`);
  }

  const definition = await loadExperimentDefinition(command.experimentPath, env);
  const result = await definition.run();
  const recommendation = recommendVariant(result);

  printExperimentSummary(result, definition, recommendation, env.stdout);
  await writeRequestedReports(command, result, recommendation, env);
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
}

async function writeReport(
  outputPath: string,
  contents: string,
  env: ResolvedCliEnvironment,
): Promise<void> {
  const absolutePath = isAbsolute(outputPath) ? outputPath : resolve(env.cwd, outputPath);
  await env.ensureDirectory(dirname(absolutePath));
  await env.writeFile(absolutePath, contents);
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
