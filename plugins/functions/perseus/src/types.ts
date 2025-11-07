export interface UserDefinedLookup {
  id: number;
  name: string;
  username: string;
  source_to_standard: string;
  source_to_source: string;
}

export interface ColumnInfo {
  column_name: string;
  column_type: string;
  is_column_nullable: string;
}

export interface TableSchema {
  table_name: string;
  column_list: ColumnInfo[];
}

export enum LookupType {
  source_to_standard = "source_to_standard",
  source_to_source = "source_to_source",
}
