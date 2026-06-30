import type { Dataset, DatasetItem } from "./types";
import { assertDataset } from "./validation";

export function createDataset(items: DatasetItem[]): Dataset;
export function createDataset(input: Dataset): Dataset;
export function createDataset(input: Dataset | DatasetItem[]): Dataset {
  const dataset = Array.isArray(input) ? { name: "dataset", items: input } : input;

  assertDataset(dataset);

  return dataset;
}
