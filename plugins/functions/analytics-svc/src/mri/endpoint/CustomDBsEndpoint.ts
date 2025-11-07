import { Logger, QueryObject as qo } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import QueryObject = qo.QueryObject;
import { Connection as connLib, utils } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;

const log = CreateLogger("analytics-log");
let tableNamesQueryString = `SELECT TABLE_NAME FROM PUBLIC."TABLES" WHERE SCHEMA_NAME = '%s'`;
let tableDataQueryString = `SELECT * FROM %schemaName.%tableName`;

export class CustomDBsEndpoint {
    constructor(public connection: ConnectionInterface) {}

    // get list of tables from a given schema
    public async getTablenames(schemaName: string) {
        log.debug("debugging");
        log.info("infoing");
        const finalQueryString = tableNamesQueryString.replace(
            /%s/,
            schemaName
        );
        const query = QueryObject.format(finalQueryString);

        const result: String[] = await query
            .executeQuery(this.connection)
            .then((result: any) => {
                return result.data.map((el) => el.TABLE_NAME);
            })
            .catch((err) => {
                log.error("Failed to query table names");
                return err;
            });

        return result;
    }

    // get table data from schema and table name
    public async getTableData(schemaName: string, tableName: string) {
        const finalQueryString = tableDataQueryString
            .replace(/%schemaName/, schemaName)
            .replace(/%tableName/, tableName);
        const query = QueryObject.format(finalQueryString);

        const result: object[] = await query
            .executeQuery(this.connection)
            .then((result: any) => {
                return result;
            })
            .catch((err) => {
                log.error("Failed to query table data");
                log.error(err);
                return err;
            });

        return result;
    }
}
