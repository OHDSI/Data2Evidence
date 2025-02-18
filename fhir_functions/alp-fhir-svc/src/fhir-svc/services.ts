import { createLogger } from '../logger'
import { FhirAPI } from '../api/FhirAPI'
import { v4 as uuidv4 } from 'npm:uuid'
import { PortalAPI } from '../api/PortalAPI'
import { Dataset } from '../utils/types'
import { Bundle } from '@medplum/fhirtypes'
import { getFhirJsonSchema, ingestResourceInFhir } from '../utils/fhirDataModelUtil'
import { getCachedbDbConnections, getClientCredentialsToken } from '../utils/dbUtils'
import { env } from '../env'

const logger = createLogger()

export const createProject = async (name: string, description: string) => {
    try {
        logger.info(`Create fhir project for the dataset`)
        let fhirApi = new FhirAPI()
        await fhirApi.clientCredentialslogin()
        const projectDetails = {
            resourceType: 'Project',
            name: name,
            strictMode: true,
            features: ['bots'],
            description: description
        }
        const projectResult = await fhirApi.post('Project', projectDetails)
        const projectId = projectResult.id
        
        logger.info('Create client application for the project')
        const clientSecret = uuidv4()
        const clientApplicationDetails = {
        resourceType: 'ClientApplication',
        name: name,
        description: description,
        meta: {
            project: projectId,
            compartment: [
            {
                reference: `Project/${projectId}`
            }
            ]
        },
        secret: clientSecret
        }
        const clientApplicationResult = await fhirApi.post('ClientApplication', clientApplicationDetails)
        const clientId = clientApplicationResult.id

        logger.info('Create project membership for the project')
        const projectMembershipDetails = {
        resourceType: 'ProjectMembership',
        project: {
            reference: `Project/${projectId}`
        },
        meta: {
            project: projectId,
            compartment: [
            {
                reference: `Project/${projectId}`
            }
            ]
        },
        user: {
            reference: `ClientApplication/${clientId}`,
            display: name
        },
        profile: {
            reference: `ClientApplication/${clientId}`,
            display: name
        }
        }
        await fhirApi.post('ProjectMembership', projectMembershipDetails)
        await createSubscriptionInFhirServer(fhirApi, clientId, projectId)
        return projectId
    } catch (error) {
        throw new Error(`Failed to create project in fhir server: ${error}`)
    }
}

export const createResourceInProject = async (token: string, fhirResouce: string, resourceDetails: any, projectName: string) => {
    try{
        let fhirApi = new FhirAPI()
        let datasetId = '', clientId = '', clientSecret = ''
        await fhirApi.clientCredentialslogin()
        const searchResult = await fhirApi.getOneResource('ClientApplication', `name=${projectName}`) 
        if (searchResult) {
            clientId = searchResult.id
            clientSecret = searchResult.secret
        }else
            throw "Dataset not found!"

        let getSubscription = await fhirApi.getOneResource('Subscription', `criteria=${fhirResouce}&author=ClientApplication/${clientId}`)
        //Update Subscription resource with Authorization header
        getSubscription.channel.header = [`Authorization: ${token}`]
        await fhirApi.updateResource(getSubscription)
        //Get datasets
        const portalAPI = new PortalAPI(token)
        const datasets: Dataset[] = await portalAPI.getDatasets()
        const resourceDataset = datasets.filter(dataset => {
            if (dataset.studyDetail.name == projectName) return dataset
        })
        //Get dataset Id of incoming resource
        if (resourceDataset.length > 0) {
            datasetId = resourceDataset[0].id
        }else
            throw "Dataset not found!"
        //Set datasetId in the metadata of the resource
        const metaInfo = {
            author: {
                reference: 'ClientApplication/' + clientId
            },
            id: datasetId
        }
        resourceDetails.meta = metaInfo
        await fhirApi.clientCredentialslogin(clientId, clientSecret)
        await fhirApi.post(fhirResouce, resourceDetails)
        return true
    }catch(error){
        logger.error(JSON.stringify(error))
        return false
    }
}

export const ingestResourceInCacheDB = async (fhirResouce: string) => {
    logger.info(`Received request to ingest resources in CacheDb`)
    let bundle: Bundle = fhirResouce
    if (bundle.entry === undefined){
        console.log('No entries in the bundle')
        return;
    }
    console.info(`Incoming DatasetId: ${bundle.meta.id}`)
    let token = await getClientCredentialsToken()
    //Get dataset details to connect to cachedb
    let portalApi = new PortalAPI(token)
    let datasetDetails = await portalApi.getDatasetById(bundle.meta.id)
    //Connect to cachedb of the incoming dataset
    let conn = await getCachedbDbConnections(token, datasetDetails.databaseCode, datasetDetails.schemaName, datasetDetails.vocabSchemaName)
    try{
        //Get fhir.schema.json
        const jsonSchema = await getFhirJsonSchema(conn)
        let results: any = []
        console.info('Create resource for each of the entry in the bundle')
        for (const entry of bundle.entry) {
            let result = await ingestResourceInFhir(conn, datasetDetails.schemaName, jsonSchema, entry.resource, entry.request)
            if(result !== true)
                results.push(result)
        }
        return results
    }catch(err){
        console.error(`Error ingesting resource: ${err}`)
        throw err
    }finally{
        conn.close()
    }
}

//Create subscription for each dataset to trigger endpoint
export async function createSubscriptionInFhirServer(fhirApi: FhirAPI, clientId: string, projectId: string){
    //Get all subscription thats configured for Super Admin - db6b2304-f236-45ec-b10c-a852681e7129
    let superAdminClientId = env.FHIR__CLIENT_ID
    let getSubscriptions = await fhirApi.searchResource('Subscription', `author=ClientApplication/${superAdminClientId}`)
    if(getSubscriptions && getSubscriptions.entry.length > 0){
        for(const item of getSubscriptions.entry){
            let endpoint = item.resource.channel.endpoint
            let criteria = item.resource.criteria
            const subscriptionDetails = {
                "resourceType": "Subscription",
                "status": "active",
                "reason": `Rest hook subscription for ${criteria}`,
                "channel": {
                    "type": "rest-hook",
                    "endpoint": `${endpoint}`
                },
                "criteria": `${criteria}`,
                "meta": {
                    "author": {
                        "reference": `ClientApplication/${clientId}`,
                        "display": "d2eClient"
                        },
                    "project": `${projectId}`,
                    "compartment": [{
                        "reference": `Project/${projectId}`
                    }]
                }
            }
            console.info(subscriptionDetails)
            await fhirApi.post('Subscription', subscriptionDetails)
        }
    }else{
        console.info('No bots configured for project')
    }
    return true
}

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
