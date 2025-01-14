import { Logger } from "@alp/alp-base-utils";
import fs from "fs";
import CreateLogger = Logger.CreateLogger;
import { Connection as connLib } from "@alp/alp-base-utils";
import { DcReplacementConfig } from "../../types";
import ConnectionInterface = connLib.ConnectionInterface;
import { fileURLToPath } from "node:url";
import { dirname, normalize, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

const logger = CreateLogger("analytics-log");

export class DataCharacterizationEndpoint {
    constructor(public connection: ConnectionInterface) {}

    private getSqlStatementFromFile = (
        sqlFileName: string,
        replacementConfig: DcReplacementConfig
    ): string => {
        let sqlStatement = fs.readFileSync(sqlFileName).toString();
        for (const [key, value] of Object.entries(replacementConfig)) {
            const regex = new RegExp(`@${key}`, "gi");
            sqlStatement = sqlStatement.replace(regex, value);
        }
        return sqlStatement;
    };

    public executeDcResultsSql = (
        dbConnection: ConnectionInterface,
        sqlFilePath: string,
        dcReplacementConfig: DcReplacementConfig
    ) => {
        const SQL_BASE_PATH = "../../db/sql/data-characterization/";
        const sqlStatement = this.getSqlStatementFromFile(
            normalize(join(__dirname, SQL_BASE_PATH, sqlFilePath)),
            dcReplacementConfig
        );
        return new Promise(async (resolve, reject) => {
            dbConnection.executeQuery(
                sqlStatement,
                [],
                (err: any, result: any) => {
                    if (err) {
                        logger.error(
                            "============================================="
                        );
                        logger.error(sqlStatement);
                        logger.error(
                            `Failed to run SQL script: ${sqlFilePath}`
                        );
                        logger.error(err);
                        logger.error(
                            "============================================="
                        );
                        return reject(err);
                    }
                    console.log("Done: ", sqlFilePath);
                    resolve(result);
                }
            );
        });
    };
}
