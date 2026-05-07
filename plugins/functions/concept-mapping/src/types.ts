export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  database: string;
};

export interface Dataset {
  id: string;
  dialect: string;
  schemaName: string;
}
