import { env } from "../../env";
import {
    Connection,
    CachedbDBConnectionUtil,
    getCachedbDatabaseFormatProtocolA,
} from "@alp/alp-base-utils";
import { DB } from "../DBSvcConfig";

export const getCachedbDbConnections = async ({
    analyticsCredentials,
    userObj,
    token,
    datasetId,
    replacePostgresWithDuckdb = true,
}): Promise<{
    analyticsConnection: Connection.ConnectionInterface;
}> => {
    let dialect = analyticsCredentials.dialect
    if(dialect === "postgresql") {
        dialect = "duckdb" //TODO: CONSUME from Portal metadata
    }
    let cachedbDatabase = getCachedbDatabaseFormatProtocolA(
        dialect,
        datasetId
    );
    // IF use duckdb is true change dialect from postgres -> duckdb
    if (
        replacePostgresWithDuckdb &&
        env.USE_DUCKDB === "true" &&
        analyticsCredentials.dialect !== DB.HANA
    ) {
        cachedbDatabase = cachedbDatabase.replace(
            analyticsCredentials.dialect,
            "duckdb"
        );
    }

    // Overwrite analyticsCrendential values to connect to cachedb
    analyticsCredentials.host = env.CACHEDB__HOST;
    analyticsCredentials.port = env.CACHEDB__PORT;
    analyticsCredentials.database = cachedbDatabase;
    analyticsCredentials.user = token;

    const analyticsConnection =
        await CachedbDBConnectionUtil.CachedbDBConnectionUtil.getDBConnection({
            credentials: analyticsCredentials,
            schemaName: analyticsCredentials.schema,
            vocabSchemaName: analyticsCredentials.vocabSchema,
            resultSchemaName: analyticsCredentials.resultSchema,
            userObj,
        });

    return {
        analyticsConnection,
    };
};
