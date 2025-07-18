import * as _async from "npm:async";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import * as Utils from "./Utils";
import { env } from "../../configs";
export class DbMeta {
  constructor(public connection: ConnectionInterface) {}
  public getColumns(dbObject: string, cb: CallBackInterface) {
    const invalidErrorMsg = "HPH_CFG_GLOBAL_DB_OBJECT_INCORRECT_FORMAT";
    const defaultList = [];

    if (Utils.isValidHanaObjectName(dbObject)) {
      const parsedName = Utils.parseDbObjectName(dbObject);
      let schema = parsedName.schema
        ? parsedName.schema
        : this.connection.schemaName;
      // if (!Utils.isSchemaAllowed(schema)) {
      //   return cb(invalidErrorMsg, defaultList);
      // }
      let query = ""
      if (env.USE_DUCKDB === "true") {
        query =  `SELECT COLUMN_NAME AS \"COLUMN_NAME\" 
        from information_schema.columns 
        where table_catalog = ?::text AND TABLE_NAME = ?::text 
        UNION 
        SELECT column_name as \"COLUMN_NAME\" 
        from duckdb_columns() 
        WHERE database_name = ?::text and table_name = ?::text
        ORDER BY \"column_name\"`
      }else{
        query = `SELECT COLUMN_NAME 
        FROM TABLE_COLUMNS
        WHERE SCHEMA_NAME = ?
        AND TABLE_NAME = ?
        UNION
        SELECT COLUMN_NAME 
        FROM VIEW_COLUMNS 
        WHERE SCHEMA_NAME = ?
        AND VIEW_NAME = ?
        ORDER BY \"COLUMN_NAME\"`
      }
      this.connection.executeQuery(
       query,
        [
          { value: schema },
          { value: parsedName.tableName },
          { value: schema },
          { value: parsedName.tableName },
        ],
        (err, result: Array<{ COLUMN_NAME: string }>) => {
          if (result != null && result.length > 0) {
            cb(
              null,
              result.map((item) => ({ name: item.COLUMN_NAME }))
            );
          } else {
            cb(null, defaultList);
          }
        }
      );
    } else {
      cb(invalidErrorMsg, defaultList);
    }
  }

  public getColumnsForPlaceHolders(
    placeHolders: Array<{ key: string; value: string }>,
    cb: CallBackInterface
  ) {
    try {
      const tasks = [];
      const columnsMap = {};

      for (const i in placeHolders) {
        const key = placeHolders[i].key;
        const table = placeHolders[i].value;
        ((i, key, table) => {
          tasks.push((cb) => {
            this.getColumns(table, (err, results) => {
              if (err) {
                cb(err, null);
              }
              columnsMap[key] = results;
              cb(null);
            });
          });
        })(i, key, table);
      }

      _async.series(tasks, (err, data) => {
        if (err) {
          throw err;
        }
        cb(null, {
          result: columnsMap,
        });
      });
    } catch (err) {
      cb(err, null);
    }
  }
}
