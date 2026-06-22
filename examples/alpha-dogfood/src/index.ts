import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { recommendVariant } from "@ignitionai/agent-trainer";
import { appendExperimentHistory } from "@ignitionai/agent-trainer-experiments";
import {
  toJsonReport,
  toMarkdownReport,
  writeReportBundle,
} from "@ignitionai/agent-trainer-exporters";
import alphaDogfoodExperiment, { dataset, variants } from "../experiment";
import { runAlphaDogfoodRegressionGate } from "../regression-gate";

const result = await alphaDogfoodExperiment.run();
const recommendation = recommendVariant(result);
const outputDirectory = fileURLToPath(new URL("../../../reports/alpha-dogfood/", import.meta.url));
await mkdir(outputDirectory, { recursive: true });

await writeFile(
  join(outputDirectory, "report.json"),
  toJsonReport(result, recommendation === null ? {} : { recommendation }),
  "utf8",
);
await writeFile(
  join(outputDirectory, "report.md"),
  toMarkdownReport(result, recommendation === null ? {} : { recommendation }),
  "utf8",
);
const bundle = await writeReportBundle(result, {
  outputDirectory,
  includeMetadataFile: true,
  ...(recommendation === null ? {} : { recommendation }),
});
const historyEntry = await appendExperimentHistory(join(outputDirectory, "history.jsonl"), result, {
  metadata: {
    source: "alpha-dogfood",
  },
});
const regression = await runAlphaDogfoodRegressionGate(result);

console.log(`Experiment: ${result.name}`);
console.log(`Dataset items: ${dataset.items.length}`);
console.log(`Variants: ${variants.map((variant) => variant.name).join(", ")}`);
console.log("");
console.log("Leaderboard:");
for (const [index, row] of result.leaderboard.entries()) {
  console.log(
    `${index + 1}. ${row.name} - ${row.score.toFixed(3)} (${Math.round(
      row.averageLatencyMs ?? 0,
    )}ms, $${(row.totalCostUsd ?? 0).toFixed(4)})`,
  );
}
console.log("");
console.log("Recommendation:");
if (recommendation === null) {
  console.log("No recommendation is available.");
} else {
  console.log(recommendation.summary);
  console.log(`Confidence: ${recommendation.confidence}`);
  for (const reason of recommendation.reasons) console.log(`- ${reason}`);
  for (const tradeoff of recommendation.tradeoffs) console.log(`- ${tradeoff}`);
}
console.log("");
console.log("Outputs:");
console.log(`- JSON report: ${join(outputDirectory, "report.json")}`);
console.log(`- Markdown report: ${join(outputDirectory, "report.md")}`);
console.log(`- Report bundle: ${bundle.directory}`);
console.log(`- History entry: ${historyEntry.id}`);
console.log("");
console.log(regression.markdown);
