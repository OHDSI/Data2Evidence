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
}
