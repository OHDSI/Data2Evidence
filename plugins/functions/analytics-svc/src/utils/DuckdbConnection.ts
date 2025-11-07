// NON FUNCTIONAL FOR TREX!!
import {
    ConnectionInterface,
    CallBackInterface,
    ParameterInterface,
    flattenParameter,
    DBValues,
} from "../../../_shared/alp-base-utils/src/Connection";
//import { Database, OPEN_READONLY, Connection } from "duckdb-async";
import crypto from "crypto";
import { DBError } from "../../../_shared/alp-base-utils/src/DBError";
import { StudyAnalyticsCredential } from "../types";
import { CreateLogger } from "../../../_shared/alp-base-utils/src/Logger";
import { translateHanaToDuckdb } from "../../../_shared/alp-base-utils/src/helpers/hanaTranslation";
import { env } from "../env";
const logger = CreateLogger("Duckdb Connection");

// Non-CacheDB - Helper function similar to getDBConnection implementation in alp-base-utils DBConnectionUtil.ts
export const getDuckdbDBConnection = (
    duckdbSchemaFileName: string,
    duckdbVocabSchemaFileName: string
) => {
    return new Promise<ConnectionInterface>(async (resolve, reject) => {
        DuckdbConnection.createConnection(
            duckdbSchemaFileName,
            duckdbVocabSchemaFileName,
            async (err, connection: ConnectionInterface) => {
                if (err) {
                    logger.error(err);
                    reject(err);
                }
                resolve(connection);
            }
        );
    });
};
export const getDuckdbDirectPostgresWriteConnection = ({
    credentials,
    schema,
}: {
    credentials: StudyAnalyticsCredential;
    schema: string;
}) => {
    return new Promise<ConnectionInterface>(async (resolve, reject) => {
        DuckdbConnection.createDirectPostgresWriteConnection(
            credentials,
            schema,
            async (err, connection: ConnectionInterface) => {
                if (err) {
                    logger.error(err);
                    reject(err);
                }
                resolve(connection);
            }
        );
    });
};

export class DuckdbConnection implements ConnectionInterface {
    private constructor(
        public conn: Connection,
        public database: Database,
        public schemaName: string,
        public vocabSchemaName: string,
        public dialect = "duckdb"
    ) {}

    public static async createConnection(
        duckdbSchemaFileName: string,
        duckdbVocabSchemaFileName: string,
        callback
    ) {
        try {
            const duckdDB = await Database.create(
                `${env.DUCKDB__DATA_FOLDER}/${duckdbSchemaFileName}`,
                OPEN_READONLY
            );
            const duckdDBconn = await duckdDB.connect();
            // Load vocab schema into duckdb connection
            await duckdDBconn.all(
                `ATTACH '${env.DUCKDB__DATA_FOLDER}/${duckdbVocabSchemaFileName}' (READ_ONLY);`
            );
            const conn: DuckdbConnection = new DuckdbConnection(
                duckdDBconn,
                duckdDB,
                duckdbSchemaFileName,
                duckdbVocabSchemaFileName
            );

            callback(null, conn);
        } catch (err) {
            callback(err, null);
        }
    }

    public static async createDirectPostgresWriteConnection(
        credentials: StudyAnalyticsCredential,
        schema: string,
        callback
    ) {
        try {
            const randomDBName = `${credentials.databaseName}_write_${crypto
                .randomBytes(16)
                .toString("hex")}`;
            const duckdDB = await Database.create(":memory:");
            await duckdDB.all("INSTALL postgres");
            await duckdDB.all("LOAD postgres");
            const duckdDBconn = await duckdDB.connect();

            // Attach postgres as direct connection
            await duckdDBconn.all(
                `ATTACH 'host=${credentials.host} port=${credentials.port} dbname=${credentials.databaseName} user=${credentials.user} password=${credentials.password}' AS ${randomDBName} (TYPE postgres)`
            );

            // Load CDM schema into duckdb connection
            await duckdDBconn.all(
                `ATTACH '${env.DUCKDB__DATA_FOLDER}/${credentials.code}_${credentials.schema}' (READ_ONLY);`
            );
            await duckdDBconn.all(
                `ATTACH '${env.DUCKDB__DATA_FOLDER}/${credentials.code}_${credentials.vocabSchema}' (READ_ONLY);`
            );
            const conn: DuckdbConnection = new DuckdbConnection(
                duckdDBconn,
                duckdDB,
                `${credentials.code}_${credentials.schema}`,
                `${credentials.code}_${credentials.vocabSchema}`
            );

            conn["duckdbNativeDBName"] = `${randomDBName}.${schema}`;

            callback(null, conn);
        } catch (err) {
            callback(err, null);
        }
    }

    public parseResults(result: any) {
        function formatResult(value: any) {
            // TODO: investigate if more cases are needed to handle DATE, TIMESTAMP and BIT datetypes
            switch (typeof value) {
                case "bigint": //bigint
                    return Number(value) * 1;
                default:
                    return value;
            }
        }
        Object.keys(result).forEach((rowId) => {
            Object.keys(result[rowId]).forEach((colKey) => {
                if (
                    result[rowId][colKey] === null ||
                    typeof result[rowId][colKey] === "undefined"
                ) {
                    result[rowId][colKey] = DBValues.NOVALUE;
                } else {
                    result[rowId][colKey] = formatResult(result[rowId][colKey]);
                }
            });
        });
        return result;
    }

    public async execute(
        sql,
        parameters: ParameterInterface[],
        callback: CallBackInterface
    ) {
        try {
            logger.debug(`Sql: ${sql}`);
            logger.debug(
                `parameters: ${JSON.stringify(flattenParameter(parameters))}`
            );
            let temp = sql;
            temp = this.parseSql(temp, parameters);
            logger.debug("Duckdb client created");
            const result = await this.conn.all(
                temp,
                ...flattenParameter(parameters)
            );
            callback(null, result);
        } catch (err) {
            logger.error(err);
            callback(new DBError(logger.error(err), err.message), null);
        }
    }

    private parseSql(temp: string, parameters?: ParameterInterface[]): string {
        temp = this.getSqlStatementWithSchemaName(this.schemaName, temp); //THIS HAS TO COME BEFORE
        return translateHanaToDuckdb(
            temp,
            this.schemaName,
            this.vocabSchemaName,
            parameters
        );
    }

    public getTranslatedSql(sql: string, schemaName: string, parameters: ParameterInterface[]): string {
        return this.parseSql(sql, parameters);
    }

    public executeQuery(
        sql,
        parameters: ParameterInterface[],
        callback: CallBackInterface
    ) {
        try {
            this.execute(sql, parameters, (err, resultSet) => {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                } else {
                    const result = this.parseResults(resultSet);
                    callback(null, result);
                }
            });
        } catch (err) {
            callback(new DBError(logger.error(err), err.message), null);
        }
    }

    public executeStreamQuery(
        sql,
        parameters: ParameterInterface[],
        callback: CallBackInterface,
        schemaName: string = ""
    ) {
        try {
            sql = this.parseSql(sql);
            const stream = this.conn.stream(
                sql,
                ...flattenParameter(parameters)
            );
            callback(null, stream);
        } catch (err) {
            logger.error(`Execute error: ${JSON.stringify(err)}
          =>sql: ${sql}
          =>parameters: ${JSON.stringify(parameters)}`);
            callback(new DBError(logger.error(err), err.message), null);
        }
    }

    public executeUpdate(
        sql: string,
        parameters: ParameterInterface[],
        callback: CallBackInterface
    ) {
        try {
            this.execute(sql, parameters, (err, result) => {
                if (err) {
                    callback(new DBError(logger.error(err), err.stack), null);
                }
                callback(null, result.rowCount);
            });
        } catch (error) {
            callback(error, null);
        }
    }

    public executeProc(
        procedure: string,
        parameters: [],
        callback: CallBackInterface
    ) {
        try {
            const params = parameters.map((param) => "?");
            const sql = `select count(*) from \"${procedure}\"(${params.join()})`;
            logger.debug(`Sql: ${sql}`);
            let temp = sql;
            temp = this.parseSql(temp);
            this.conn.exec(temp, parameters, (err, result) => {
                if (err) {
                    return callback(
                        new DBError(logger.error(err), err.stack),
                        null
                    );
                }
                callback(null, result.rowCount);
            });
        } catch (err) {
            callback(new DBError(logger.error(err), err.message), null);
        }
    }

    public commit(callback?: CallBackInterface) {
        this.conn.exec("COMMIT", (commitError) => {
            if (commitError) {
                throw commitError;
            }
            if (callback) {
                callback(null, null);
            }
        });
    }

    public setAutoCommitToFalse() {
        throw new Error("setAutoCommitToFalse is not yet implemented");
    }

    // This is temporary workaround to enable communication with Postgres since cohort tables are only populated in postgres and not in duckdb yet. Once we enable the write mode on duckdb for cohort tables, then this can be removed.
    public async activate_nativedb_communication(
        credentials: StudyAnalyticsCredential
    ): Promise<string> {
        const randomDBName = `${credentials.databaseName}_read_${crypto
            .randomBytes(16)
            .toString("hex")}`;
        await this.database.all("INSTALL postgres");
        await this.database.all("LOAD postgres");
        await this.database.all(
            `ATTACH 'host=${credentials.host} port=${credentials.port} dbname=${credentials.databaseName} user=${credentials.user} password=${credentials.password}' AS ${randomDBName} (TYPE postgres, READ_ONLY)`
        );
        return randomDBName;
    }

    public async deactivate_nativedb_communication(dbName: string) {
        try {
            await this.database.all(`DETACH ${dbName}`);
        } catch (e) {
            // Ignore the error because the connection might have been closed already
            logger.warn(e);
        }
    }

    public async close() {
        await this.database.close();
        logger.debug(`Duckdb database connection has been closed`);
    }

    public executeBulkUpdate(
        sql: string,
        parameters: ParameterInterface[][],
        callback: CallBackInterface
    ) {
        throw "executeBulkUpdate is not yet implemented";
    }

    public executeBulkInsert(
        sql: string,
        parameters: null[][],
        callback: CallBackInterface
    ) {
        throw "executeBulkInsert is not yet implemented";
    }
    /**
     * This methods sets the current application user to the DB session (i.e. XS.APPLICATIONUSER).
     * This method must be called in the respective endpoints before performing any queries involving the guarded patients.
     */
    public setCurrentUserToDbSession(
        user: string,
        callback: CallBackInterface
    ) {
        callback(null, null);
        // Users does not exist on duckdb connections
    }

    public setTemporalSystemTimeToDbSession(
        systemTime: string,
        cb: CallBackInterface
    ) {
        cb(null, null);
        // throw "Setting Temporal System Time to DB session is not yet implemented";
    }

    public rollback(callback: CallBackInterface) {
        // this.conn.rollBack((err) => {
        //   if (err) {
        //     err.code = "ECOMMIT";
        //     return callback(new DBError(err.code, err.message), null);
        //   } else {
        //     callback(null, true);
        //   }
        // });

        // Property 'rollBack' does not exist on type 'Pool'
        throw "rollback is not yet implemented";
    }

    private getSqlStatementWithSchemaName(
        schemaName: string,
        sql: string
    ): string {
        let duckdbNativeSchemName = null;

        //TODO: Unify implementation between patient list and Add to cohort
        if (this.conn["duckdbNativeDBName"]) {
            duckdbNativeSchemName = `${this.conn["duckdbNativeDBName"]}.${this.conn["studyAnalyticsCredential"].schema}`;
        } else {
            duckdbNativeSchemName = this["duckdbNativeDBName"];
        }
        //If inner join is happening between duckdb and native database for ex: postgres, then the replaced example would be <ALIAS_NATIVE_DBNAME>.<SCHEMANAME>.COHORT
        if (duckdbNativeSchemName) {
            sql = sql.replace(
                /\$\$SCHEMA\$\$.COHORT_DEFINITION/g,
                `${duckdbNativeSchemName}.COHORT_DEFINITION`
            );
            sql = sql.replace(
                /\$\$SCHEMA\$\$.COHORT/g,
                `${duckdbNativeSchemName}.COHORT`
            );
        }
        const replacement = schemaName === "" ? "" : `${schemaName}.`;
        return sql.replace(/\$\$SCHEMA\$\$./g, replacement);
    }
}
