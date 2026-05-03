import pg from 'pg'
const { Pool } = pg
// Setting MAX_PACKET_SIZE in node-hdb prevents failure of large sql statements https://github.com/SAP/node-hdb/issues/19
/* tslint:disable no-var-requires */
//require("hdb/lib/protocol/common/Constants").MAX_PACKET_SIZE = Math.pow(2, 30);
import * as hdb from "hdb";
import { PostgresConnection } from "./PostgresConnection"
import { NodeHDBConnection } from "./NodeHDBConnection"

import { User } from "./User"

import { CreateLogger } from "./Logger";
import { ConnectionInterface } from "./Connection";
import { IDBCredentialsType, IMRIDBRequest } from "./types";
import { NodeCleanup } from "./NodeCleanup";
import { QueryObject } from "./QueryObject";
const logger = CreateLogger("DBConnectionUtil");

export class DBConnectionUtil {
    static pool: Pool;

    /**
     * @param cb Callback is typically used by tests
     */
    public static async getDbClient(credentials: IDBCredentialsType, cb?) {
        return new Promise((resolve, reject) => {
            if (credentials.dialect === "postgresql") {
                if (!DBConnectionUtil.pool) {
                    DBConnectionUtil.pool = new Pool(credentials);
                    DBConnectionUtil.pool.on("connect", (client) => {
                        const sql = `SET search_path TO ${credentials.schema};`;
                        client.query(sql, [], (err) => {
                            if (err) {
                                return logger.error(err);
                            }

                            logger.info(`Schema set to: ${credentials.schema}`);
                        });
                    });
                    DBConnectionUtil.pool.on("error", (err: any, client) => {
                        // Verbose diagnostic: surface enough context to root-cause "Connection terminated"
                        // events that aren't logged by the pg server.
                        const pool = DBConnectionUtil.pool as any;
                        logger.error(
                            `[PG_POOL_ERROR] message="${err?.message}" ` +
                            `code="${err?.code}" errno="${err?.errno}" syscall="${err?.syscall}" ` +
                            `address="${err?.address}" port="${err?.port}" ` +
                            `pool_total=${pool?.totalCount} pool_idle=${pool?.idleCount} pool_waiting=${pool?.waitingCount} ` +
                            `client_processID=${(client as any)?.processID}`
                        );
                        if (err?.stack) {
                            logger.error(`[PG_POOL_ERROR] stack: ${err.stack}`);
                        }
                        if (client && typeof client.release === "function") {
                            try {
                                client.release(true);
                            } catch (releaseErr) {
                                logger.error(`[PG_POOL_ERROR] client.release(true) threw: ${releaseErr}`);
                            }
                        }
                    });
                    DBConnectionUtil.pool.on("remove", (client: any) => {
                        const pool = DBConnectionUtil.pool as any;
                        logger.info(
                            `[PG_POOL_REMOVE] processID=${client?.processID} ` +
                            `pool_total=${pool?.totalCount} pool_idle=${pool?.idleCount} pool_waiting=${pool?.waitingCount}`
                        );
                    });
                    

                    NodeCleanup((_, eventType) => {
                            if (DBConnectionUtil.pool) {
                                DBConnectionUtil.pool
                                .end()
                                .catch((err) => logger.error(err))
                                .then(() => logger.info("PG pool has ended"))
                                .finally(() => process.exit(eventType))
                            }else {
                                process.exit(eventType)
                            }
                            
                    });
                }
                if (cb) { cb(null, DBConnectionUtil.pool); }
                return resolve(DBConnectionUtil.pool);
            }
            const client = hdb.createClient(credentials);
            if (cb) { cb(null, client); }
            client.on("error", (err) => {
                logger.error(err);
            });
            logger.debug(`After connection creation, DB connection state: ${client.readyState}`); // new

            resolve(client);
        });
    }

    public static getConnection(dialect: string, client: any, schemaName: string, vocabSchemaName?: string, resultsSchemaName?: string, cb?, userObj?: User): Promise<ConnectionInterface> {
        return new Promise((resolve, reject) => {
            const callback = cb || ((err, connection) => {
                if (err) {
                    return reject(err);
                }
                resolve(connection);
            });
            if (dialect === "postgresql") {
                // PostgresConnection is currently only being used by cdw-svc, mri-pa-config and bookmark-svc for connection to postgres config database
                PostgresConnection.createConnection(client, schemaName, vocabSchemaName, resultsSchemaName, callback);
            } else {
                NodeHDBConnection.createConnection(client, schemaName, vocabSchemaName, resultsSchemaName, async (err, connection: ConnectionInterface) => {
                    if (err) {
                        return callback(err);
                    }

                    if (client._settings.authentication_mode && client._settings.authentication_mode === "JWT") {
                        //Get xs_appuser & set the value as cohort schema, since the username and owner schema name are the same in Hana
                        const DB_USER_NAME = await connection.getApplicationUser();
                        connection.setCohortSchemaName(DB_USER_NAME)
                    }

                    //Set APPLICATIONUSER
                    if (userObj && (userObj.getEmail() || userObj.getUser())) {
                        connection.setCurrentUserToDbSession(userObj.getEmail() || userObj.getUser(), () => {
                            callback(null, connection);
                        })
                    } else {
                        logger.debug("No user supplied. Cannot set HANA Connection APPLICATIONUSER");
                        return callback(null, connection);
                    }
                });
            }
        });
    }

    public static getDBConnection({ credentials, schemaName, vocabSchemaName, resultsSchemaName, userObj }:
        { credentials: IDBCredentialsType; schemaName: string, vocabSchemaName?: string, resultsSchemaName?: string, userObj?: User}) {

        return new Promise<ConnectionInterface>(async (resolve, reject) => {
            try {
                const client = await DBConnectionUtil.getDbClient(credentials);
                const connection  = await DBConnectionUtil.getConnection(credentials.dialect, client, schemaName, vocabSchemaName, resultsSchemaName, null, userObj);
                return resolve(connection);
            } catch (err) {
                logger.error(err);
                reject(err);
            }
        });
    }

    public static cleanupMiddleware() {
        return (req: IMRIDBRequest|any, res, next) => {
            const resEnd = res.end;
            res.end = (...resEndArgs) => {
                try {
                    Object.keys(req.dbConnections).forEach((connectionName: string) => {
                        const connection: ConnectionInterface = req.dbConnections[connectionName];
                        if (connection) {
                            connection.close();
                        }
                    });
                } catch (err) {
                    logger.error(err);
                }
                res.end = resEnd;
                res.end.apply(res, resEndArgs);
            };
            next();
        };
    }

}
