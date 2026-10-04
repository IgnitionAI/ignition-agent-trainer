import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { canonicalPolicyJson, type PolicyArtifact, parsePolicyArtifact } from "./policy-artifact";

export interface PolicyMetrics {
  successRate: number;
  reward: number;
  tools: number;
  costUsd: number | null;
}
export interface PolicyGateInput {
  baselineId: string;
  candidateId: string;
  corpusId: string;
  evaluationReportId: string;
  mode: "real" | "synthetic";
  baseline: PolicyMetrics;
  candidate: PolicyMetrics;
  thresholds: {
    maxSuccessDrop: number;
    maxRewardDrop: number;
    maxToolIncrease: number;
    maxCostIncreaseUsd: number | null;
  };
}
export interface PolicyGateReport extends PolicyGateInput {
  passed: boolean;
  reasons: string[];
}
export function comparePolicyBaseline(input: PolicyGateInput): PolicyGateReport {
  const reasons: string[] = [];
  for (const id of [input.baselineId, input.candidateId, input.corpusId, input.evaluationReportId])
    if (!id.trim()) throw new Error("Gate identities are required.");
  if (!["real", "synthetic"].includes(input.mode)) throw new Error("Unknown evidence mode.");
  for (const metrics of [input.baseline, input.candidate]) {
    if (
      !Number.isFinite(metrics.successRate) ||
      metrics.successRate < 0 ||
      metrics.successRate > 1 ||
      !Number.isFinite(metrics.reward) ||
      !Number.isFinite(metrics.tools) ||
      metrics.tools < 0 ||
      (metrics.costUsd !== null && (!Number.isFinite(metrics.costUsd) || metrics.costUsd < 0))
    )
      throw new Error("Invalid baseline metrics.");
  }
  if (
    JSON.stringify(Object.keys(input.thresholds).sort()) !==
    JSON.stringify(
      ["maxSuccessDrop", "maxRewardDrop", "maxToolIncrease", "maxCostIncreaseUsd"].sort(),
    )
  )
    throw new Error("Missing or unknown gate thresholds.");
  for (const [name, value] of Object.entries(input.thresholds)) {
    if (value === null && name !== "maxCostIncreaseUsd") throw new Error("Missing gate threshold.");
  }
  for (const threshold of Object.values(input.thresholds))
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0))
      throw new Error("Invalid gate thresholds.");
  if (input.candidate.successRate < input.baseline.successRate - input.thresholds.maxSuccessDrop)
    reasons.push("success-regression");
  if (input.candidate.reward < input.baseline.reward - input.thresholds.maxRewardDrop)
    reasons.push("reward-regression");
  if (input.candidate.tools > input.baseline.tools + input.thresholds.maxToolIncrease)
    reasons.push("tool-regression");
  if (input.thresholds.maxCostIncreaseUsd !== null) {
    if (input.baseline.costUsd === null || input.candidate.costUsd === null)
      reasons.push("cost-not-observed");
    else if (input.candidate.costUsd > input.baseline.costUsd + input.thresholds.maxCostIncreaseUsd)
      reasons.push("cost-regression");
  }
  return { ...structuredClone(input), passed: reasons.length === 0, reasons };
}
export interface PolicyRegistryPointer {
  schemaVersion: 1;
  activeId: string;
  previousId: string | null;
  baselineId: string;
  gateReportId: string | null;
}

/** Local single-writer registry. Filesystem must support atomic same-directory rename. */
export class LocalPolicyRegistry {
  constructor(private readonly directory: string) {}
  async register(input: unknown): Promise<string> {
    const artifact = parsePolicyArtifact(input);
    await mkdir(join(this.directory, "versions"), { recursive: true });
    const path = this.versionPath(artifact.id);
    try {
      await writeExclusive(path, canonicalPolicyJson(artifact));
    } catch (error) {
      if (!isExists(error)) throw error;
      if (
        canonicalPolicyJson(await this.readVersion(artifact.id)) !== canonicalPolicyJson(artifact)
      )
        throw new Error("Immutable version conflict.");
    }
    await syncDirectory(join(this.directory, "versions"));
    return artifact.id;
  }
  async readVersion(id: string): Promise<PolicyArtifact> {
    assertId(id);
    const artifact = parsePolicyArtifact(JSON.parse(await readFile(this.versionPath(id), "utf8")));
    if (artifact.id !== id) throw new Error("Version identity mismatch.");
    return artifact;
  }
  async active(): Promise<PolicyRegistryPointer> {
    const input: unknown = JSON.parse(await readFile(join(this.directory, "active.json"), "utf8"));
    if (typeof input !== "object" || input === null) throw new Error("Invalid registry pointer.");
    const pointer = input as PolicyRegistryPointer;
    if (
      pointer.schemaVersion !== 1 ||
      JSON.stringify(Object.keys(pointer).sort()) !==
        JSON.stringify(
          ["schemaVersion", "activeId", "previousId", "baselineId", "gateReportId"].sort(),
        )
    )
      throw new Error("Invalid pointer schema.");
    assertId(pointer.activeId);
    assertId(pointer.baselineId);
    if (pointer.previousId !== null) assertId(pointer.previousId);
    if (pointer.gateReportId !== null) assertId(pointer.gateReportId);
    await this.readVersion(pointer.activeId);
    await this.readVersion(pointer.baselineId);
    if (pointer.gateReportId !== null) {
      const report = await this.readReport(pointer.gateReportId);
      if (
        !report.passed ||
        report.candidateId !== pointer.activeId ||
        report.baselineId !== pointer.baselineId ||
        pointer.previousId !== pointer.baselineId
      )
        throw new Error("Inconsistent active gate report.");
    } else if (pointer.previousId !== null || pointer.activeId !== pointer.baselineId)
      throw new Error("Inconsistent baseline pointer.");
    return pointer;
  }
  async initialize(baselineId: string): Promise<void> {
    await this.locked(async () => {
      await this.readVersion(baselineId);
      await writeExclusive(
        join(this.directory, "active.json"),
        canonicalPolicyJson({
          schemaVersion: 1,
          activeId: baselineId,
          previousId: null,
          baselineId,
          gateReportId: null,
        }),
      );
    });
  }
  async promote(input: PolicyGateInput): Promise<PolicyGateReport> {
    return this.locked(async () => {
      const pointer = await this.active();
      if (input.baselineId !== pointer.activeId || input.candidateId === pointer.activeId)
        throw new Error("Gate must compare candidate to pinned active baseline.");
      const baseline = await this.readVersion(input.baselineId);
      const candidate = await this.readVersion(input.candidateId);
      if (
        baseline.algorithm !== candidate.algorithm ||
        canonicalPolicyJson(baseline.encoder) !== canonicalPolicyJson(candidate.encoder) ||
        canonicalPolicyJson([...baseline.actions].sort()) !==
          canonicalPolicyJson([...candidate.actions].sort()) ||
        baseline.rewardConfigId !== candidate.rewardConfigId
      )
        throw new Error("Incompatible promotion.");
      if (candidate.provenance.mode !== input.mode || baseline.provenance.mode !== input.mode)
        throw new Error("Evidence mode mismatch.");
      if (input.evaluationReportId !== candidate.evaluationReportId)
        throw new Error("Evaluation report does not match candidate artifact.");
      const report = comparePolicyBaseline(input);
      const reportId = await this.storeReport(report);
      if (report.passed)
        await this.replacePointer({
          schemaVersion: 1,
          activeId: candidate.id,
          previousId: pointer.activeId,
          baselineId: pointer.activeId,
          gateReportId: reportId,
        });
      return report;
    });
  }
  async rollback(): Promise<PolicyRegistryPointer> {
    return this.locked(async () => {
      const pointer = await this.active();
      if (pointer.previousId === null) throw new Error("No previous version to restore.");
      await this.readVersion(pointer.previousId);
      const restored: PolicyRegistryPointer = {
        schemaVersion: 1,
        activeId: pointer.previousId,
        previousId: null,
        baselineId: pointer.previousId,
        gateReportId: null,
      };
      await this.replacePointer(restored);
      return restored;
    });
  }
  async readReport(id: string): Promise<PolicyGateReport> {
    assertId(id);
    const input: unknown = JSON.parse(
      await readFile(join(this.directory, "reports", `${id}.json`), "utf8"),
    );
    if (typeof input !== "object" || input === null) throw new Error("Invalid gate report.");
    const report = input as PolicyGateReport;
    if (createHash("sha256").update(canonicalPolicyJson(report)).digest("hex") !== id)
      throw new Error("Gate report checksum mismatch.");
    const verified = comparePolicyBaseline(report);
    if (
      report.passed !== verified.passed ||
      canonicalPolicyJson(report.reasons) !== canonicalPolicyJson(verified.reasons)
    )
      throw new Error("Invalid gate outcome.");
    return report;
  }
  private versionPath(id: string): string {
    assertId(id);
    return join(this.directory, "versions", `${id}.json`);
  }
  private async storeReport(report: PolicyGateReport): Promise<string> {
    const json = canonicalPolicyJson(report);
    const id = createHash("sha256").update(json).digest("hex");
    await mkdir(join(this.directory, "reports"), { recursive: true });
    try {
      await writeExclusive(join(this.directory, "reports", `${id}.json`), json);
    } catch (error) {
      if (!isExists(error)) throw error;
      if (canonicalPolicyJson(await this.readReport(id)) !== json)
        throw new Error("Immutable report conflict.");
    }
    await syncDirectory(join(this.directory, "reports"));
    return id;
  }
  private async replacePointer(pointer: PolicyRegistryPointer): Promise<void> {
    const temporary = join(this.directory, `.active-${randomUUID()}.tmp`);
    await writeExclusive(temporary, canonicalPolicyJson(pointer));
    await rename(temporary, join(this.directory, "active.json"));
    await syncDirectory(this.directory);
  }
  private async locked<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true });
    const lockPath = join(this.directory, ".writer.lock");
    const lock = await open(lockPath, "wx");
    try {
      return await operation();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
}
function assertId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id))
    throw new Error("Invalid registry identity.");
}
function isExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
async function writeExclusive(path: string, content: string): Promise<void> {
  const file = await open(path, "wx");
  try {
    await file.writeFile(content, "utf8");
    await file.sync();
  } finally {
    await file.close();
  }
}

async function syncDirectory(path: string): Promise<void> {
  const directory = await open(path, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
