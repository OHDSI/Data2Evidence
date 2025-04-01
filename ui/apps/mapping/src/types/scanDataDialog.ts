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
  dbType: string;
  server: string;
  port: number;
  user: string;
  httppath?: string;
  password: string;
  database: string;
  schema: string;
}
