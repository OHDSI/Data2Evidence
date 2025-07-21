import {
  Connection as connLib,
  Logger,
  QueryObject as queryObjectLib,
} from "@alp/alp-base-utils";
import * as Utils from "../settings/Utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
const log = Logger.CreateLogger();

export function processRequest(
  request,
  connection: ConnectionInterface,
  placeholderTableMap,
  callback: CallBackInterface
) {
  getColumnsForTable(connection, request, placeholderTableMap, callback);
}

function getColumnsForTable(
  connection,
  request,
  placeholderTableMap,
  callback
) {
  try {
    const table = request.table;
    const mappedtable = placeholderTableMap[table];
    let tableName = mappedtable.replace(/"/g, "");
    const parsedName = Utils.parseDbObjectName(mappedtable);
    tableName = parsedName.tableName;
    let schema = parsedName.schema
      ? parsedName.schema
      : connection.schemaName;
    let query = ""
    if (this.connection.dialect === "hana") {
      query = `SELECT COLUMN_NAME as "value"
      FROM  VIEW_COLUMNS WHERE SCHEMA_NAME = %s AND VIEW_NAME = %s
      UNION
      SELECT COLUMN_NAME as "value"
      FROM  TABLE_COLUMNS WHERE SCHEMA_NAME = %s AND TABLE_NAME = %s`
    } else{
      query = `SELECT column_name as "value" 
      from information_schema.columns 
      where table_catalog = %s AND TABLE_NAME = %s 
      UNION
      SELECT column_name as "value" 
      from duckdb_columns() 
      WHERE database_name = %s and table_name = %s
      ORDER BY \"column_name\"`
    }
    const sQuery = queryObjectLib.QueryObject.format(
      query,
      schema,
      tableName,
      schema,
      tableName
    );
    log.debug(sQuery.queryString);
    sQuery.executeQuery(connection, (err, result) => {
      if (err) {
        log.error(err);
        return callback(null, { data: [] });
      }
      callback(null, result);
    });
  } catch (err) {
    log.error(err);
    callback(null, { data: [] });
  }
}
