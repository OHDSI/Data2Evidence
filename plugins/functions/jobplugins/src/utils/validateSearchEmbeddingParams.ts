export interface DerivedSearchEmbeddingParams {
  databaseCode?: string;
  schemaName?: string;
}

/**
 * Validates that the params derived server-side from a dataset are present.
 * Dialect-agnostic: applies equally to postgres and HANA datasets.
 * Returns an error message when a required param is missing/blank, otherwise null.
 */
export function getMissingDerivedParamError(
  params: DerivedSearchEmbeddingParams,
): string | null {
  if (!params.databaseCode || params.databaseCode.trim() === "") {
    return "databaseCode could not be derived from the dataset";
  }
  if (!params.schemaName || params.schemaName.trim() === "") {
    return "schemaName could not be derived from the dataset";
  }
  return null;
}
