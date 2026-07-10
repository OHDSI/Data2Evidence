import type { MriBookmark } from "./mriQuery";

export interface MriMaterializationQuery {
  cohortDefinition: {
    cards: MriBookmark["filter"]["cards"];
    configData: {
      configId: string;
      configVersion: string;
    };
    guarded: true;
    axes: [];
  };
  datasetId: string;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Cannot build MRI materialization query: ${fieldName} is required`);
  }
  return value;
}

/** Build the stable MRI request used to materialize a Wizard bookmark. */
export function buildMriMaterializationQuery(bookmark: MriBookmark, activeDatasetId: string): MriMaterializationQuery {
  const datasetId = requireNonEmptyString(activeDatasetId, "datasetId");
  const bookmarkDatasetId = requireNonEmptyString(bookmark?.datasetId, "bookmark datasetId");
  if (bookmarkDatasetId !== datasetId) {
    throw new Error("Cannot build MRI materialization query: bookmark dataset does not match the active dataset");
  }
  const configId = requireNonEmptyString(bookmark?.filter?.configMetadata?.id, "configId");
  const configVersion = requireNonEmptyString(bookmark?.filter?.configMetadata?.version, "configVersion");

  if (
    bookmark?.filter?.cards === null ||
    typeof bookmark?.filter?.cards !== "object" ||
    Array.isArray(bookmark.filter.cards)
  ) {
    throw new Error("Cannot build MRI materialization query: filter cards are required");
  }

  return {
    cohortDefinition: {
      cards: bookmark.filter.cards,
      configData: { configId, configVersion },
      guarded: true,
      axes: [],
    },
    datasetId,
  };
}
