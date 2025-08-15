import { NodeProps } from "reactflow";
interface ScanDataColumn {
  column_name: string;
  column_type: string;
}

export interface ScanDataSourceTable {
  column_list: ScanDataColumn[];
  table_name: string;
}

export interface ScanDataDBConnectionForm {
  data_type: string;
  server: string;
  port: number;
  user_name: string;
  httppath?: string;
  password: string;
  database: string;
  schema: string;
}

export interface ColumnSchemaState {
  column_name: string;
  column_type: string;
  is_column_nullable?: string;
}

export interface TableSchemaState {
  table_name: string;
  column_list: ColumnSchemaState[];
}

export interface TableSourceHandleData {
  label: string;
  type: "input";
}

export type TableSourceState = NodeProps<TableSourceHandleData>;

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

// TODO: define testconnection response and other responses
