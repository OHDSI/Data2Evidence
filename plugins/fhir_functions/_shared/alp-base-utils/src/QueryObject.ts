import * as crypto from "crypto";
import { escapeRegExp, createGuid, assert, cloneJson } from "./utils";
import { Connection as connLib, DBError } from "./index";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import { CreateLogger } from "./Logger";
import { QueryObjectResultType } from "./types";

const logger = CreateLogger("queryObject");

function replaceAll(input, find, replace) {
  return input.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

/**
 * Constructor for query object.
 *
 * The QueryObject class encapsulates an SQL query, along
 * with any parameter values to be substituted in a a corresponding
 * prepared statement.
 *
 * @param {String}  queryString           sql query with value placeholders (optional, defaults to "")
 * @param {Array}   parameterPlaceholders array holding sql parameters (placeholders) to be inserted (optional, defaults to empty array)
 * @param {Boolean} sqlReturnOn           boolean flag indicating whether the result object contains the sql query (optional, defaults to
 *                                        settings.sqlReturnOn if present, otherwise false)
 */
export class QueryObject {
  /**
   * Generate a placeholder object with a random key.
   */
  public static generateParameterQueryObject(value, type) {
    const parPlaceholder = QueryObject.generateParameterPlaceholder(
      value,
      type,
    );
    return new QueryObject(parPlaceholder.key, [parPlaceholder]);
  }

  public static generateParameterPlaceholder(value, type) {
    const varType = type || "text";
    const parameterPlaceholder = {
      key: "{" + createGuid() + "}",
      value,
      type: varType,
    };
    return parameterPlaceholder;
  }

  public static formatDict(sqlStr: string, dict): QueryObject {
    const collectedParameters = [];
    function matchHandler(match, varname, type) {
      assert(
        dict.hasOwnProperty(varname),
        `Could not format string: Did not find key "${varname}" in object.`,
      );
      collectedParameters.push(dict[varname]);
      return "%" + type;
    }

    const newSql = sqlStr.replace(
      /%\(([^)]+)\)(s|f|t|l|Q|UNSAFE)/g,
      matchHandler,
    );

    return QueryObject.format.apply(null, [newSql].concat(collectedParameters));
  }

  //
  // Takes a string and additional parameters and formats it:
  //
  // Examples
  //
  // format("SELECT %UNSAFE FROM TABLE WHERE X = '%s'", fieldName, userInput)
  //
  // Escape user input
  // %s -> string
  // %f -> number
  // %t -> time or date
  // %l -> int for limit and offset
  //
  // %Q : query object
  //
  // literal inclusion of string
  // %UNSAFE
  //
  // NOTE: If a large number of pars are sent (not fixed, maybe >50k), `Uncaught RangeError: Maximum call stack size exceeded` may be seen
  // https://stackoverflow.com/questions/22747068/is-there-a-max-number-of-arguments-javascript-functions-can-accept
  public static format(sqlStr: string, ...pars): QueryObject {
    const typeMap = {
      "%s": "text",
      "%UPPERs": "text",
      "%t": "time",
      "%f": "num",
      "%l": "integer",
      "%b": "buffer",
    };

    // get the additional parameters of the call

    let parameterPlaceholders = [];
    let numMatch = 0;

    function matchHandler(match) {
      assert(numMatch < pars.length, "not enough parameters for formatting");
      let result;
      let q;
      if (match === "%UNSAFE") {
        result = pars[numMatch];
      } else if (match === "%Q") {
        q = pars[numMatch];
        assert(
          q instanceof QueryObject,
          "formatter %q should be filled with a query object",
        );
        parameterPlaceholders = parameterPlaceholders.concat(
          q.parameterPlaceholders,
        );
        result = q.queryString;
      } else {
        const type = typeMap[match];
        let value = pars[numMatch];
        if (match === "%UPPERs") {
          value = value.toUpperCase();
        }
        const p = QueryObject.generateParameterPlaceholder(value, type);
        parameterPlaceholders.push(p);
        result = p.key;
      }

      numMatch++;
      return result;
    }

    const newSql = sqlStr.replace(
      /%s|%f|%t|%l|%Q|%b|%UPPERs|%UNSAFE/g,
      matchHandler,
    );

    assert(
      numMatch === pars.length,
      "not enough placeholders to include all parameters",
    );

    return new QueryObject(newSql, parameterPlaceholders);
  }

  public identifierMap = {};

  constructor(
    public queryString?: string,
    public parameterPlaceholders?: any,
    public sqlReturnOn?: boolean,
  ) {
    this.queryString = queryString || "";
    this.parameterPlaceholders = parameterPlaceholders || [];

    // implements priority of passed value over global settings value over default value, similar to
    // "this.sqlReturnOn = sqlReturnOn || settings.sqlReturnOn || false" which fails in cases where variables eval to false
    this.sqlReturnOn =
      sqlReturnOn || (Deno.env.get("SQL_RETURN_ON") === "true" ? true : false);
  }

  public shortId(): string {
    return crypto.randomBytes(4).toString("hex");
  }

  public clone() {
    const clonedParPlaceholders = this.parameterPlaceholders.map(cloneJson);
    return new QueryObject(
      this.queryString,
      clonedParPlaceholders,
      this.sqlReturnOn,
    );
  }

  /**
   * Concatenate another QueryObject onto this object.
   */
  public concat(otherQuery: QueryObject): QueryObject {
    // this is to avoid additional newlines when concatenating
    // empty queries
    if (!otherQuery.queryString) {
      return this;
    }
    if (!this.queryString) {
      return otherQuery;
    }
    return new QueryObject(
      this.queryString + "\n" + otherQuery.queryString,
      this.parameterPlaceholders.concat(otherQuery.parameterPlaceholders),
      this.sqlReturnOn && otherQuery.sqlReturnOn,
    );
  }

  /**
   * Concatenate an array of QueryObjects using a fixed concatenation string
   * (cf. the join() function for strings).
   */
  public join(queryObjects: QueryObject[]): QueryObject {
    assert(
      this.parameterPlaceholders.length === 0,
      "cannot use join on a query object with placeholders",
    );
    const strings = queryObjects.map(qO => {
      return qO.queryString;
    });
    const parameterLists = queryObjects.map(qO => {
      return qO.parameterPlaceholders;
    });
    const sqlReturnValues = queryObjects.map(qO => {
      return qO.sqlReturnOn;
    });

    const joinedPlaceholders = [].concat.apply([], parameterLists);
    const joinedString = strings.join(this.queryString);
    const joinedSqlReturnOn =
      this.sqlReturnOn && sqlReturnValues.every(Boolean);
    return new QueryObject(joinedString, joinedPlaceholders, joinedSqlReturnOn);
  }

  /**
   * Same as join, but filters out falsy entries and empty query objects first.
   */
  public joinNonEmpty(queryObjects: QueryObject[]): QueryObject {
    queryObjects = queryObjects.filter(
      (q: QueryObject, index: number, array: QueryObject[]) => {
        return q && q.queryString && q.queryString != null;
      },
    );
    return this.join(queryObjects);
  }

  /**
   * Prepare the SQL for execution by replacing named placeholders with question marks and ordering the corresponding values.
   */
  public _prepareQuery(): any {
    const result = { sql: "", placeholders: [] };
    const unflattenedPlaceholders = {};
    this.parameterPlaceholders.forEach(elem => {
      unflattenedPlaceholders[elem.key] = {
        type: elem.type,
        value: elem.value,
      };
    });
    result.sql = this.queryString.replace(/(\{[\w,\-]+\})/g, (dummy, match) => {
      const param = unflattenedPlaceholders[match];

      // Here we treat numerical values differently by explicitly inserting them into the query string, i.e.
      // not using ? and setFloat etc. The reason is that we need to circumvent some limitations
      // of prepared statements. For example, the following statement does not work as a prepared statements
      //
      // SELECT 1 + ? FROM DUMMY
      // GROUP BY 1 + ?
      //
      // because the two ?s would need to be replaced by the *same* value.
      // Another example is
      // SELECT 1 + ? FROM DUMMY
      // WHERE ? <= 1
      //
      // which does not work when called with the float 1.2
      if (param.type === "num") {
        if (typeof param.value === "number") {
          return param.value.toString();
        } else {
          throw new Error("Expected a number");
        }
      } else {
        result.placeholders.push(unflattenedPlaceholders[match]);
        return "?";
      }
    });

    return result;
  }

  public isEmpty(): boolean {
    return this.queryString === "";
  }

  public execute(
    connection: ConnectionInterface,
    callback: CallBackInterface,
    schemaName: string = "",
  ): void {
    try {
      const preparedQuery = this._prepareQuery();
      const shortenedQuery = this.shortenIdentifier(preparedQuery.sql);
      connection.execute(
        shortenedQuery,
        preparedQuery.placeholders,
        callback,
        schemaName,
      );
    } catch (err) {
      callback(new DBError.DBError(logger.error(err), err.message), null);
    }
  }

  /**
   * Execute a query and return the result set.
   *
   * Output Format of result.data is
   * [
   * {<columnName1>: <value1>, <columnName2>: <value2>, ...}, // row 0
   * {<columnName1>: <value1>, <columnName2>: <value2>, ...}, // row 1
   * ...
   * ]
   * @param   {Object}   connection DB connection object
   * @returns {Promise<QueryObjectResultType<T>>} an object {"data": <data>, "sql": <query>,
   * "sqlParameters": <queryPlaceholders>} where <data> contains the actual result
   *                   formatted as above and <sql>/<sqlParameters>
   *                   optionally contain the used query.
   */
  public executeQuery<T>(
    connection: ConnectionInterface,
    callback?: CallBackInterface,
    schemaName?: string,
  ): Promise<QueryObjectResultType<T>> {
    const run = (internalCallback: CallBackInterface) => {
      const preparedQuery = this._prepareQuery();

      const _process = resultData => {
        const result: any = { data: resultData };
        if (this.sqlReturnOn) {
          result.sql = connection.getTranslatedSql(
            preparedQuery.sql,
            schemaName || connection.schemaName,
            preparedQuery.placeholders,
          );
          result.sqlParameters = preparedQuery.placeholders.map(p => p.value);
          logger.debug(`
          ${result.sql}
          ${result.sqlParameters}
          `);
        }
        return result;
      };

      const shortenedQuery = this.shortenIdentifier(preparedQuery.sql);

      connection.executeQuery(
        shortenedQuery,
        preparedQuery.placeholders,
        (err, resultData) => {
          if (err) {
            internalCallback(err, null);
          } else {
            this.remapIdentifiers(resultData);
            internalCallback(err, _process(resultData));
          }
        },
        schemaName,
      );
    };

    return new Promise<QueryObjectResultType<T>>((resolve, reject) => {
      if (callback) {
        return run(callback);
      }

      run((err, result) => {
        try {
          if (err) {
            return reject(err);
          }
          resolve(result);
        } catch (err) {
          reject(new DBError.DBError(logger.error(err), err.message));
        }
      });
    });
  }

  public executeStreamQuery<T>(
    connection: ConnectionInterface,
    schemaName: string = "",
  ): Promise<QueryObjectResultType<T>> {
    const run = (internalCallback: CallBackInterface) => {
      const preparedQuery = this._prepareQuery();

      const _process = stream => {
        const result: any = { data: stream };

        if (this.sqlReturnOn) {
          result.sql = preparedQuery.sql;
          result.sqlParameters = preparedQuery.placeholders.map(p => p.value);
        }
        return result;
      };

      const shortenedQuery = this.shortenColumnAliasForQuery(preparedQuery.sql);

      connection.executeStreamQuery(
        shortenedQuery,
        preparedQuery.placeholders,
        (err, stream) => {
          if (err) {
            return internalCallback(err, null);
          }
          internalCallback(err, _process(stream));
        },
        schemaName,
      );
    };

    return new Promise<QueryObjectResultType<T>>((resolve, reject) => {
      run((err, result) => {
        try {
          if (err) {
            return reject(err);
          }
          resolve(result);
        } catch (err) {
          reject(new DBError.DBError(logger.error(err), err.message));
        }
      });
    });
  }

  public shortenColumnAliasForQuery(query: string): string {
    const match = query.match(/"patient\.[^"]+"/g);

    if (match) {
      const columnAliasList = match.filter((value, index, self) => {
        // distinct
        if (value.search(".attributes.") > -1) {
          return self.indexOf(value) === index;
        }
      });

      for (let i = 0; i < columnAliasList.length; i++) {
        const shortenColumnAlias = columnAliasList[i].split(".").pop();
        query = query.replace(
          columnAliasList[i],
          `"${shortenColumnAlias.toLowerCase()}`,
        );
      }
    }

    return query;
  }

  public shortenIdentifier(query: string): string {
    let guid;
    this.identifierMap = {};
    const match = query.match(/"patient\.[^"]+"/g);
    if (!match) {
      return query;
    }
    const identifier = match.filter((value, index, self) => {
      // distinct
      return self.indexOf(value) === index;
    });

    for (let i = 0; i < identifier.length; i++) {
      guid = this.shortId();
      query = replaceAll(query, identifier[i], `"${guid}"`);
      this.identifierMap[guid] = identifier[i].slice(1, -1);
    }
    return query;
  }

  /**
   * Execute a query that modifies the DB and return the number of rows affect.
   */
  public executeUpdate(
    connection: ConnectionInterface,
    callback,
    schemaName?: string,
  ) {
    try {
      const preparedQuery = this._prepareQuery();
      const shortenedQuery = this.shortenIdentifier(preparedQuery.sql);
      connection.executeUpdate(
        shortenedQuery,
        preparedQuery.placeholders,
        callback,
        schemaName,
      );
    } catch (err) {
      callback(new DBError.DBError(logger.error(err), err.message), null);
    }
  }

  /**
   * Execute a query that modifies the DB and return the number of rows affect.
   */
  public executeUpdateAsync(
    connection: ConnectionInterface,
    schemaName?: string,
  ) {
    return new Promise((resolve, reject) => {
      try {
        const preparedQuery = this._prepareQuery();
        const shortenedQuery = this.shortenIdentifier(preparedQuery.sql);
        connection.executeUpdate(
          shortenedQuery,
          preparedQuery.placeholders,
          (err, result) => {
            if (err) {
              return reject(err);
            }
            resolve(result);
          },
          schemaName,
        );
      } catch (err) {
        reject(new DBError.DBError(logger.error(err), err.message));
      }
    });
  }

  /**
   * Remap identifiers of db query to result
   */
  public remapIdentifiers(result) {
    for (let i = 0; i < result.length; i++) {
      for (const j in result[i]) {
        const mappedVal = this.identifierMap[j] || "";
        if (mappedVal) {
          result[i][mappedVal] = result[i][j];
          delete result[i][j];
        }
      }
    }
  }
}
