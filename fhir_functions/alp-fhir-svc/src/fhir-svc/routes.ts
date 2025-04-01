import express from "npm:express";
import { validationResult } from "npm:express-validator";
import {
  createProject,
  forwardRequest,
  // createResourceInProject,
  // ingestResourceInCacheDB,
} from "./services";

import { validateCreateFhirProjectDto, validateProxyDto } from "./middleware";

import { filterHeaders, HTTPMethod } from "../utils/types";

export class FhirRouter {
  public router = express.Router();
  private readonly logger = console;

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    //Endpoint to create a new project for the incoming dataset name in FHIR server
    this.router.post(
      "/createProject",
      validateCreateFhirProjectDto(),
      async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }

        const { name, description } = req.body;
        try {
          const projectId = await createProject(name, description);
          return res.status(200).json(projectId);
        } catch (error) {
          let log_msg = `Failed to create project in fhir server - ${error.message}`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }
      }
    );

    this.router.all(
      "/project/:projectName/*",
      validateProxyDto(),
      async (req, res) => {
        // Examples
        // GET
        // get patient resource with id 123 - GET /Patient/:id
        // get patient with name == abc - GET /Patient?name=abc
        // get specific version of a resource i.e. vRead - GET /:resource/:resourceID/_history/:versionID

        // POST
        // create patient resource - POST /Patient
        // hard delete a patient resource, including resource history - POST /Patient/:id/$expunge (requires super admin)
        // get a bundle fhir - POST /
        // create a bundle - POST /

        // PUT
        // update patient resource - PUT /Patient/:id
        // upsert with search params i.e. conditional create - PUT /Patient?family=:family

        // PATCH
        // patch a patient resource - PATCH /Patient/:id, patch body: []

        // DELETE
        // delete a resource - DELETE /Observation/:id

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }

        try {
          const { "0": resourcePath, projectName } = req.params;
          const token = req.headers.authorization;
          const httpMethod = req.method;

          const queryParams = req.query ? req.query : {};
          const body = req.body ? req.body : {};

          // check if incoming request is for Binary resource type
          let resource;
          resource = resourcePath ? resourcePath.split("/")[0] : "";
          const isBinaryReq = resource === "Binary" ? true : false;

          const headers = req.headers
            ? filterHeaders(req.headers, isBinaryReq, httpMethod)
            : {};

          this.logger.info(
            `Received a '${httpMethod}' request for project named '${projectName}'`
          );

          // Forward request
          const fhirResponse = await forwardRequest(
            token,
            httpMethod,
            projectName,
            resourcePath,
            queryParams,
            body,
            headers
          );

          if (isBinaryReq === true && httpMethod === HTTPMethod.GET) {
            res.set("Content-Type", fhirResponse.headers);
            res
              .status(fhirResponse.status)
              .set("Content-Type", fhirResponse.headers["content-type"])
              .set("Content-Disposition", "inline")
              .send(fhirResponse.data);
          } else {
            res
              .status(fhirResponse.status)
              .set(fhirResponse.headers)
              .send(fhirResponse.data);
          }
        } catch (error) {
          let log_msg = `Failed to forward ${req.method} request - ${error.message}!`;
          this.logger.error(log_msg);
          res.status(500).send(log_msg);
        }

        // const { "0": resourcePath, studyCode } = req.params;
        // const token = req.headers.authorization;
        // const httpMethod = req.method;

        // const queryParams = req.query ? req.query : {};
        // const body = req.body ? req.body : {};

        // // check if incoming request is for Binary resource type
        // let resource;
        // resource = resourcePath ? resourcePath.split("/")[0] : "";
        // const isBinaryReq = resource === "Binary" ? true : false;

        // const headers = req.headers
        //   ? filterHeaders(req.headers, isBinaryReq, httpMethod)
        //   : {};

        // this.logger.info(
        //   `Received a '${httpMethod}' request for project named '${studyCode}'`
        // );

        // // Forward request
        // const fhirResponse = await forwardRequest(
        //   token,
        //   httpMethod,
        //   studyCode,
        //   resourcePath,
        //   queryParams,
        //   body,
        //   headers
        // );

        // if (isBinaryReq === true && httpMethod === HTTPMethod.GET) {
        //   res.set("Content-Type", fhirResponse.headers);
        //   res
        //     .status(fhirResponse.status)
        //     .set("Content-Type", fhirResponse.headers["content-type"])
        //     .set("Content-Disposition", "inline")
        //     .send(fhirResponse.data);
        // } else {
        //   res
        //     .status(fhirResponse.status)
        //     .set(fhirResponse.headers)
        //     .send(fhirResponse.data);
        // }
      }
    );

    // Todo: remove as part of bots and subscription
    //Endpoint to create resource in FHIR server which triggers the subscription
    // this.router.post("/ingest/:resource/:projectName?", async (req, res) => {
    //   try {
    //     const { resource, projectName } = req.params;
    //     const token = req.headers.authorization!;
    //     const response = await createResourceInProject(
    //       token,
    //       resource,
    //       req.body,
    //       projectName
    //     );
    //     this.logger.info(
    //       `Resource of type '${resource}' successfully ingested into project '${projectName}'!`
    //     );
    //     return res.status(200).json(response);
    //   } catch (error) {
    //     this.logger.error(error);
    //     res.status(500).send(error.message);
    //   }
    // });

    // Todo: remove as part of bots and subscription
    //Endpoint to ingest data into fhir data model in cachedb
    // this.router.post("/ingestResource/:resource", async (req, res) => {
    //   try {
    //     this.logger.info("Ingest into FHIR Data model");
    //     const response = await ingestResourceInCacheDB(req.body);
    //     if (response) return res.status(200).json(response);
    //     else return res.status(500).json("Failed to ingest FHIR Resource");
    //   } catch (error) {
    //     this.logger.error(
    //       `Error ingesting resource in cachedb:  ${JSON.stringify(error)}`
    //     );
    //     res.status(500).send("Error ingesting resource");
    //   }
    // });

    //Need the following for testing
    //Test
    //Endpoint to ingest data into fhir data model in cachedb
    // this.router.post('/getResource/:resource/:datasetId', async(req, res) =>{
    //   try{
    //     this.logger.info('Ingest into FHIR Data model')
    //     let resource = req.params.resource
    //     let datasetId = req.params.datasetId
    //     const response = await getResource(resource, datasetId)
    //     if(response)
    //       return res.status(200).json(response)
    //     else
    //     return res.status(500).json('Failed to ingest FHIR Resource')
    //   }catch(error){
    //     this.logger.error(`Error ingesting resource in cachedb:  ${JSON.stringify(error)}`)
    //     res.status(500).send('Error ingesting resource')
    //   }
    // })

    //Test
    //   this.router.post('/update/:resource', async(req, res) => {
    //     try{
    //       this.logger.info('Update resource')
    //       const clientId = req.body.clientId as string
    //       const projectId = req.body.projectId as string
    //       const botId = req.body.botId as string
    //       let response = await updateResource(clientId, projectId, botId)
    //       if(response)
    //         return res.status(200).json('FHIR Resource successfully ingested!')
    //       else
    //       return res.status(500).json('Failed to ingest FHIR Resource')
    //     }catch(err){
    //       this.logger.error(`Error ingesting resource in cachedb:  ${JSON.stringify(err)}`)
    //       res.status(500).send('Error ingesting resource in cachedb')
    //     }
    //   })
  }
}
