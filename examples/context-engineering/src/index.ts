import { recommendVariant } from "@ignitionai/agent-trainer";
import contextEngineeringExperiment, { dataset, variants } from "../experiment";

const result = await contextEngineeringExperiment.run();

printExperimentSummary();

function printExperimentSummary(): void {
  const recommendation = recommendVariant(result);

  console.log(`Experiment: ${result.name}`);
  console.log(`Dataset items: ${dataset.items.length}`);
  console.log(`Variants: ${variants.map((variant) => variant.name).join(", ")}`);
  console.log("");
  console.log("Leaderboard:");
  result.leaderboard.forEach((row, index) => {
    console.log(`${index + 1}. ${row.name} - ${row.score.toFixed(2)}`);
  });
  console.log("");
  console.log("Recommendation:");
  if (recommendation === null) {
    console.log("No recommendation is available for an empty leaderboard.");
    return;
  }

  console.log(recommendation.summary);
  console.log("Reasons:");
  for (const reason of recommendation.reasons) {
    console.log(`- ${reason}`);
  }
  console.log("Tradeoffs:");
  for (const tradeoff of recommendation.tradeoffs) {
    console.log(`- ${tradeoff}`);
  }
  console.log(`Confidence: ${recommendation.confidence}`);
}
