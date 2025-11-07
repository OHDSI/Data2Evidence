import {
  ConnectionInterface,
  CallBackInterface,
  ParameterInterface,
  DBCommandInterface,
  flattenParameter,
  DBValues,
  formatDate,
} from "./Connection";
import { CreateLogger } from "./Logger";
import { DBError } from "./DBError";
const logger = CreateLogger();
export class NodeHDBConnection implements ConnectionInterface {

  public static createConnection(
    client: any,
    schemaName,
    vocabSchemaName = schemaName,
    callback,
  ) {
    const conn = new NodeHDBConnection(client, schemaName, vocabSchemaName);
    const sql = 'SET SCHEMA "' + schemaName + '"';
    conn.execute(sql, [], (err, data) => {
      if (err) {
        callback(new DBError(logger.error(err), err.message), null);
      } else {
        callback(null, conn);
      }
    });
  }

  /**
   * Pass the already connected client
   * Creating the connection using the constructor WILL NOT set the
   * default schema, hence usage of the constructor is discouraged.
   * @param  {any}    client
   */
  constructor(
    public conn: any,
    public schemaName,
    public vocabSchemaName,
    public dialect = "hana",
  ) {}

  public execute(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
    schemaName: string = "",
  ) {
    try {
      logger.debug(
        `Before execute, DB connection state: ${this.conn.readyState}`,
      );
      sql = this.getSqlStatementWithSchemaName(schemaName, sql);

      if (this.conn.readyState === "connected") {
        this.prepareStatementAndExecute(sql, parameters, callback);
      } else {
        this.conn.connect(err => {
          if (err) {
            logger.error(`Execute error: ${JSON.stringify(err)}`);
            callback(new DBError(logger.error(err), err.message), null);
          }
          logger.debug(
            `After initializing connection, DB connection state: ${this.conn.readyState}`,
          );
          this.prepareStatementAndExecute(sql, parameters, callback);
        });
      }
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public getTranslatedSql(sql: string, schemaName: string, parameters: ParameterInterface[]): string {
    return this.getSqlStatementWithSchemaName(schemaName, sql);
  }

  private prepareStatementAndExecute(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
  ) {
    this.conn.prepare(sql, (err, statement) => {
      if (err) {
        logger.error(`Execute error: ${JSON.stringify(err)}
                =>sql: ${sql}
                =>parameters: ${JSON.stringify(parameters)}`);
        callback(new DBError(logger.error(err), err.message), null);
      } else {
        statement.exec(flattenParameter(parameters), callback);
      }
    });
  }

  public executeQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
    schemaName: string = "",
  ) {
    try {
      this.execute(
        sql,
        parameters,
        (err, resultSet) => {
          if (err) {
            console.error(err);
            callback(err, null);
          } else {
            logger.debug(`${JSON.stringify(resultSet, null, 2)}`);
            const result = this.parseResults(resultSet, resultSet.metadata);
            callback(null, result);
          }
        },
        schemaName,
      );
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public executeStreamQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
    schemaName: string = "",
  ) {
    try {
      sql = this.getSqlStatementWithSchemaName(schemaName, sql);
      this.conn.prepare(sql, (err, statement) => {
        if (err) {
          logger.error(`Execute error: ${JSON.stringify(err)}
                    =>sql: ${sql}
                    =>parameters: ${JSON.stringify(parameters)}`);
          callback(new DBError(logger.error(err), err.message), null);
        } else {
          statement.execute(flattenParameter(parameters), (err, rs) => {
            if (err) {
              logger.error(`Execute error: ${JSON.stringify(err)}
                            =>sql: ${sql}
                            =>parameters: ${JSON.stringify(parameters)}`);
              callback(new DBError(logger.error(err), err.message), null);
            }

            const rsObjectStream = rs.createObjectStream().on("finish", () => {
              if (!rs.closed) {
                rs.close();
              }
            });

            rsObjectStream.on("error", (err: any) => {
              logger.error(err);
            });

            callback(null, rsObjectStream);
          });
        }
      });
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public executeUpdate(
    sql: string,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
  ) {
    try {
      this.execute.apply(this, arguments);
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  /**
   * execute a stored procedure
   * Check if the out parameter is of table type.If yes, move it to outparameters ( key under the result object described below)
   * @param {DBCommandInterface} proc - object that contains the schema and procedure name
   * @param {Object[]} parameters - array of parameters
   * @param {dbCallback} callback - function to pass the results as an object comprising the resultset and out parameters in this format
   * result object Structure : { hdbResultSet : <array of results>,  //array of $.hdb.ResultSet returned by the stored procedure
   *                              outParameters : <Object keys of out parameters> //Out Parameters of the stored procedure
   *                          }
   */
  public executeProc(
    procedure: string,
    args: any[],
    callback: CallBackInterface,
  ) {
    try {
      const params = args.map(param => "?");
      const sql = `CALL \"${procedure}\" (${params.join()})`;
      this.conn.prepare(sql, (err, statement) => {
        if (err) {
          callback(new DBError(logger.error(err), err.message), null);
          return;
        }
        statement.exec(args, (err, parameters, results) => {
          if (err) {
            callback(new DBError(logger.error(err), err.message), null);
            return;
          }
          callback(null, results);
        });
      });
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public commit(callback?: CallBackInterface) {
    this.conn.commit(commitError => {
      if (commitError) {
        throw commitError;
      }
      if (callback) {
        callback(
          new DBError(logger.error(commitError), commitError.message),
          null,
        );
      }
    });
  }

  public setAutoCommitToFalse() {
    this.conn.setAutoCommit(false);
  }

  public rollback(callback: CallBackInterface) {
    this.conn.rollback(err => {
      if (err) {
        err.code = "ECOMMIT";
        return callback(new DBError(err.code, err.message), null);
      } else {
        callback(null, true);
      }
    });
  }

  /**
   * Parses resultset, only converting null column values to 'NoValue'. Not converting the
   * other types since there is NO resultset metadata available.
   * @param resultSet - result set from db call
   * @param metadata - not required, can be null
   */
  public parseResults(result: any, metadata: any) {
    function formatResult(columnKey: string, value: any) {
      if (!metadata) {
        return value;
      }

      switch (getType(columnKey)) {
        case 1: //TINYINT
        case 2: //SMALLINT
        case 3: //INTEGER
        case 4: //BIGINT
        case 5: //DECIMAL
        case 6: //REAL
          return Number(value);
        case 14: //DATE
          return `${value}T00:00:00.000Z`;
        case 16: //TIMESTAMP
          if (value.indexOf(".") > -1) {
            return `${value}Z`;
          } else {
            return `${value}.000Z`;
          }
        case 62: //SECONDDATE
          return `${value}.000Z`;
        case 15: //TIME
          return value;
        case 13: //VARBINARY
          return value.toString("hex").toUpperCase();
        case 26: // LOB
          return value.toString();
        default:
          return value;
      }
    }

    function getType(columnKey: string) {
      for (const md of metadata) {
        if (md.columnDisplayName === columnKey) {
          return md.dataType;
        }
      }
    }

    Object.keys(result).map(rowId => {
      Object.keys(result[rowId]).map(colKey => {
        if (
          result[rowId][colKey] === null ||
          typeof result[rowId][colKey] === "undefined"
        ) {
          result[rowId][colKey] = DBValues.NOVALUE;
        } else {
          result[rowId][colKey] = formatResult(colKey, result[rowId][colKey]);
        }
      });
    });

    return result;
  }

  public close() {
    if (this.conn.readyState !== "closed") {
      this.conn.close();
    }
    logger.debug(
      `After closing connection, DB connection state: ${this.conn.readyState}`,
    );
  }

  public executeBulkUpdate(
    sql: string,
    parameters: ParameterInterface[][],
    callback: CallBackInterface,
  ) {
    throw new Error("executeBulkUpdate is not yet implemented");
  }

  public executeBulkInsert(
    sql: string,
    parameters: null[][],
    callback: CallBackInterface,
  ) {
    // hdb-node module cannot accept empty strings for input into datetime columns, so replace all empty string with null values
    parameters = parameters.map(row => {
      return row.map(val => {
        return val === "" ? null : val;
      });
    });

    try {
      logger.debug(`Sql: ${sql}`);
      this.conn.prepare(sql, (err: Error, statement: any) => {
        if (err) {
          logger.error(
            `Execute error: ${JSON.stringify(err)})
                 => sql: ${sql}
                 => parameters: ${JSON.stringify(parameters)}`,
          );
          callback(err, null);
        } else {
          //Run bulk insert statement in chunks as hdb-node module will hang if doing bulk insert on large amounts of rows
          const rowCount: number = parameters.length;
          const chunkSize: number = 50000;
          const chunkCount: number = Math.ceil(rowCount / chunkSize);

          for (let j = 0; j < chunkCount; j++) {
            const start = j * chunkSize;
            const end = start > rowCount ? rowCount : (j + 1) * chunkSize;
            statement.exec(
              parameters.slice(start, end),
              (err: Error, affectedRows: any) => {
                if (err) {
                  logger.error(`Error inserting chunk ${j + 1}`);
                  callback(err, null);
                } else {
                }
                // Get number of rows inserted from affectedRows as it can either be array or number
                const rowsInserted = Array.isArray(affectedRows)
                  ? affectedRows.length
                  : affectedRows;
                logger.info(
                  `Inserted ${rowsInserted} rows for chunk ${
                    j + 1
                  }/${chunkCount}`,
                );

                // After successfully loading all chunks
                if (j + 1 === chunkCount) {
                  callback(null, true);
                }
              },
            );
          }
        }
      });
    } catch (err) {
      callback(err, null);
    }
  }

  /**
   * This methods sets the current application user to the DB session (i.e. SESSION_CONTEXT).
   * This method must be called in the respective endpoints before performing any queries involving the guarded patients.
   */
  public setCurrentUserToDbSession(user: string, cb: CallBackInterface) {
    try {
      const query = `SET '${DBValues.DB_APPUSER_KEY}' = '${user}'`;
      this.executeUpdate(query, [], cb);
    } catch (e) {
      cb(e, null);
    }
  }

  /**
   * This methods sets the dataset release date to the DB session (i.e. SESSION_CONTEXT).
   * This method must be called in the respective endpoints before performing any queries against the datasets.
   */
  public setTemporalSystemTimeToDbSession(
    systemTime: string,
    cb: CallBackInterface,
  ) {
    // if the dataset release date is not send, initialize system time with current data (UTC format)
    if (!systemTime) {
      systemTime = new Date().toISOString();
    }
    try {
      const query = `SET '${DBValues.DB_TEMPORAL_SYSTEM_TIME}' = '${systemTime}'`;
      this.executeUpdate(query, [], cb);
    } catch (e) {
      cb(e, null);
    }
  }

  private getSqlStatementWithSchemaName(
    schemaName: string,
    sql: string,
  ): string {
    const replacement = schemaName === "" ? "" : `${schemaName}.`;
    return sql.replace(/\$\$SCHEMA\$\$./g, replacement);
  }
}
