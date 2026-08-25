export type SourceKind = "node" | "csv";

export interface SourceNodeDTO {
  name: string;
  type: string;
  description: string;
  map?: { [key: string]: string[] }; // py2table_node output structure
  result?: string; // sql_node last run result (stringified JSON)
}

export interface SourceData {
  type: SourceKind;
  name?: string; // CSV file name; carried through to csvData.name (source vocabulary id)
  size?: number; // CSV file size in bytes; persisted so the upload card shows it on reopen
  columns: string[];
  rows?: Array<Record<string, any>>;
  nodeMeta?: { name: string; type: string; description: string };
}

export interface WizardState {
  currentStep: number; // 0 | 1 | 2
  sourceType: SourceKind | null;
  sourceData: SourceData | null;
  datasetId: string | null;
  loadRecommendationByDefault: boolean;
  // Becomes true the first time the user advances from Step 1 to Step 2. Once true, the
  // Step 1 dataset selection is locked (read-only) since mapping work now depends on it.
  mappingStarted: boolean;
}
