export interface ScanDataProgressLogs {
  message: string;
  statusCode: number;
  statusName: string;
  percent: number;
}

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
