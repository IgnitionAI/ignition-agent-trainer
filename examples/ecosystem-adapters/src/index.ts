import { dataset, runEcosystemAdapterExperiment, variants } from "./example";

const result = await runEcosystemAdapterExperiment();

console.log(`Experiment: ${result.name}`);
console.log(`Dataset items: ${dataset.items.length}`);
console.log(`Variants: ${variants.map((variant) => variant.name).join(", ")}`);
console.log("");
console.log("Leaderboard:");
for (const [index, row] of result.leaderboard.entries()) {
  console.log(
    `${index + 1}. ${row.name} - ${row.score.toFixed(2)} (${row.averageLatencyMs?.toFixed(
      0,
    )}ms avg)`,
  );
}

console.log("");
console.log("Adapter evidence:");
for (const row of result.leaderboard) {
  const firstCase = result.cases.find((caseResult) => caseResult.variantId === row.variantId);
  console.log(
    `- ${row.name}: trace steps ${firstCase?.trace.steps.length ?? 0}, latency ${
      firstCase?.usage?.latencyMs ?? "n/a"
    }ms, metadata framework ${String(firstCase?.metadata?.framework ?? "n/a")}`,
  );
}
