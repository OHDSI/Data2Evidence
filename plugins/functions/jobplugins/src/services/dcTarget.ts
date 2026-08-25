// Decides where a DC run executes and which results schema it writes to.
// webapi-typed datasets on a direct-connectable source dialect run on the
// SOURCE database and write into the dataset's registered resultsSchemaName —
// verbatim, because Atlas reads Achilles results from the WebAPI Results
// daimon schema and the name must byte-match the registered tableQualifier.
const SOURCE_DIALECTS = new Set(["postgres", "bigquery"]);

export interface DcTargetDataset {
  id: string;
  type?: string;
  dialect?: string;
  resultsSchemaName?: string;
}

export function resolveDcTarget(
  dataset: DcTargetDataset,
  _overrideResultsSchema: string | undefined,
): { useSourceConnection: boolean; resultsSchema: string | null } {
  const gated = dataset.type === "webapi" &&
    SOURCE_DIALECTS.has(dataset.dialect?.toLowerCase() ?? "");
  if (!gated) {
    return { useSourceConnection: false, resultsSchema: null };
  }
  if (!dataset.resultsSchemaName) {
    // A misconfigured dataset is a client error, not a server fault. Tag the
    // error with statusCode so the controller answers 400 — the same convention
    // DataTransformation/StrategusResults already use in this service.
    const error = new Error(
      `webapi dataset ${dataset.id} has no results schema configured`,
    ) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  // The DTO override is deliberately ignored for webapi datasets.
  return { useSourceConnection: true, resultsSchema: dataset.resultsSchemaName };
}
