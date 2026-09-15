interface SchemaParams {
  schema: string;
  vocabSchema: string;
  resultsSchema: string;
  sourceCatalog?: string;
}

export function sourceCatalogForDataset(dataset: {
  type?: string;
  dialect?: string;
  databaseCode: string;
}): string | undefined {
  // Trex attaches Postgres sources using the database code, not the cache ID.
  return dataset.type === "webapi" && dataset.dialect === "postgres"
    ? `${dataset.databaseCode}__srcdb`
    : undefined;
}

function isValidIdentifier(value: string): boolean {
  return typeof value === "string" &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) && value.length <= 128;
}

export function expandSchemaPlaceholders(sql: string, params: SchemaParams): string {
  if (!isValidIdentifier(params.schema)) throw new Error("Invalid schema name");
  if (params.vocabSchema && !isValidIdentifier(params.vocabSchema)) {
    throw new Error("Invalid vocab schema name");
  }
  if (params.resultsSchema && !isValidIdentifier(params.resultsSchema)) {
    throw new Error("Invalid results schema name");
  }
  if (params.sourceCatalog !== undefined && !isValidIdentifier(params.sourceCatalog)) {
    throw new Error("Invalid source catalog name");
  }
  // WebAPI results live in Postgres; CDM and vocabulary tables remain cached.
  const resultsSchema = params.resultsSchema && params.sourceCatalog
    ? `${params.sourceCatalog}.${params.resultsSchema}`
    : params.resultsSchema || "";
  return sql
    .replace(/\{\{SCHEMA\}\}/g, params.schema)
    .replace(/\{\{VOCAB_SCHEMA\}\}/g, params.vocabSchema || "")
    .replace(/\{\{RESULTS_SCHEMA\}\}/g, resultsSchema);
}
