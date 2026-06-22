import { recommendVariant } from "@ignitionai/trainer";
import {
  sampleBridgeExperiment,
  sampleCaseRecords,
  sampleExecutionRequest,
  sampleWorkflowSnapshots,
} from "./sample";

const result = await sampleBridgeExperiment.run();
const recommendation = recommendVariant(result);

console.log(`Experiment: ${result.name}`);
console.log(`Collection: ${sampleExecutionRequest.collection?.name ?? "unknown"}`);
console.log(`Dataset items: ${sampleCaseRecords.length}`);
console.log(`Workflow snapshots: ${sampleWorkflowSnapshots.length}`);
console.log("");
console.log("Mapped variants:");
for (const variant of sampleExecutionRequest.variants) {
  console.log(`- ${variant.name} -> ${variant.runnable.kind}:${variant.runnable.id}`);
}
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
console.log("Bridge proof:");
console.log("- IgnitionRAG-shaped dataset records became DatasetItem objects.");
console.log("- IgnitionRAG workflow snapshots became executable AgentVariant objects.");
console.log("- The experiment ran locally without IgnitionRAG app code or provider calls.");
