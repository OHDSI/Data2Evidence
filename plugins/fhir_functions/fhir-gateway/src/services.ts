import { get } from "http";
import { FhirServerAPI } from "./api/FhirServerAPI";

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
} from "./types.ts";

const getPortalDataset = async (
  portalDatasetId: string,
  token: string,
): Promise<Dataset | null> => {
  try {
    const portalAPI = new PortalAPI(token);
    return await portalAPI.getDatasetById(portalDatasetId);
  } catch {
    return null;
  }
};

const checkPortalDatasetExists = async (
  portalDatasetId: string,
  token: string,
): Promise<boolean> => {
  return (await getPortalDataset(portalDatasetId, token)) !== null;
};

const getPortalDatasetIdByStudyToken = async (
  studyToken: string,
  token: string,
): Promise<string> => {
  try {
    const portalAPI = new PortalAPI(token);
    const datasets = await portalAPI.getDatasets();
    const dataset = datasets.find((d) => d.tokenStudyCode === studyToken);
    if (!dataset) {
      throw new Error(`No portal dataset found for studyToken '${studyToken}'`);
    }
    return dataset.id;
  } catch (error: any) {
    console.error(
      `Error fetching portal dataset id for studyToken '%s':`,
      studyToken,
      error,
    );
    throw error;
  }
};

const checkFhirDatasetExists = async (
  fhirDatasetId: string,
  fhirAPI: FhirServerAPI,
): Promise<boolean> => {
  try {
    const fhirDatasets = await fhirAPI.getFhirDatasets();
    return Array.isArray(fhirDatasets)
      ? fhirDatasets.some((item) => item.id === fhirDatasetId)
      : false;
  } catch (error: any) {
    console.error(
      "Error checking if FHIR dataset with id '%s' exists",
      fhirDatasetId,
      error,
    );
    throw error;
  }
};

export const checkFhirServerHealth = async (): Promise<IFhirHealthCheckAPI> => {
  const fhirServerAPI = new FhirServerAPI();
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

  const datasetId = datasetPayload.id;

  const portalDataset = await getPortalDataset(datasetId, token);

  if (portalDataset?.fhirDatasetId) {
    throw new Error(
      `Portal dataset with id '${datasetId}' is already linked to a FHIR dataset!`,
    );
  }

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetPayload.id,
    fhirServerAPI,
  );
  if (fhirDatasetExists) {
    throw new Error(
      `FHIR dataset with id '${datasetPayload.id}' already exists!`,
    );
  }

  // Todo: Verify if incoming request has authorization to create the FHIR dataset
  const result = await fhirServerAPI.createFhirDataset(datasetPayload);

  console.log(`Created FHIR dataset with id ${result.id} successfully`);

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
    throw new Error(`FHIR dataset id '${datasetId}' does not exist!`);
  }

  // Todo: Verify if incoming request has authorization to delete the FHIR dataset

  const result = await fhirServerAPI.deleteFhirDataset(datasetId);
  return result;
};

export const ingestBundle = async (
  studyToken: string,
  bundle: any,
  token: string,
): Promise<IFhirApiResponse<Record<string, unknown>>> => {
  const datasetId = await getPortalDatasetIdByStudyToken(studyToken, token);

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
  studyToken: string,
  method: string,
  resourcePath: string,
  queryParams: any,
  body: any,
  incomingHeaders: Headers,
  token: string,
): Promise<IFhirApiResponse<Record<string, unknown>>> => {
  const datasetId = await getPortalDatasetIdByStudyToken(studyToken, token);

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id '${datasetId}' does not exist!`);
  }

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
