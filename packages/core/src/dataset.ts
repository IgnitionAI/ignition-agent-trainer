import type { Dataset, DatasetItem } from "./types";

export function createDataset(items: DatasetItem[]): Dataset;
export function createDataset(input: Dataset): Dataset;
export function createDataset(input: Dataset | DatasetItem[]): Dataset {
  const dataset = Array.isArray(input) ? { name: "dataset", items: input } : input;

  if (!dataset.name.trim()) {
    throw new Error("Dataset name is required.");
  }

  const seen = new Set<string>();
  for (const item of dataset.items) {
    assertDatasetItem(item);
    if (seen.has(item.id)) {
      throw new Error(`Duplicate dataset item id: ${item.id}`);
    }
    seen.add(item.id);
  }

  return dataset;
}

export function assertDatasetItem(item: DatasetItem): void {
  if (!item.id.trim()) {
    throw new Error("Dataset item id is required.");
  }
  if (!item.input.trim()) {
    throw new Error(`Dataset item ${item.id} input is required.`);
  }
}
