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
                    DBConnectionUtil.pool.on("error", (err, client) => {
                        logger.error("Postgres client error: " + err);
                        client.release(true);
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

    public static getConnection(dialect: string, client: any, schemaName: string, vocabSchemaName?: string, cb?, userObj?: User): Promise<ConnectionInterface> {
        return new Promise((resolve, reject) => {
            const callback = cb || ((err, connection) => {
                if (err) {
                    return reject(err);
                }
                resolve(connection);
            });
            if (dialect === "postgresql") {
                PostgresConnection.createConnection(client, schemaName, vocabSchemaName, callback);
            } else {
                NodeHDBConnection.createConnection(client, schemaName, vocabSchemaName, async (err, connection: ConnectionInterface) => {
                    if (err) {
                        return callback(err);
                    }

                    let currentUser;

                    if (userObj) {
                        currentUser = userObj.getUser();
                    }

                    if (!currentUser) {
                        logger.debug("No user supplied. Cannot set HANA Connection APPLICATIONUSER");
                        return callback(null, connection);
                    }

                    try {
                        await QueryObject
                        .format(`SET 'APPLICATIONUSER' = '${currentUser}'`)
                        .executeUpdateAsync(connection);

                        return callback(null, connection);

                    } catch (err) {
                        callback(err);
                    }
                });
            }
        });
    }

    public static getDBConnection({ credentials, schemaName, vocabSchemaName, userObj }:
        { credentials: IDBCredentialsType; schemaName: string, vocabSchemaName?: string, userObj?: User}) {

        return new Promise<ConnectionInterface>(async (resolve, reject) => {
            try {
                const client = await DBConnectionUtil.getDbClient(credentials);
                const connection  = await DBConnectionUtil.getConnection(credentials.dialect, client, schemaName, vocabSchemaName, null, userObj);
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
