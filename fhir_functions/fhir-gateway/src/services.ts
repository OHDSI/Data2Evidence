import { FhirServerAPI } from "./api/FhirServerAPI";
import { FhirServerPublicAPI } from "./api/FhirServerPublicAPI";
import { PortalAPI } from "./api/PortalAPI";
import {
  IFhirApiResponse,
  IFhirCreatedDataset,
  ICreateFhirDatasetDto,
  Dataset,
  HTTPMethod,
  Headers,
  filterHeaders,
  IFhirDatasets,
  FhirBundleType,
  IFhirHealthCheckAPI,
} from "./types";

const checkDatasetExists = async (
  datasetId: string,
  token: string,
): Promise<boolean> => {
  const portalAPI = new PortalAPI(token);
  const datasets: Dataset[] = await portalAPI.getDatasets();

  // Todo: Verify if fhir dataset can be created for a source dataset or cache dataset
  return datasets.some((item) => item.id === datasetId);
};

const isExistingPortalDataset = async (
  datasetId: string,
  fhirProjectId?: string,
): Promise<boolean> => {
  return fhirProjectId === `fhir-${datasetId}`;
};

const stripFhirPrefix = (datasetId: string): string => {
  return datasetId.startsWith("fhir-")
    ? datasetId.slice("fhir-".length)
    : datasetId;
};

const getPortalDataset = async (
  datasetId: string,
  token: string,
): Promise<Dataset> => {
  const portalAPI = new PortalAPI(token);
  const dataset = await portalAPI.getDatasetById(datasetId);
  return dataset;
};

const checkFhirDatasetExists = async (
  datasetId: string,
  fhirAPI: FhirServerAPI,
): Promise<boolean> => {
  try {
    const fhirDatasets = await fhirAPI.getFhirDatasets();
    return Array.isArray(fhirDatasets)
      ? fhirDatasets.some((item) => item.id === datasetId)
      : false;
  } catch (error: any) {
    console.error("Error checking FHIR dataset existence", error);
    throw error;
  }
};

export const checkFhirServerHealth = async (): Promise<IFhirHealthCheckAPI> => {
  const fhirServerAPI = new FhirServerPublicAPI();
  return await fhirServerAPI.healthCheck();
};

export const getFhirDatasets = async (
  token: string,
): Promise<IFhirDatasets[]> => {
  const fhirServerAPI = new FhirServerAPI(token);
  return await fhirServerAPI.getFhirDatasets();
};

export const createFhirDataset = async (
  datasetPayload: ICreateFhirDatasetDto,
  token: string,
): Promise<IFhirCreatedDataset> => {
  const fhirServerAPI = new FhirServerAPI(token);
  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetPayload.id,
    fhirServerAPI,
  );
  if (fhirDatasetExists) {
    throw new Error(
      `FHIR dataset with id '${datasetPayload.id}' already exists!`,
    );
  }

  const datasetId = stripFhirPrefix(datasetPayload.id);

  const existingDataset = await checkDatasetExists(datasetId, token);

  if (existingDataset) {
    const portalDataset = await getPortalDataset(datasetId, token);

    if (portalDataset.fhirDatasetId) {
      throw new Error(
        `Portal dataset with id '${datasetId}' is already linked to a FHIR dataset!`,
      );
    }
  }

  // Todo: Verify if incoming request has authorization to create the FHIR dataset
  const result = await fhirServerAPI.createFhirDataset(datasetPayload);

  console.log(`Created FHIR dataset successfully`);

  return result;
};

export const deleteFhirDataset = async (
  datasetId: string,
  token: string,
): Promise<void> => {
  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id '${datasetId}' does not exist!`);
  }

  // Todo: Verify if incoming request has authorization to delete the FHIR dataset

  const result = await fhirServerAPI.deleteFhirDataset(datasetId);
  return result;
};

export const ingestBundle = async (
  datasetId: string,
  bundle: any,
  token: string,
): Promise<IFhirApiResponse<Record<string, unknown>>> => {
  const portalDatasetId = stripFhirPrefix(datasetId);

  const datasetExists = await checkDatasetExists(portalDatasetId, token);

  if (!datasetExists) {
    throw new Error(
      `Portal dataset with id '${portalDatasetId}' does not exist!`,
    );
  }

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id '${datasetId}' does not exist!`);
  }

  // Todo: Verify if incoming request has authorization to create the ingest into dataset

  return await fhirServerAPI.postBundle(datasetId, bundle);
};

export const forwardFhirRequest = async (
  datasetId: string,
  method: string,
  resourcePath: string,
  queryParams: any,
  body: any,
  incomingHeaders: Headers,
  token: string,
): Promise<IFhirApiResponse<Record<string, unknown>>> => {
  const portalDatasetId = stripFhirPrefix(datasetId);

  const datasetExists = await checkDatasetExists(portalDatasetId, token);
  if (!datasetExists) {
    throw new Error(
      `Portal dataset with id '${portalDatasetId}' does not exist!`,
    );
  }

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id '${datasetId}' does not exist!`);
  }

  const normalizedMethod = method.toUpperCase();
  const httpMethod = HTTPMethod[normalizedMethod as keyof typeof HTTPMethod];

  // Todo: Check for other unsupported fhir resources
  const resourceType = resourcePath ? resourcePath.split("/")[0] : "";
  const isBinaryReq = resourceType === "Binary";
  if (isBinaryReq) {
    throw new Error("Binary resource type is not supported in this endpoint.");
  }

  const headers = incomingHeaders
    ? filterHeaders(incomingHeaders, isBinaryReq, httpMethod)
    : {};

  return await fhirServerAPI.forwardRequest(
    datasetId,
    httpMethod,
    resourcePath,
    queryParams,
    body,
    headers,
  );
};
