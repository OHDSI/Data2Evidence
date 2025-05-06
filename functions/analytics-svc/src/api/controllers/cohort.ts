import { Response } from "express";
import { MriConfigConnection } from "@alp/alp-config-utils";
import {
    IMRIRequest,
    CohortType,
    CohortDefinitionTableType,
} from "../../types";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { Logger, getUser, User } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
let logger = CreateLogger("analytics-log");
import { CohortEndpoint } from "../../mri/endpoint/CohortEndpoint";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import { createEndpointFromRequest } from "../../mri/endpoint/CreatePluginEndpoint";
import { PluginEndpointResultType } from "../../types";
import PortalServerAPI from "../PortalServerAPI";
import { convertIFRToExtCohort } from "../../ifr-to-extcohort/main";
import { dataflowRequest } from "../../utils/DataflowMgmtProxy";
import { getDuckdbDirectPostgresWriteConnection } from "../../utils/DuckdbConnection";
import { getCachedbDbConnections } from "../../utils/cachedb/cachedb";
import { env } from "../../env";

const language = "en";

const mriConfigConnection = new MriConfigConnection(
    env.SERVICE_ROUTES?.paConfig
);

export async function getCohortAnalyticsConnection(req: IMRIRequest) {
    // If USE_TREX_DB_CONN is true, return early with trex duckdb connection (takes precedence over USE_CACHEDB)
    // If USE_CACHEDB is true, return early with cachedb connection
    const { analyticsConnection } = req.dbConnections;

    if (
        env.USE_TREX_DB_CONN === "true" &&
        analyticsConnection.dialect !== "hana"
    ) {
        return analyticsConnection;
    }

    if (env.USE_CACHEDB === "true" && analyticsConnection.dialect !== "hana") {
        let userObj: User;
        try {
            userObj = getUser(req);
            // logger.debug(
            //     `req.headers: ${JSON.stringify(req.headers)}\n
            //         currentUser: ${JSON.stringify(userObj)}\n
            //         url is: ${req.url}`
            // );
        } catch (err) {
            logger.debug(`No user found in request:${err.stack}`);
        }

        // For cohorts, when using cachedb connection, connect to postgres instead of duckdb
        const { analyticsConnection } = await getCachedbDbConnections({
            analyticsCredentials: req.dbCredentials.studyAnalyticsCredential,
            userObj: userObj,
            token: req.headers.authorization,
            datasetId: req.selectedstudyDbMetadata.id,
            replacePostgresWithDuckdb: false,
        });
        return analyticsConnection;
    }

    // If dialect is DUCKDB, get direct postgres write connection instead
    if (analyticsConnection.dialect === "DUCKDB") {
        const { studyAnalyticsCredential } = req.dbCredentials;
        const credentials = {
            credentials: studyAnalyticsCredential,
            schema: studyAnalyticsCredential.schema,
        };
        return await getDuckdbDirectPostgresWriteConnection(credentials);
    }

    return analyticsConnection;
}

async function getStudyDetails(
    datasetId: string,
    res: Response
): Promise<{
    databaseCode: string;
    schemaName: string;
    vocabSchemaName: string;
}> {
    try {
        const portalServerAPI = new PortalServerAPI();
        const accessToken = await portalServerAPI.getClientCredentialsToken();
        const studies = await portalServerAPI.getStudies(accessToken);

        // find the matching element and get the study schema name
        const studyMatch = studies.find((el) => el.id === datasetId);
        if (!studyMatch) {
            return res.status(500).send(
                MRIEndpointErrorHandler({
                    err: {
                        name: "mri-pa",
                        message: `Study metadata not found for the the given datasetId(${datasetId})!`,
                    },
                    language,
                })
            );
        }
        logger.debug(`Matched study details: ${JSON.stringify(studyMatch)}`);

        return studyMatch;
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getAllCohorts(req: IMRIRequest, res: Response) {
    try {
        const analyticsConnection = await getCohortAnalyticsConnection(req);
        const cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        const offset = req.query.offset;
        const limit = req.query.limit;
        const excludePatientIds = req.query.excludePatientIds === "true";

        // Send empty object to query all cohorts
        const result = await cohortEndpoint.queryCohorts(
            {},
            offset,
            limit,
            excludePatientIds
        );
        // Get count of all cohort definitions for pagination
        const cohortDefinitionCount =
            await cohortEndpoint.queryCohortDefinitionCount({});

        res.status(200).send({ data: result, cohortDefinitionCount });
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getFilteredCohorts(req: IMRIRequest, res: Response) {
    try {
        const analyticsConnection = await getCohortAnalyticsConnection(req);
        const filterColumn = req.params.filterColumn;
        const filterValue = req.params.filterValue;
        const offset = req.query.offset;
        const limit = req.query.limit;
        const datasetId = req.query.datasetId;
        let cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        let result = await cohortEndpoint.queryCohorts(
            {
                [filterColumn]:
                    filterColumn === "SYNTAX"
                        ? JSON.parse(filterValue)
                        : filterValue,
            },
            offset,
            limit
        );

        // Get count of all cohort definitions based on filter column for pagination
        let cohortDefinitionCount =
            await cohortEndpoint.queryCohortDefinitionCount({
                [filterColumn]:
                    filterColumn === "SYNTAX"
                        ? JSON.parse(filterValue)
                        : filterValue,
            });

        res.status(200).send({ data: result, cohortDefinitionCount });
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function createCohort(req: IMRIRequest, res: Response) {
    try {
        const datasetId = req.body.datasetId;
        const token = req.headers.authorization;
        const { bookmarkId } = JSON.parse(req.body.syntax);
        const analyticsConnection = await getCohortAnalyticsConnection(req);
        const { schemaName, databaseCode, vocabSchemaName } =
            await getStudyDetails(datasetId, res);
        const language = getUser(req).lang;
        const requestQuery: string[] | undefined = req.body?.query?.split(",");
        // Remap mriquery for use in createEndpointFromRequest
        const { cohortDefinition } = await createEndpointFromRequest(req);

        const portalServerAPI = new PortalServerAPI();
        // Get bookmark
        const bookmarks = await portalServerAPI.getBookmarkById(
            token,
            bookmarkId,
            datasetId
        );
        if (bookmarks.length === 0) {
            throw `No bookmarks found with bookmark_id: ${bookmarkId}`;
        }
        // Assuming all bookmarks with the same bookmark_id are the same
        const bookmark = bookmarks[0];
        const bookmarkCohortDefinitionId: number | undefined =
            bookmark.cohortDefinitionId;
        if (env.USE_EXTENSION_FOR_COHORT_CREATION === "true") {
            const mriConfig = await mriConfigConnection.getStudyConfig(
                {
                    req,
                    action: "getBackendConfig",
                    configId: req.paConfigId,
                    configVersion: req.paConfigVersion,
                    lang: language,
                    datasetId,
                },
                true
            );
            const attributes = {
                filter: {
                    configMetadata: {
                        id: cohortDefinition.configData.configId,
                        version: cohortDefinition.configData.configVersion,
                    },
                    cards: cohortDefinition.cards,
                    sort: "",
                },
            };
            const ohdsiCohortDefinition = await convertIFRToExtCohort(
                attributes,
                mriConfig.config,
                req,
                datasetId
            );
            const now = new Date().toISOString().split("T")[0];
            await dataflowRequest(req, "POST", `cohort/flow-run`, {
                options: {
                    token,
                    datasetId,
                    cohortJson: {
                        id: 1, // Not used by us
                        name: bookmark.bookmark_name,
                        tags: [],
                        expression: {
                            datasetId, // required for cohort filtering
                            bookmarkId, // required for cohort filtering
                            ...ohdsiCohortDefinition,
                        },
                        createdDate: now,
                        modifiedDate: now,
                        expressionType: "SIMPLE_EXPRESSION",
                        hasWriteAccess: false,
                    },
                    description: req.body.description,
                    schemaName,
                    databaseCode,
                    vocabSchemaName,
                },
            });

            res.status(200).send();
            return;
        }

        const querySvcParams = {
            queryParams: {
                configId: req.paConfigId,
                configVersion: req.paConfigVersion,
                datasetId,
                queryType: "plugin",
                ifrRequest: cohortDefinition,
                language,
                requestQuery,
                insert: false,
            },
        };

        // Request query string from query-gen-svc for inserting the cohort patients.
        // In query-gen-svc, it uses the same logic used in patient list to deal with the filters
        const queryResponse = await generateQuery(
            req,
            querySvcParams,
            "cohort"
        );
        const cohort = await getCohortFromMriQuery(req, bookmark.bookmark_name);
        const cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        if (bookmarkCohortDefinitionId) {
            // If bookmark already has a cohort definition id
            // Update cohort definition with cohort definition id and remove all existing records from cohort table before saving cohort to db
            cohort.id = bookmarkCohortDefinitionId;
            await cohortEndpoint.updateCohortDefinitionToDb(cohort);

            // Remove existing records from cohort table before saving cohort to db
            await cohortEndpoint.deleteCohortFromDb(cohort.id);
            await cohortEndpoint.saveCohortToDb(
                cohort.id,
                cohort,
                queryResponse.queryObject
            );
        } else {
            // Else if bookmark does not already have a cohort definition id
            // Save cohort definition to db and query cohort definition id for newly created cohort definition
            // Save cohort to db
            // Then update bookmark with newly created cohort definition id.
            await cohortEndpoint.saveCohortDefinitionToDb(cohort);

            // Get cohort definition id from cohort object
            const cohortDefinitionId =
                await cohortEndpoint.queryCohortDefinitionId(cohort);
            await cohortEndpoint.saveCohortToDb(
                cohortDefinitionId,
                cohort,
                queryResponse.queryObject
            );
            bookmark.cohortDefinitionId = cohortDefinitionId;

            // Update bookmark with new cohort definition id
            await portalServerAPI.updateBookmark(token, bookmark, datasetId);
        }

        res.status(200).send(`Cohort successfully materialized`);
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function generateCohortDefinition(
    req: IMRIRequest,
    res: Response
) {
    try {
        const datasetId = req.body.datasetId;
        const { vocabSchemaName } = await getStudyDetails(datasetId, res);
        const language = getUser(req).lang;
        // Remap mriquery for use in createEndpointFromRequest
        const { cohortDefinition } = await createEndpointFromRequest(req);
        const mriConfig = await mriConfigConnection.getStudyConfig(
            {
                req,
                action: "getBackendConfig",
                configId: req.paConfigId,
                configVersion: req.paConfigVersion,
                lang: language,
                datasetId,
            },
            true
        );
        const attributes = {
            filter: {
                configMetadata: {
                    id: cohortDefinition.configData.configId,
                    version: cohortDefinition.configData.configVersion,
                },
                cards: cohortDefinition.cards,
                sort: "",
            },
        };
        const ohdsiCohortDefinition = await convertIFRToExtCohort(
            attributes,
            mriConfig.config,
            req,
            datasetId
        );

        res.status(200).send(ohdsiCohortDefinition);
        return;
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getCohortDefinition(req: IMRIRequest, res: Response) {
    try {
        const analyticsConnection = await getCohortAnalyticsConnection(req);

        const cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        const result = await cohortEndpoint.getCohortDefinition(
            req.query.cohortDefinitionId
        );

        res.status(200).send(result);
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function createCohortDefinition(req: IMRIRequest, res: Response) {
    try {
        const analyticsConnection = await getCohortAnalyticsConnection(req);

        let cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        const cohortDefiniton = <CohortDefinitionTableType>{
            name: req.body.name,
            description: req.body.description,
            creationTimestamp: new Date().toISOString().split("T")[0],
            definitionTypeConceptId: req.body.definitionTypeConceptId ?? 0,
            subjectConceptId: req.body.subjectConceptId ?? 0,
            syntax: req.body.syntax,
        };

        await cohortEndpoint.saveCohortDefinitionToDb(cohortDefiniton);

        // Get inserted cohort definition id from cohort definition
        const cohortDefinitionId = await cohortEndpoint.queryCohortDefinitionId(
            cohortDefiniton
        );
        res.status(200).send({
            data: cohortDefinitionId,
        });
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function updateCohortDefinition(req: IMRIRequest, res: Response) {
    try {
        const cohortDefinitionId = req.body.cohortDefinitionId;
        const name = req.body.name;
        const description = req.body.description;
        const definitionTypeConceptId = req.body.definitionTypeConceptId;
        const syntax = req.body.syntax;
        const subjectConceptId = req.body.subjectConceptId;

        const analyticsConnection = await getCohortAnalyticsConnection(req);

        const cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        // Get existing cohort definition via cohort definition id
        const { data: cohortDefinitions } =
            await cohortEndpoint.getCohortDefinition(cohortDefinitionId);
        if (cohortDefinitions.length < 0) {
            throw `No cohort definition found for cohort definition id:${cohortDefinitionId}`;
        }
        const existingCohortDefinition = cohortDefinitions[0];

        // Create new cohort definition id object based on existing cohort definition and incoming parameters
        const newCohortDefinition: CohortDefinitionTableType = {
            id: cohortDefinitionId,
            name: name ?? existingCohortDefinition.cohort_definition_name,
            description:
                description ??
                existingCohortDefinition.cohort_definition_description,
            creationTimestamp: existingCohortDefinition.cohort_initiation_date,
            definitionTypeConceptId:
                definitionTypeConceptId ??
                existingCohortDefinition.definition_type_concept_id,
            subjectConceptId:
                subjectConceptId ?? existingCohortDefinition.subject_concept_id,
            syntax: syntax ?? existingCohortDefinition.cohort_definition_syntax,
        };

        await cohortEndpoint.updateCohortDefinitionToDb(newCohortDefinition);

        res.status(200).send(newCohortDefinition);
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function deleteCohort(req: IMRIRequest, res: Response) {
    try {
        // Delete cohort from database
        const cohortId = req.query.cohortId;
        const analyticsConnection = await getCohortAnalyticsConnection(req);

        let cohortEndpoint = new CohortEndpoint(
            analyticsConnection,
            analyticsConnection.schemaName
        );

        // Delete cohort definition from database
        let cohortDefinitionResult =
            await cohortEndpoint.deleteCohortDefinitionFromDb(cohortId);
        // Delete cohort from database
        let cohortResult = await cohortEndpoint.deleteCohortFromDb(cohortId);

        res.status(200).send(
            `Deleted ${cohortDefinitionResult.data} rows from COHORT_DEFINITION and ${cohortResult.data} rows from COHORT with ID: ${cohortId}`
        );
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

// Form and return cohort object
async function getCohortFromMriQuery(
    req: IMRIRequest,
    cohortName: string
): Promise<CohortType> {
    try {
        const patientIds = [];

        // Create cohort object
        let cohort = <CohortType>{
            patientIds,
            name: cohortName,
            description: req.body.description,
            creationTimestamp: new Date().toISOString().split("T")[0],
            definitionTypeConceptId: req.body.definitionTypeConceptId ?? 0,
            subjectConceptId: req.body.subjectConceptId ?? 0,
            syntax: req.body.syntax,
        };

        return cohort;
    } catch (err) {
        throw err;
    }
}
