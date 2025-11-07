import { convertZlibBase64ToJson, getUser } from "@alp/alp-base-utils";
import {
    BackendConfigWithCDMConfigMetaDataType,
    CohortDefinitionType,
    PluginEndpointRequestType,
    IMRIRequest,
    StudyDbMetadata,
} from "../../types";
import { PluginEndpoint } from "./PluginEndpoint";

export async function createEndpointFromRequest(req: IMRIRequest): Promise<{
    cohortDefinition: CohortDefinitionType;
    datasetId: string;
    pluginEndpoint: PluginEndpoint;
}> {
    const { analyticsConnection } = req.dbConnections;
    const user = getUser(req);
    const lang = user.lang;
    let body: PluginEndpointRequestType = {
        ...convertZlibBase64ToJson(req.query.mriquery || req.body.mriquery),
    };

    if (!body.cohortDefinition.configData) {
        return Promise.reject(
            "Cohort setting does not have configuration data specified"
        );
    }

    try {
        body.cohortDefinition = {
            ...body.cohortDefinition,
            // ...convertedFilter,
        };

        let cohortDefinition: CohortDefinitionType;
        if (!body || !body.cohortDefinition) {
            return Promise.reject("Cohort Definition not provided");
        } else {
            cohortDefinition = body.cohortDefinition;
            //Inject cohort id if exists into cohortDefinition
            if (req.body?.cohortId) {
                cohortDefinition["cohortId"] = req.body.cohortId;
                if (analyticsConnection.dialect === "DUCKDB") {
                    analyticsConnection.conn["studyAnalyticsCredential"] =
                        req.dbCredentials.studyAnalyticsCredential;
                    analyticsConnection.conn["duckdbNativeDBName"] =
                        await analyticsConnection.activate_nativedb_communication(
                            analyticsConnection.conn["studyAnalyticsCredential"]
                        );
                }
            }
        }
        let datasetId = body.datasetId;
        const studyMetadata: StudyDbMetadata =
            req.studiesDbMetadata.studies.find((o) => o.id === datasetId);
        const studySchemaName = studyMetadata?.schemaName;

        if (studySchemaName) {
            //Use schemaname from analyticsConnection, since duckdb doesnt follow the same naming convention as other dbs
            const pluginEndpoint = new PluginEndpoint(
                analyticsConnection,
                analyticsConnection.schemaName
            );
            pluginEndpoint.setRequest(req);

            return Promise.resolve({
                cohortDefinition,
                datasetId,
                pluginEndpoint,
            });
        } else {
            throw new Error(
                `Schema name undefined for dataset id ${datasetId}`
            );
        }
    } catch (err) {
        return Promise.reject(err);
    }
}
