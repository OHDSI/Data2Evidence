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
): Promise<string|null> => {
  // Get datasets from portal
  const portalAPI = new PortalAPI(token);
  const datasets: Dataset[] = await portalAPI.getDatasets();

  const dataset = datasets.find((item) => item.tokenStudyCode === studyCode);

  const datasetId = dataset ? dataset.id : null;

  return datasetId;
};

const checkProjectNameExists = async (
  fhirApi: FhirAPI,
  projectName: string
): Promise<boolean> => {
  // check project with same name already exists
  const existingProject = await fhirApi.getOneResource(
    "Project",
    `name=${projectName}`
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

export const createProject = async (token: string, id: string, description: string) => {
  console.info(`Creating a fhir project for the dataset '${id}'..`);
  let fhirApi = new FhirAPI();
  await fhirApi.clientCredentialsLogin();

  // check if project with same id already exists
  const projectExists = await checkProjectNameExists(fhirApi, id);
  if (projectExists === true) {
    throw new Error(`Project with id '${id}' already exists!`);
  }

  const projectDetails = {
    resourceType: "Project",
    name: id,
    strictMode: true, // whether this project uses strict FHIR validation
    description: description,
  };
  const projectResult = await fhirApi.post("Project", projectDetails);
  const projectId = projectResult.id;

  console.info(`Creating a client application for project '${id}'..`);
  const clientSecret = uuidv4();
  const clientApplicationDetails = {
    resourceType: "ClientApplication",
    name: id,
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

  console.info(`Creating project membership for project ${id}..`);
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
      display: id,
    },
    profile: {
      reference: `ClientApplication/${clientId}`,
      display: id,
    },
  };
  await fhirApi.post("ProjectMembership", projectMembershipDetails);

  //Update dataset information
  const portalAPI = new PortalAPI(token);
  const dataset: Dataset = await portalAPI.getDatasetById(id);
  dataset.fhir_project_id = projectId
  await portalAPI.updateDataset(dataset)
  return true
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

  //Authenticate with superadmin credentials
  await fhirApi.clientCredentialsLogin();

  //Get datasetId for incoming token study code
  const datasetId = await getDatasetId(token, projectName);
  if(datasetId == null){
    throw new Error(`No dataset id found for project '${projectName}'`);
  }
  //DatasetId is the Fhir project name
  projectName = datasetId
  //Check fhir project exists which has unique name
  const projectExists = await checkProjectNameExists(fhirApi, projectName);

  if (projectExists === false) {
    throw new Error(`FHIR Project for dataset '${projectName}' does not exist in fhir server!`);
  }

  //Get client ID and secret for project
  const projClientCredentials = await getClientCredentials(
    fhirApi,
    projectName
  );

  //Add dataset metadata to req body
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