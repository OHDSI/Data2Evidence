export interface TestConnectionResultResponse {
  canConnect: boolean;
  message: string;
  tableNames?: string[];
}
