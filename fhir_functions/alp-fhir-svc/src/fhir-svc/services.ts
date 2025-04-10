import { v4 as uuidv4 } from "npm:uuid";
import { FhirAPI } from "../api/FhirAPI";
import { PortalAPI } from "../api/PortalAPI";
import {
  Dataset,
  ClientCredentials,
  HTTPMethod,
  Headers,
} from "../utils/types";

// Todo: Remove as part of bots and subscriptions
// import {
//   getCachedbDbConnections,
//   getClientCredentialsToken,
// } from "../utils/dbUtils";
// import {
//   getFhirJsonSchema,
//   ingestResourceInFhir,
// } from "../utils/fhirDataModelUtil";
// import { Bundle } from "@medplum/fhirtypes";
// import { env } from "../env";

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
    //features: ["bots"], //Todo: Remove bots code
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
  // Todo: remove subscription code
  // await createSubscriptionInFhirServer(fhirApi, clientId, projectId);
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

  //Get dataset information
  const datasetId = await getDatasetId(token, projectName);

  if(datasetId == null){
    throw new Error(`No dataset id found for project '${projectName}'`);
  }
  // Get client ID and secret for project
  const projClientCredentials = await getClientCredentials(
    fhirApi,
    projectName
  );

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

// export const createResourceInProject = async (
//   token: string,
//   fhirResouce: string,
//   resourceDetails: any,
//   projectName: string
// ) => {
//   try {
//     let fhirApi = new FhirAPI();
//     let datasetId = "",
//       clientId = "",
//       clientSecret = "";
//     await fhirApi.clientCredentialsLogin();
//     const searchResult = await fhirApi.getOneResource(
//       "ClientApplication",
//       `name=${projectName}`
//     );
//     const errorMsg = `Client application with project name '${projectName}' not found!`;
//     if (searchResult) {
//       clientId = searchResult.id;
//       clientSecret = searchResult.secret;
//     } else {
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }

//     // Todo: Remove subscription code
//     // let getSubscription = await fhirApi.getOneResource(
//     //   "Subscription",
//     //   `criteria=${fhirResouce}&author=ClientApplication/${clientId}`
//     // );
//     // Update Subscription resource with Authorization header
//     // getSubscription.channel.header = [`Authorization: ${token}`];
//     // await fhirApi.updateResource(getSubscription);

//     // Get datasets
//     const portalAPI = new PortalAPI(token);
//     const datasets: Dataset[] = await portalAPI.getDatasets();

//     const resourceDataset = datasets.filter((dataset) => {
//       if (dataset.studyDetail.name == projectName) return dataset;
//     });

//     // Get dataset Id of incoming resource
//     if (resourceDataset.length > 0) {
//       datasetId = resourceDataset[0].id;
//     } else {
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }

//     // Set datasetId in the metadata of the resource
//     const metaInfo = {
//       author: {
//         reference: "ClientApplication/" + clientId,
//       },
//       id: datasetId,
//     };
//     resourceDetails.meta = metaInfo;
//     await fhirApi.clientCredentialsLogin(clientId, clientSecret);
//     const response = await fhirApi.post(fhirResouce, resourceDetails);
//     return {
//       resourceType: fhirResouce,
//       projectName: projectName,
//       datasetId: datasetId,
//       resourceId: response.id,
//     };
//   } catch (error) {
//     console.error(JSON.stringify(error));
//     throw new Error(
//       `Failed to create resource '${fhirResouce}' for project '${projectName}' - ${error.message}`
//     );
//   }
// };

// Todo: remove as part of bot and subscriptions code
// export const ingestResourceInCacheDB = async (fhirResouce: string) => {
//   console.info(`Received request to ingest resources in CacheDb`);
//   let bundle: Bundle = fhirResouce;
//   if (bundle.entry === undefined) {
//     console.info("No entries in the bundle");
//     return;
//   }
//   console.info(`Incoming DatasetId: ${bundle.meta.id}`);
//   let token = await getClientCredentialsToken();
//   //Get dataset details to connect to cachedb
//   let portalApi = new PortalAPI(token);
//   let datasetDetails = await portalApi.getDatasetById(bundle.meta.id);
//   //Connect to cachedb of the incoming dataset
//   let conn = await getCachedbDbConnections(
//     token,
//     datasetDetails.databaseCode,
//     datasetDetails.schemaName,
//     datasetDetails.vocabSchemaName
//   );
//   try {
//     //Get fhir.schema.json
//     const jsonSchema = await getFhirJsonSchema(conn);
//     let results: any = [];
//     console.info("Create resource for each of the entry in the bundle");
//     for (const entry of bundle.entry) {
//       let result = await ingestResourceInFhir(
//         conn,
//         datasetDetails.schemaName,
//         jsonSchema,
//         entry.resource,
//         entry.request
//       );
//       if (result !== true) results.push(result);
//     }
//     return results;
//   } catch (err) {
//     console.error(`Error ingesting resource: ${err}`);
//     throw err;
//   } finally {
//     conn.close();
//   }
// };

// Todo: Remove subscription code
//Create subscription for each dataset to trigger endpoint
// export async function createSubscriptionInFhirServer(
//   fhirApi: FhirAPI,
//   clientId: string,
//   projectId: string
// ) {
//   //Get all subscription thats configured for Super Admin - db6b2304-f236-45ec-b10c-a852681e7129
//   let superAdminClientId = env.FHIR__CLIENT_ID;
//   let getSubscriptions = await fhirApi.searchResource(
//     "Subscription",
//     `author=ClientApplication/${superAdminClientId}`
//   );
//   if (getSubscriptions && getSubscriptions.entry.length > 0) {
//     for (const item of getSubscriptions.entry) {
//       let endpoint = item.resource.channel.endpoint;
//       let criteria = item.resource.criteria;
//       const subscriptionDetails = {
//         resourceType: "Subscription",
//         status: "active",
//         reason: `Rest hook subscription for ${criteria}`,
//         channel: {
//           type: "rest-hook",
//           endpoint: `${endpoint}`,
//         },
//         criteria: `${criteria}`,
//         meta: {
//           author: {
//             reference: `ClientApplication/${clientId}`,
//             display: "d2eClient",
//           },
//           project: `${projectId}`,
//           compartment: [
//             {
//               reference: `Project/${projectId}`,
//             },
//           ],
//         },
//       };
//       console.info(subscriptionDetails);
//       await fhirApi.post("Subscription", subscriptionDetails);
//     }
//   } else {
//     console.info("No bots configured for project");
//   }
//   return true;
// }

//Need the following for testing
//Test
// export async function getResource(fhirResource: string, datasetId: string){
//     let token = await getClientCredentialsToken()
//     //Get dataset details to connect to cachedb
//     let portalApi = new PortalAPI(token)
//     let datasetDetails = await portalApi.getDatasetById(datasetId)
//     //Connect to cachedb of the incoming dataset
//     let conn = await getCachedbDbConnections(token, datasetDetails.databaseCode, datasetDetails.schemaName, datasetDetails.vocabSchemaName)
//     return await getFhirData(conn, fhirResource)
// }

// //Test
// export const updateResource = async(clientId, projectId, botId) => {
//     let fhirAPi = new FhirAPI()
//     let getSubscription = await fhirAPi.getOneResource('Subscription', `criteria=Bundle&author=ClientApplication/${clientId}`)
//     getSubscription.channel.endpoint = `Bot/${botId}`
//     // const subscriptionDetails = {
//     //     "resourceType": "Subscription",
//     //     "status": "active",
//     //     "reason": "Rest hook subscription for Bundle",
//     //     "channel": {
//     //       "type": "rest-hook",
//     //       "endpoint": `Bot/${botId}`
//     //     },
//     //     "criteria": "Bundle",
//     //     "meta": {
//     //       "author": {
//     //         "reference": `ClientApplication/${clientId}`,
//     //         "display": "d2eClient"
//     //       },
//     //       "project": `${projectId}`,
//     //       "compartment": [
//     //         {
//     //           "reference": `Project/${projectId}`
//     //         }
//     //       ]
//     //     }
//     // }
//     return await fhirAPi.updateResource(getSubscription)
// }
