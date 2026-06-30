#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packagesDirectory = join(rootDirectory, "packages");
const expectedVersion = "0.1.0-alpha.1";

const publishablePackages = new Map([
  ["core", "@ignitionai/agent-trainer-core"],
  ["environment", "@ignitionai/agent-trainer-environment"],
  ["evals", "@ignitionai/agent-trainer-evals"],
  ["experiments", "@ignitionai/agent-trainer-experiments"],
  ["exporters", "@ignitionai/agent-trainer-exporters"],
  ["preset-rag", "@ignitionai/agent-trainer-preset-rag"],
  ["rl", "@ignitionai/agent-trainer-rl"],
  ["trainer", "@ignitionai/agent-trainer"],
  ["adapter-ignitionrag", "@ignitionai/agent-trainer-adapter-ignitionrag"],
  ["cli", "@ignitionai/agent-trainer-cli"],
]);

const expectedPrivatePackages = new Map([
  ["adapter-callable", "@ignitionai/agent-trainer-adapter-callable"],
  ["adapter-langchain", "@ignitionai/agent-trainer-adapter-langchain"],
  ["adapter-langgraph", "@ignitionai/agent-trainer-adapter-langgraph"],
  ["adapter-mastra", "@ignitionai/agent-trainer-adapter-mastra"],
  ["adapter-vercel-ai", "@ignitionai/agent-trainer-adapter-vercel-ai"],
  ["preset-strategies", "@ignitionai/agent-trainer-preset-strategies"],
]);

const publishableOrder = [
  "core",
  "environment",
  "evals",
  "exporters",
  "experiments",
  "preset-rag",
  "rl",
  "trainer",
  "adapter-ignitionrag",
  "cli",
];

const failures = [];

function readPackageJson(directory) {
  return JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function hasWorkspaceProtocol(value) {
  return JSON.stringify(value).includes("workspace:");
}

function assertCommonPackageShape(packageDirectory, packageJson, packageName) {
  assert(
    packageJson.name === packageName,
    `${packageDirectory} has unexpected name ${packageJson.name}`,
  );
  assert(
    packageJson.version === expectedVersion,
    `${packageJson.name} has unexpected version ${packageJson.version}`,
  );
  assert(packageJson.type === "module", `${packageJson.name} must be an ESM package`);
  assert(packageJson.main === "./dist/index.js", `${packageJson.name} must expose dist main`);
  assert(packageJson.module === "./dist/index.js", `${packageJson.name} must expose dist module`);
  assert(packageJson.types === "./dist/index.d.ts", `${packageJson.name} must expose dist types`);
  assert(
    Array.isArray(packageJson.files) && packageJson.files.includes("dist"),
    `${packageJson.name} must publish only dist via files`,
  );
  assert(
    existsSync(join(packageDirectory, "README.md")),
    `${packageJson.name} is missing README.md`,
  );
  assert(
    existsSync(join(packageDirectory, "dist/index.js")),
    `${packageJson.name} is missing dist/index.js`,
  );
  assert(
    existsSync(join(packageDirectory, "dist/index.d.ts")),
    `${packageJson.name} is missing dist/index.d.ts`,
  );
  assert(
    packageJson.exports?.["."]?.import === "./dist/index.js",
    `${packageJson.name} must export dist/index.js`,
  );
  assert(
    packageJson.exports?.["."]?.types === "./dist/index.d.ts",
    `${packageJson.name} must export dist/index.d.ts`,
  );
}

function assertPublishablePackage(packageDirectory, packageJson, packageName) {
  assertCommonPackageShape(packageDirectory, packageJson, packageName);
  assert(packageJson.private !== true, `${packageJson.name} must not be private`);
  assert(
    packageJson.publishConfig?.access === "public",
    `${packageJson.name} must publish with public access`,
  );
  assert(
    packageJson.publishConfig?.tag === "alpha",
    `${packageJson.name} must publish with alpha tag`,
  );
  assert(
    !hasWorkspaceProtocol(packageJson),
    `${packageJson.name} contains a workspace: dependency`,
  );

  for (const [field, dependencies] of Object.entries({
    dependencies: packageJson.dependencies,
    peerDependencies: packageJson.peerDependencies,
    optionalDependencies: packageJson.optionalDependencies,
  })) {
    if (!dependencies) continue;
    for (const [dependencyName, version] of Object.entries(dependencies)) {
      if (!dependencyName.startsWith("@ignitionai/agent-trainer")) continue;
      assert(
        version === expectedVersion,
        `${packageJson.name} ${field}.${dependencyName} must use ${expectedVersion}`,
      );
    }
  }

  if (packageJson.name === "@ignitionai/agent-trainer-cli") {
    assert(
      packageJson.bin?.["ignition-agent-trainer"] === "./dist/index.js",
      `${packageJson.name} must expose the ignition-agent-trainer bin`,
    );
    const cliEntrypoint = readFileSync(join(packageDirectory, "dist/index.js"), "utf8");
    assert(
      cliEntrypoint.startsWith("#!/usr/bin/env bun"),
      `${packageJson.name} dist entrypoint must preserve the bun shebang`,
    );
  } else {
    assert(packageJson.bin === undefined, `${packageJson.name} must not expose a CLI bin`);
  }
}

function assertPrivatePackage(packageDirectory, packageJson, packageName) {
  assertCommonPackageShape(packageDirectory, packageJson, packageName);
  assert(packageJson.private === true, `${packageJson.name} must stay private`);
  assert(
    packageJson.publishConfig === undefined,
    `${packageJson.name} must not define publishConfig`,
  );
}

function assertPackedPackage(packageDirectory, packageJson) {
  const dryRun = JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: packageDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  )[0];
  const packedPaths = new Set(dryRun.files.map((file) => file.path));

  for (const expectedPath of ["README.md", "package.json", "dist/index.js", "dist/index.d.ts"]) {
    assert(packedPaths.has(expectedPath), `${packageJson.name} pack is missing ${expectedPath}`);
  }

  const tempDirectory = mkdtempSync(join(tmpdir(), "iat-pack-"));
  try {
    const packed = JSON.parse(
      execFileSync("npm", ["pack", "--json", "--pack-destination", tempDirectory], {
        cwd: packageDirectory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    )[0];
    const packedManifest = JSON.parse(
      execFileSync("tar", ["-xOf", join(tempDirectory, packed.filename), "package/package.json"], {
        encoding: "utf8",
      }),
    );
    assert(
      !hasWorkspaceProtocol(packedManifest),
      `${packageJson.name} packed manifest has workspace:`,
    );
    assert(
      packedManifest.publishConfig?.tag === "alpha",
      `${packageJson.name} packed manifest must keep alpha publishConfig`,
    );
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

const actualPackageDirectories = readdirSync(packagesDirectory)
  .filter((directory) => existsSync(join(packagesDirectory, directory, "package.json")))
  .sort();

for (const [directory, packageName] of publishablePackages) {
  assert(
    actualPackageDirectories.includes(directory),
    `Missing publishable package directory packages/${directory}`,
  );
  assert(
    publishableOrder.includes(directory),
    `Missing publish order entry for publishable package packages/${directory}`,
  );
  const packageDirectory = join(packagesDirectory, directory);
  const packageJson = readPackageJson(packageDirectory);
  assertPublishablePackage(packageDirectory, packageJson, packageName);
}

for (const [directory, packageName] of expectedPrivatePackages) {
  assert(
    actualPackageDirectories.includes(directory),
    `Missing private package directory packages/${directory}`,
  );
  const packageDirectory = join(packagesDirectory, directory);
  const packageJson = readPackageJson(packageDirectory);
  assertPrivatePackage(packageDirectory, packageJson, packageName);
}

for (const directory of actualPackageDirectories) {
  assert(
    publishablePackages.has(directory) || expectedPrivatePackages.has(directory),
    `Package packages/${directory} must be classified as publishable or private`,
  );
}

for (const directory of publishableOrder) {
  const packageDirectory = join(packagesDirectory, directory);
  const packageJson = readPackageJson(packageDirectory);
  assertPackedPackage(packageDirectory, packageJson);
}

if (failures.length > 0) {
  console.error("npm pack readiness failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`npm pack readiness passed for ${publishableOrder.length} publishable packages.`);
