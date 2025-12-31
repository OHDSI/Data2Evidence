import { v4 as uuidv4 } from "uuid";
import { FhirAPI } from "../api/FhirAPI";
import { PortalAPI } from "../api/PortalAPI";
import {
  Dataset,
  ClientCredentials,
  HTTPMethod,
  Headers,
} from "../utils/types";
import { createLogger } from "../logger";

const logger = createLogger();

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
  projectName: string,
  adminCredentials: ClientCredentials
): Promise<boolean> => {
  const existingProject = await fhirApi.forwardRequest(
    `Project?name=${projectName}`, adminCredentials, HTTPMethod.GET, '', '');
  return existingProject?.data?.entry && existingProject.data.entry.length > 0 && existingProject.data.entry[0].resource.resourceType === "Project";
};

const getProjectCredentials = async (
  fhirApi: FhirAPI,
  projectName: string,
  adminCredentials: ClientCredentials
): Promise<ClientCredentials> => {
  const searchResult = await fhirApi.forwardRequest(`ClientApplication?name=${projectName}`, adminCredentials, HTTPMethod.GET, '', '');
  if (searchResult?.data) {
    const entry = searchResult.data.entry || [];
    if(entry.length === 0){
        throw new Error(
          `Client application with project name '${projectName}' not found!`
        );
    }else if(entry[0].resource.resourceType === "ClientApplication"){
      return {
        clientId: entry[0].resource.id,
        clientSecret: entry[0].resource.secret,
      };
    }else{
        throw new Error(
          `Client application with project name '${projectName}' not found!`
        );
    }
  } else {
    throw new Error(
      `Client application with project name '${projectName}' not found!`
    );
  }
};

export const createProject = async (token: string, id: string, description: string) => {
  try{
    console.info(`Creating a fhir project for the dataset '${id}'..`);
      let fhirApi = new FhirAPI(token);
      // check if project with same id already exists
      const projectExists = await checkProjectNameExists(fhirApi, id, fhirApi.getAdminCredentials());
      if (projectExists === true) {
        throw new Error(`Project with id '${id}' already exists!`);
      }
      const projectDetails = {
        resourceType: "Project",
        name: id,
        strictMode: true, // whether this project uses strict FHIR validation
        description: description,
      };
      const projectResult = await fhirApi.forwardRequest("Project", fhirApi.getAdminCredentials(), HTTPMethod.POST, '', projectDetails);
      if(projectResult === undefined)
        throw new Error("Error creating fhir project!");
      const projectId = projectResult?.data.id;
      console.log(`Created fhir project with id '${projectId}'`);
      // Create a client application for the project
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
      const clientApplicationResult = await fhirApi.forwardRequest("ClientApplication", fhirApi.getAdminCredentials(), HTTPMethod.POST, '', clientApplicationDetails);
      if(clientApplicationResult === undefined)
        throw new Error("Error creating client application for fhir project!");
      const clientId = clientApplicationResult?.data.id;
      //Create a project membership for the client application
      console.info(`Creating project membership for project ${id}..`);
      const projectMembershipDetails = {
        resourceType: "ProjectMembership",
        project: {
          reference: `Project/${projectId}`,
        },
        "admin": true,
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
      const projectMembershipResult = await fhirApi.forwardRequest("ProjectMembership", fhirApi.getAdminCredentials(), HTTPMethod.POST, '', projectMembershipDetails);
      if(projectMembershipResult?.status !==201)
        throw new Error("Error creating project membership for fhir project!");
      //Update dataset information
      const portalAPI = new PortalAPI(token);
      const dataset: Dataset = await portalAPI.getDatasetById(id);
      if(dataset === undefined)
        throw new Error("Error fetching dataset!");
      dataset.fhir_project_id = projectId
      const updateDatasetResult = await portalAPI.updateDataset(dataset)
      if(updateDatasetResult === undefined)
        throw new Error("Error updating dataset with fhir project id!");
      console.log(`Updated dataset '${id}' with fhir project id '${projectId}'`);
      return true
  }
  catch(error){
    console.error(`Error creating fhir project for dataset '${id}': ${error.message}`);
    throw error;
  }
};

export const deleteProject = async(token, id: string) =>{
  console.info(`Deleting fhir project with dataset Id '${id}'..`);
  let fhirApi = new FhirAPI(token);
  //Delete project and all its related resources
  return await fhirApi.forwardRequest(
    `Project/${id}/$expunge?everything=true`,
    fhirApi.getAdminCredentials(),
    HTTPMethod.POST,
    '',
    ''
  );
}
export const fhirServerHealthCheck = async(token: string) => {
  console.info(`Performing health check on fhir server..`);
  let fhirApi = new FhirAPI(token);
  const healthCheckResponse = await fhirApi.forwardRequest(
    'healthcheck',
    fhirApi.getAdminCredentials(),
    HTTPMethod.GET,
    '',
    ''
  );
  return healthCheckResponse;
}

export const forwardRequest = async (
  token: string,
  httpMethod: HTTPMethod,
  projectName: string,
  resourcePath: string,
  queryParams: any,
  body: any,
  fhirHeaders: Headers
) => {
  // await fhirApi.clientCredentialsLogin();

  //Get datasetId for incoming token study code
  const datasetId = await getDatasetId(token, projectName);
  if(datasetId === null){
    throw new Error(`No dataset id found for project '${projectName}'`);
  }
  //DatasetId is the Fhir project name
  projectName = datasetId;
  
  //Authenticate with superadmin credentials
  let fhirApi = new FhirAPI(token);
  let adminCredentials = fhirApi.getAdminCredentials();

  //Check fhir project exists which has unique name
  const projectExists = await checkProjectNameExists(fhirApi, projectName, adminCredentials);
  if (projectExists !== undefined && projectExists === false) {
    throw new Error(`FHIR Project for dataset '${projectName}' does not exist in fhir server!`);
  }

  //Get client ID and secret for project
  const projClientCredentials = await getProjectCredentials(
    fhirApi,
    projectName,
    adminCredentials
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