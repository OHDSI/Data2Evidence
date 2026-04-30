export type ViewerCode = {
  datasetId: string;
  code: string;
  type: string;
  name: string;
  language?: string;
};

export type ViewerCodeQuery = {
  datasetId: string;
  type: string;
  name: string;
  queryName: string;
  sql: string;
};

export type ViewerCodeWithQueries = {
  datasetId: string;
  name: string;
  code: string;
  type: string;
  queries: {
    name: string;
    queryName: string;
    sql: string;
  }[];
};
