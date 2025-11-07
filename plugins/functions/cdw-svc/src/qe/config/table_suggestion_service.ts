import {
  Connection as connLib,
  Logger,
  QueryObject as qo,
} from "@alp/alp-base-utils";
import * as queryUtils from "../utils/queryutils";
import QueryObject = qo.QueryObject;
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
const log = Logger.CreateLogger();

export function processRequest(
  request,
  connection: ConnectionInterface,
  placeholderTableMap: PholderTableMapType,
  callback: CallBackInterface
) {
  getDistinctValuesForTable(connection, request, placeholderTableMap, callback);
}

function getDistinctValuesForTable(
  connection: ConnectionInterface,
  request,
  placeholderTableMap: PholderTableMapType,
  callback: CallBackInterface
) {
  try {
    const expression = request.expression;
    let table = "@INTERACTION";
    if (request.table) {
      table = request.table;
    }
    let placeholderAliasMap = JSON.parse(JSON.stringify(placeholderTableMap));
    placeholderAliasMap = {
      ...placeholderAliasMap,
      ...queryUtils.buildPlaceholderMapAliasTable(placeholderTableMap),
    };

    const aliasedRefExpression = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      expression
    );
    const sQuery = QueryObject.format(
      `SELECT DISTINCT (%UNSAFE) AS "value"
            FROM %UNSAFE %UNSAFE
            WHERE %UNSAFE IS NOT NULL
            ORDER BY "value" ASC `,
      aliasedRefExpression,
      placeholderTableMap[table],
      placeholderAliasMap[table],
      aliasedRefExpression
    );
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
