import { Logger, Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CreateLogger = Logger.CreateLogger;
import {
    SnapshotTableMetadata,
    SnapshotColumnMetadata,
    SnapshotSchemaMetadata,
} from "../utils/DBSvcTypes";

const logger = CreateLogger("analytics-log");

export class DBDAO {
    public connection: ConnectionInterface;

    constructor(conn: ConnectionInterface) {
        this.connection = conn;
    }

    public getCDMVersion = async (schemaName: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            this.connection.executeQuery(
                `SELECT CDM_VERSION FROM ${schemaName}.CDM_SOURCE`,
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

    private _clearTrexPgCache = async (): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            if (this.connection.constructor.name === "TrexConnection") {
                const sql = "CALL pg_clear_cache();";
                this.connection.executeQuery(
                    sql,
                    [],
                    (err: any, result: string) => {
                        if (err) {
                            logger.info(err);
                            return reject(err);
                        } else {
                            if (result.length > 0) {
                                resolve(true);
                            } else {
                                resolve(true);
                            }
                        }
                    }
                );
            } else {
                // do nothing
            }
        });
    };

    public checkIfSchemaExists = async (
        databaseName: string,
        schemaName: string
    ): Promise<boolean> => {
        // TODO: Remove this._clearTrexPgCache(). Currently this hotfix works for postgres but not bigquery
        // https://github.com/OHDSI/Data2Evidence/issues/1149
        // This is currently required as __srcdb connections in trex sql is not aware of schemas created after its ATTACH
        await this._clearTrexPgCache();
        return new Promise((resolve, reject) => {
            let sql, sqlParams;
            if (this.connection.constructor.name === "TrexConnection") {
                sql = `
                select
                    schema_name as SCHEMA_NAME
                from
                    information_schema.schemata
                where
                    catalog_name =?
                    and schema_name =?`;
                // Use direct_connection_suffix instead of databaseName as checking if schema exists is only used in the context of the source database
                sqlParams = [
                    { value: `${databaseName}__srcdb` },
                    { value: schemaName },
                ];
            } else {
                sql = `SELECT SCHEMA_NAME FROM SCHEMAS WHERE SCHEMA_NAME=?`;
                sqlParams = [{ value: schemaName }];
            }
            this.connection.executeQuery(
                sql,
                sqlParams,
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
    public getSnapshotSchemaMetadata = (
        databaseName: string,
        schemaName: string
    ) => {
        return new Promise(async (resolve, reject) => {
            try {
                const tables: string[] = await this.getSnapshotSchemaTables(
                    databaseName,
                    schemaName
                );
                let snapshotSchemaMetadata = <SnapshotSchemaMetadata>{
                    schemaName,
                    schemaTablesMetadata: [],
                };

                await Promise.all(
                    tables.map(async (table) => {
                        let tableMetadata =
                            await this.getSnapshotSchemaTableMetadata(
                                databaseName,
                                schemaName,
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
    private getSnapshotSchemaTables = (
        databaseName: string,
        schemaName: string
    ) => {
        return new Promise<string[]>((resolve, reject) => {
            let sql, sqlParams;
            if (this.connection.constructor.name === "TrexConnection") {
                sql = `
                SELECT table_name as TABLE_NAME from information_schema.tables 
                WHERE
                    table_catalog=?
                    AND table_schema=?
                    AND (TABLE_NAME NOT IN ('databasechangelog', 'databasechangeloglock'));`;
                sqlParams = [{ value: databaseName }, { value: schemaName }];
            } else {
                sql = `
                SELECT TABLE_NAME FROM SYS.M_TABLES
                WHERE 
                  SCHEMA_NAME=?
                  AND (TABLE_NAME NOT IN ('DATABASECHANGELOG', 'DATABASECHANGELOGLOCK'));`;
                sqlParams = [{ value: schemaName }];
            }
            this.connection.executeQuery(
                sql,
                sqlParams,
                (err: any, result: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        logger.info(
                            `Retrieved schema snapshot tables for Schema: ${schemaName}`
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
        databaseName: string,
        schemaName: string,
        table: string
    ) => {
        return new Promise<SnapshotTableMetadata>((resolve, reject) => {
            let sql, sqlParams;
            if (this.connection.constructor.name === "TrexConnection") {
                sql = `
                    SELECT
                        c.table_schema as "SCHEMA_NAME",
                        c.table_name as "TABLE_NAME",
                        c.column_name as "COLUMN_NAME",
                        case
                            when c.is_nullable = 'YES' then 'TRUE'
                            else 'FALSE'
                        end as "IS_NULLABLE",
                        case
                            when tc.constraint_type = 'PRIMARY KEY' then 'TRUE'
                            else 'NoValue'
                        end as "IS_PRIMARY_KEY",
                        case
                            when tc.constraint_type = 'FOREIGN KEY' then 'TRUE'
                            else 'NoValue'
                        end as "IS_FOREIGN_KEY"
                    FROM
                        information_schema.columns as c
                        LEFT JOIN information_schema.key_column_usage AS kcu ON (
                            kcu.table_name = c.table_name
                            AND kcu.table_catalog = c.table_catalog
                            AND kcu.table_schema = c.table_schema
                            AND kcu.column_name = c.column_name
                        )
                        LEFT JOIN information_schema.constraint_column_usage AS ccu ON (
                            ccu.table_name = c.table_name
                            AND ccu.table_catalog = c.table_catalog
                            AND ccu.table_schema = c.table_schema
                            AND ccu.column_name = c.column_name
                        )
                        left join information_schema.table_constraints AS tc ON (
                            tc.constraint_name = kcu.constraint_name
                            AND tc.table_catalog = kcu.table_catalog
                            AND tc.table_schema = kcu.table_schema
                        )
                    where
                        c.table_catalog = $1
                        and c.table_schema = $2
                        and c.table_name = $3
                `;
                // Use direct_connection_suffix instead of databaseName as snapshot metadata like NOT NULL, PKEY, FKEY is missing in cache.
                // Therefore querying the direct database for this information is required
                sqlParams = [
                    { value: `${databaseName}__srcdb` },
                    { value: schemaName },
                    { value: table },
                ];
            } else {
                sql = `SELECT tc.SCHEMA_NAME, tc.TABLE_NAME, tc.COLUMN_NAME, tc.IS_NULLABLE, c.IS_PRIMARY_KEY, rc.COLUMN_NAME AS IS_FOREIGN_KEY FROM SYS.TABLE_COLUMNS AS tc LEFT JOIN SYS."CONSTRAINTS" AS c ON (tc.TABLE_NAME=c.TABLE_NAME AND tc.SCHEMA_NAME=c.SCHEMA_NAME AND tc.COLUMN_NAME=c.COLUMN_NAME) LEFT JOIN SYS."REFERENTIAL_CONSTRAINTS" AS rc ON (tc.TABLE_NAME=rc.TABLE_NAME AND tc.SCHEMA_NAME=rc.SCHEMA_NAME AND tc.COLUMN_NAME=rc.COLUMN_NAME) WHERE tc.SCHEMA_NAME = ? AND tc.TABLE_NAME = ?;`;
                sqlParams = [{ value: schemaName }, { value: table }];
            }
            this.connection.executeQuery(
                sql,
                sqlParams,
                (err: any, result: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        logger.info(
                            `Retrieved schema snapshot table metadata for Table: ${table} in Schema: ${schemaName}`
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
}
