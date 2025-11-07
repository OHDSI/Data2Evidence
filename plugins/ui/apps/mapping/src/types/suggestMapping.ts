export interface ISuggestResponse {
  data: ISuggestMapping[];
}

export interface ISuggestMapping {
  source_table: string;
  OMOP_table: string;
  columns_mapping: Record<string, string | -1>;
}
