export interface ScannedSchemaState {
  etl_mapping: {
    id: number;
    scan_report_id: number;
    scan_report_name: string;
    source_schema_name: string;
    cdm_version: string;
    username: string;
  };
  source_tables: TableSchemaState[];
}

export interface TableSchemaState {
  table_name: string;
  column_list: ColumnSchemaState[];
}

export interface ColumnSchemaState {
  column_name: string;
  column_type: string;
  is_column_nullable?: string;
}
