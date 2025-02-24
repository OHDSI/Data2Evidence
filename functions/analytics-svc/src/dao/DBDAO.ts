import { Logger } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import { DBSvcConnectionInterface } from "../utils/DBSvcConnection";
import * as config from "../utils/DBSvcConfig";
import { DBConnectionUtil as dbConnectionUtil } from "../utils/DBSvcConnectionUtil";
import {
    IDBHanaCredentialsType,
    IDBPgCredentialsType,
    SnapshotTableMetadata,
    SnapshotColumnMetadata,
    SnapshotSchemaMetadata,
} from "../utils/DBSvcTypes";
import { env } from "../env";
import { decode } from "jsonwebtoken";

const logger = CreateLogger("analytics-log");

export class DBDAO {
    public connection: DBSvcConnectionInterface;
    private properties = config.getProperties();

    constructor(public dialect: string, public tenant: string) {}

    public getCDMVersion = async (db: any, schema: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            db.executeQuery(
                `SELECT CDM_VERSION FROM ${schema}.CDM_SOURCE`,
                [],
                (err: any, result: string) => {
                    if (err) {
                        logger.info(err);
                        return reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    };

    public checkIfSchemaExists = async (
        db: any,
        schema: string
    ): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            db.executeQuery(
                `SELECT SCHEMA_NAME FROM SCHEMAS WHERE SCHEMA_NAME=?`,
                [{ value: schema }],
                (err: any, result: string) => {
                    if (err) {
                        logger.info(err);
                        return reject(err);
                    } else {
                        if (result.length > 0) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                }
            );
        });
    };

    // Get snapshot schema metadata
    public getSnapshotSchemaMetadata = (db: any, schema: string) => {
        return new Promise(async (resolve, reject) => {
            try {
                const tables: string[] = await this.getSnapshotSchemaTables(
                    db,
                    schema
                );
                let snapshotSchemaMetadata = <SnapshotSchemaMetadata>{
                    schemaName: schema,
                    schemaTablesMetadata: [],
                };

                await Promise.all(
                    tables.map(async (table) => {
                        let tableMetadata =
                            await this.getSnapshotSchemaTableMetadata(
                                db,
                                schema,
                                table
                            );
                        snapshotSchemaMetadata.schemaTablesMetadata.push(
                            tableMetadata
                        );
                    })
                );
                resolve(snapshotSchemaMetadata);
            } catch (err) {
                reject(err);
            }
        });
    };

    // Gets all the tables except DATABASECHANGELOG and DATABASECHANGELOGLOCK for schema
    private getSnapshotSchemaTables = (db: any, schema: string) => {
        return new Promise<string[]>((resolve, reject) => {
            db.executeQuery(
                `SELECT TABLE_NAME FROM SYS.M_TABLES WHERE SCHEMA_NAME=? AND (TABLE_NAME NOT IN ('DATABASECHANGELOG', 'DATABASECHANGELOGLOCK'));`,
                [{ value: schema }],
                (err: any, result: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        logger.info(
                            `Retrieved schema snapshot tables for Schema: ${schema}`
                        );
                        const tables: string[] = [];
                        result.forEach((elem: { TABLE_NAME: string }) => {
                            tables.push(elem["TABLE_NAME"]);
                        });
                        resolve(tables);
                    }
                }
            );
        });
    };

    // Gets the metadata of the table in the schema, this is for the frontend to know which column is essential for copying, e.g if a column is a primary key, it must be copied in the snapshot
    private getSnapshotSchemaTableMetadata = (
        db: any,
        schema: string,
        table
    ) => {
        return new Promise<SnapshotTableMetadata>((resolve, reject) => {
            db.executeQuery(
                `SELECT tc.SCHEMA_NAME, tc.TABLE_NAME, tc.COLUMN_NAME, tc.IS_NULLABLE, c.IS_PRIMARY_KEY, rc.COLUMN_NAME AS IS_FOREIGN_KEY FROM SYS.TABLE_COLUMNS AS tc LEFT JOIN SYS."CONSTRAINTS" AS c ON (tc.TABLE_NAME=c.TABLE_NAME AND tc.SCHEMA_NAME=c.SCHEMA_NAME AND tc.COLUMN_NAME=c.COLUMN_NAME) LEFT JOIN SYS."REFERENTIAL_CONSTRAINTS" AS rc ON (tc.TABLE_NAME=rc.TABLE_NAME AND tc.SCHEMA_NAME=rc.SCHEMA_NAME AND tc.COLUMN_NAME=rc.COLUMN_NAME) WHERE tc.SCHEMA_NAME = ? AND tc.TABLE_NAME = ?;`,
                [{ value: schema }, { value: table }],
                (err: any, result: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        logger.info(
                            `Retrieved schema snapshot table metadata for Table: ${table} in Schema: ${schema}`
                        );
                        let tableMetadata = <SnapshotTableMetadata>{
                            tableName: table,
                            tableColumnsMetadata: [],
                        };
                        result.forEach(
                            (elem: {
                                TABLE_NAME: string;
                                IS_NULLABLE: string;
                                IS_PRIMARY_KEY: string;
                                IS_FOREIGN_KEY: string;
                            }) => {
                                // Construct column metadata type object
                                let columnMetaData = <SnapshotColumnMetadata>{};
                                columnMetaData.columnName = elem["COLUMN_NAME"];
                                columnMetaData.isNullable =
                                    elem["IS_NULLABLE"] === "TRUE"
                                        ? true
                                        : false;
                                // If there is a value in primary key, column is a primary key
                                columnMetaData.isPrimaryKey =
                                    elem["IS_PRIMARY_KEY"] === "NoValue"
                                        ? false
                                        : true;
                                // If there is a value in foreign key, column is a foreign key
                                columnMetaData.isForeignKey =
                                    elem["IS_FOREIGN_KEY"] === "NoValue"
                                        ? false
                                        : true;

                                tableMetadata.tableColumnsMetadata.push(
                                    columnMetaData
                                );
                            }
                        );
                        resolve(tableMetadata);
                    }
                }
            );
        });
    };

    public getDBConnectionByTenant = (
        tenant: string,
        req,
        res,
        callback: Function
    ): void => {
        (async () => {
            try {
                const dbClient = await this.getDBClientByTenant(
                    this.tenant,
                    req
                );
                const dbConnection: DBSvcConnectionInterface = <
                    DBSvcConnectionInterface
                >await dbConnectionUtil.getConnection(this.dialect, dbClient);
                this.addCloseDBConnectionCallback(res, dbConnection);
                return dbConnection;
            } catch (err) {
                callback(err);
            }
        })()
            .then((db) => {
                callback(null, db);
            })
            .catch((err) => {
                callback(err);
            });
    };

    public getDBConnectionByTenantPromise = (
        tenant: string,
        req?: any,
        res?: any
    ): Promise<DBSvcConnectionInterface> => {
        return new Promise<DBSvcConnectionInterface>(
            async (resolve, reject) => {
                try {
                    const dbClient = await this.getDBClientByTenant(
                        this.tenant,
                        req
                    );
                    const dbConnection: DBSvcConnectionInterface = <
                        DBSvcConnectionInterface
                    >await dbConnectionUtil.getConnection(
                        this.dialect,
                        dbClient
                    );
                    if (res != null) {
                        this.addCloseDBConnectionCallback(res, dbConnection);
                    }
                    resolve(dbConnection);
                } catch (err) {
                    reject(err);
                }
            }
        );
    };

    private getDBClientByTenant = (
        tenant: string,
        request: any,
        schema?: string
    ) => {
        return new Promise(async (resolve, reject) => {
            let credentials: IDBHanaCredentialsType | IDBPgCredentialsType;
            credentials = config.getDBConfigByTenant(this.dialect, tenant);

            try {
                if (
                    credentials.dialect === config.DB.HANA &&
                    env.USE_HANA_JWT_AUTHC === "true"
                ) {
                    delete credentials.user;
                    delete credentials.password;
                    if (request.headers["authorization"]) {
                        const thirdPartyToken = decode(
                            request.headers["authorization"].replace(
                                /bearer /i,
                                ""
                            )
                        )["thirdPartyToken"];

                        if (!decode(thirdPartyToken)) {
                            throw new Error(
                                "Intermediary IDP token doesnt exist for HANA JWT Authentication!"
                            );
                        }

                        credentials["token"] = thirdPartyToken;
                    } else {
                        throw new Error(
                            "Intermediary IDP token doesnt exist for HANA JWT Authentication!"
                        );
                    }
                }
                const client = await dbConnectionUtil.getDbClient(credentials);
                resolve(client);
            } catch (err) {
                logger.error(`Failed to get db client by tenant: ${err}`);
                reject(err);
            }
        });
    };

    addCloseDBConnectionCallback = (res, conn: DBSvcConnectionInterface) => {
        let resEnd = res.end;

        res.end = function (): any {
            let resEndArgs: any = arguments;
            try {
                conn.close();
                logger.info("DB connection closed");
            } catch (err) {
                logger.error(`Error while closing DB connection!\n${err}`);
            }
            res.end = resEnd;
            res.end.apply(res, resEndArgs);
        };
    };
}
