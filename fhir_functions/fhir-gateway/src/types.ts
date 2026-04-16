export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

export enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

export enum FhirBundleType {
  TRANSACTION = "transaction",
  BATCH = "batch",
}

export interface Dataset {
  databaseName: string;
  databaseCode: string;
  id: string;
  dialect: string;
  schemaName: string;
  vocabSchemaName: string;
  dataModel: string;
  plugin: string;
  attributes: string[];
  tags: string[];
  fhirDatasetId?: string;
  dashboards: string[];
  tenant: {
    id: string;
    name: string;
    system: string;
  };
  tokenStudyCode: string;
  studyDetail: {
    name: string;
    id?: string;
    description?: string;
    summary?: string;
    showRequestAccess: boolean;
  };
}

export type Headers = { [key: string]: string | string[] };

export const filterHeaders = (
  incomingHeaders: Headers,
  isBinaryReq: boolean,
  httpMethod: HTTPMethod,
): Headers => {
  let filteredHeaders: Headers = { ...incomingHeaders };

  // Non-exhaustive
  let headersToExclude = [
    "host",
    "accept",
    "authorization",
    "user-agent",
    "connection",
    "content-length",
    "accept-encoding",
    "transfer-encoding",
    "cache-control",
    "content-type",
    "upgrade-insecure-requests",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-source-origin",
    "postman-token",
  ];

  const originalContentType = filteredHeaders["content-type"];

  headersToExclude.forEach((header: string) => {
    delete filteredHeaders[header];
  });

  if (
    (isBinaryReq === true && httpMethod === HTTPMethod.POST) ||
    (isBinaryReq === true && httpMethod === HTTPMethod.GET)
  ) {
    filteredHeaders["Content-Type"] = originalContentType;
  } else {
    filteredHeaders["Content-Type"] = "application/json";
  }

  return filteredHeaders;
};

export interface ICreateFhirDatasetDto {
  id: string;
  name: string;
}

export interface IFhirDatasets {
  created_at: string | null;
  id: string;
  name: string;
  resource_types: Record<string, unknown>[] | null;
  status: string;
}

export interface IFhirCreatedDataset {
  id: string;
  name: string;
  resource_count: number;
  resource_types: string[];
  status: string;
}

export interface IFhirApiResponse<T> {
  status: number;
  data: T;
}

export interface IFhirHealthCheckAPI {
  connected: boolean;
  healthy: boolean;
}
