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

const getPortalDataset = async (
  datasetId: string,
  token: string,
): Promise<Dataset> => {
  const portalAPI = new PortalAPI(token);
  const dataset = await portalAPI.getDatasetById(datasetId);

  if (!dataset) {
    throw new Error(`Dataset with id ${datasetId} does not exist!`);
  }

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

export const checkFhirServerHealth = async (
  token: string,
): Promise<IFhirHealthCheckAPI> => {
  const fhirServerAPI = new FhirServerAPI(token);
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
      `FHIR dataset with id ${datasetPayload.id} already exists!`,
    );
  }
  const portalDataset = await getPortalDataset(datasetPayload.id, token);

  const isExistingPortalDataset =
    portalDataset.id === datasetPayload.id &&
    portalDataset.tokenStudyCode === datasetPayload.name;

  if (isExistingPortalDataset && portalDataset.fhir_project_id) {
    throw new Error(
      `Portal dataset with id ${datasetPayload.id} is already linked to a FHIR dataset!`,
    );
  }

  // Todo: Verify if incoming request has authorization to create the FHIR dataset
  const result = await fhirServerAPI.createFhirDataset(datasetPayload);

  if (isExistingPortalDataset) {
    // Update portal dataset to link with the created FHIR dataset
    portalDataset.fhir_project_id = result.id;

    try {
      const portalAPI = new PortalAPI(token);
      await portalAPI.updateDataset(portalDataset);
    } catch (updateError: any) {
      // Delete FHIR dataset if portal update fails
      console.error(
        `Failed to link portal dataset ${datasetPayload.id} to FHIR dataset ${result.id}. Rolling back FHIR dataset creation.`,
        updateError,
      );
      try {
        await fhirServerAPI.deleteFhirDataset(result.id);
      } catch (rollbackError: any) {
        console.error(
          `Rollback failed: could not delete FHIR dataset ${result.id}. Manual cleanup required.`,
          rollbackError,
        );
      }
      throw new Error(
        `Failed to link portal dataset to FHIR dataset: ${updateError.message}`,
      );
    }
  }

  return result;
};

export const deleteFhirDataset = async (
  datasetId: string,
  token: string,
): Promise<void> => {
  // Todo: Check if this logic is needed because portal dataset might be deleted first
  const datasetExists = await checkDatasetExists(datasetId, token);
  if (!datasetExists) {
    throw new Error(`Dataset with id ${datasetId} does not exist!`);
  }

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id ${datasetId} does not exist!`);
  }

  // Todo: Verify if incoming request has authorization to delete the FHIR dataset

  await fhirServerAPI.deleteFhirDataset(datasetId);
};

export const ingestBundle = async (
  datasetId: string,
  bundle: any,
  token: string,
): Promise<IFhirApiResponse<Record<string, unknown>>> => {
  const datasetExists = await checkDatasetExists(datasetId, token);
  if (!datasetExists) {
    throw new Error(`Dataset with id ${datasetId} does not exist!`);
  }

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id ${datasetId} does not exist!`);
  }

  //   const allowedBundleTypes = Object.values(FhirBundleType);
  //   if (!allowedBundleTypes.includes(bundle.type as FhirBundleType)) {
  //     throw new Error(
  //       `FHIR Bundle type must be one of: ${allowedBundleTypes.join(", ")}`,
  //     );
  //   }

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
  const datasetExists = await checkDatasetExists(datasetId, token);
  if (!datasetExists) {
    throw new Error(`Dataset with id ${datasetId} does not exist!`);
  }

  const fhirServerAPI = new FhirServerAPI(token);

  const fhirDatasetExists = await checkFhirDatasetExists(
    datasetId,
    fhirServerAPI,
  );

  if (!fhirDatasetExists) {
    throw new Error(`FHIR dataset with id ${datasetId} does not exist!`);
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
