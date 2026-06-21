import type { Dataset, DatasetItem } from "./types";

export function createDataset(input: Dataset): Dataset {
  if (!input.name.trim()) {
    throw new Error("Dataset name is required.");
  }

  const seen = new Set<string>();
  for (const item of input.items) {
    assertDatasetItem(item);
    if (seen.has(item.id)) {
      throw new Error(`Duplicate dataset item id: ${item.id}`);
    }
    seen.add(item.id);
  }

  return input;
}

export function assertDatasetItem(item: DatasetItem): void {
  if (!item.id.trim()) {
    throw new Error("Dataset item id is required.");
  }
  if (!item.input.trim()) {
    throw new Error(`Dataset item ${item.id} input is required.`);
  }
}
