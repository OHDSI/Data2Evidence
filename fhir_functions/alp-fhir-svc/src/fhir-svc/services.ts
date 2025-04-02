import { v4 as uuidv4 } from "uuid";
import { FhirAPI } from "../api/FhirAPI";
import { PortalAPI } from "../api/PortalAPI";
import {
  Dataset,
  ClientCredentials,
  HTTPMethod,
  Headers,
} from "../utils/types";

const getDatasetId = async (
  token: string,
  studyCode: string
): Promise<string> => {
  // Get datasets from portal
  const portalAPI = new PortalAPI(token);
  const datasets: Dataset[] = await portalAPI.getDatasets();

  const dataset = datasets.find((item) => item.tokenStudyCode === studyCode);

  const datasetId = dataset ? dataset.id : null;

  if (datasetId === null) {
    throw new Error(`No dataset id found for study code '${studyCode}'!`);
  }
  return datasetId;
};

const checkProjectNameExists = async (
  fhirApi: FhirAPI,
  studyCode: string
): Promise<boolean> => {
  // check project with same name already exists
  const existingProject = await fhirApi.getOneResource(
    "Project",
    `name=${studyCode}`
  );

  if (existingProject !== undefined) {
    return true;
  } else {
    return false;
  }
};

const getClientCredentials = async (
  fhirApi: FhirAPI,
  projectName: string
): Promise<ClientCredentials> => {
  const searchResult = await fhirApi.getOneResource(
    "ClientApplication",
    `name=${projectName}`
  );

  if (searchResult) {
    return {
      clientId: searchResult.id,
      clientSecret: searchResult.secret,
    };
  } else {
    throw new Error(
      `Client application with project name '${projectName}' not found!`
    );
  }
};

export const createProject = async (name: string, description: string) => {
  console.info(`Creating a fhir project for the dataset '${name}'..`);
  let fhirApi = new FhirAPI();
  await fhirApi.clientCredentialsLogin();

  // check if project with same name already exists
  const projectExists = await checkProjectNameExists(fhirApi, name);
  if (projectExists === true) {
    throw new Error(`Project with name '${name}' already exists!`);
  }

  const projectDetails = {
    resourceType: "Project",
    name: name,
    strictMode: true, // whether this project uses strict FHIR validation
    description: description,
  };
  const projectResult = await fhirApi.post("Project", projectDetails);
  const projectId = projectResult.id;

  console.info(`Creating a client application for project '${name}'..`);
  const clientSecret = uuidv4();
  const clientApplicationDetails = {
    resourceType: "ClientApplication",
    name: name,
    description: description,
    meta: {
      project: projectId,
      compartment: [
        {
          reference: `Project/${projectId}`,
        },
      ],
    },
    secret: clientSecret,
  };
  const clientApplicationResult = await fhirApi.post(
    "ClientApplication",
    clientApplicationDetails
  );
  const clientId = clientApplicationResult.id;

  console.info(`Creating project membership for project ${name}..`);
  const projectMembershipDetails = {
    resourceType: "ProjectMembership",
    project: {
      reference: `Project/${projectId}`,
    },
    meta: {
      project: projectId,
      compartment: [
        {
          reference: `Project/${projectId}`,
        },
      ],
    },
    user: {
      reference: `ClientApplication/${clientId}`,
      display: name,
    },
    profile: {
      reference: `ClientApplication/${clientId}`,
      display: name,
    },
  };
  await fhirApi.post("ProjectMembership", projectMembershipDetails);
  return {
    projectName: name,
    projectId: projectId,
  };
};

export const forwardRequest = async (
  token: string,
  httpMethod: HTTPMethod,
  projectName: string,
  resourcePath: string,
  queryParams: any,
  body: any,
  fhirHeaders: Headers
) => {
  let fhirApi = new FhirAPI();

  // authenticate with superadmin credentials
  await fhirApi.clientCredentialsLogin();

  // Check project exists which has unique studyCode
  const projectExists = await checkProjectNameExists(fhirApi, projectName);

  if (projectExists === false) {
    throw new Error(`Project '${projectName}' does not exist in fhir server!`);
  }

  // Get client ID and secret for project
  const projClientCredentials = await getClientCredentials(
    fhirApi,
    projectName
  );

  const datasetId = await getDatasetId(token, projectName);

  // Add dataset metadata to req body
  let resourceDetails = body;
  const metaInfo = {
    author: {
      reference: `ClientApplication/${projClientCredentials.clientId}`,
    },
    id: datasetId,
  };
  resourceDetails.meta = metaInfo;

  return await fhirApi.forwardRequest(
    resourcePath,
    projClientCredentials,
    httpMethod,
    queryParams,
    resourceDetails,
    fhirHeaders
  );
};