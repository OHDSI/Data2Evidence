import { ResourceManager } from "@sap/textbundle";
import * as path from "path";
import pako from "pako";
import bcrypt from "bcryptjs";
import { ILogger } from "./Logger";
import { Logger } from "winston";
import * as base64 from "base64";
import { Buffer } from "node:buffer";

const rm = new ResourceManager(
  path.join(`${Deno.cwd()}`, "i18n", "mri", "text.properties"),
);

export function isPropExists(obj: any, prop: string) {
  return prop in obj && obj[prop];
}

export function getUniqueSeperatorString() {
  return "___";
}

/**
 * ANONYMOUS_BLOCK = wrap SQL statement a "DO BEGIN...END" clause
 * TEMP_RESULTSET = uses Temporary tables to store result sets
 * NESTED = uses nested SQL
 */

export const sqlFormat = {
  ANONYMOUS_BLOCK: 0,
  TEMP_RESULTSET: 1,
  NESTED: 2,
  COMBINE_COUNT: 3,
};

export class TextLib {
  public static getText(key, locale?, parameters?: string[]) {
    try {
      const bundle = rm.getTextBundle(locale || "en_EN");
      const text = bundle.getText(key, parameters);
      return text;
    } catch (e) {
      console.log("MSG>> " + e);
    }
    return key;
  }

  public static getText2(textbundle, key, locale?, parameters?: string[]) {
    const bundle = new ResourceManager(textbundle).getTextBundle(
      locale || "en_EN",
    );
    const text = bundle.getText(key, parameters);
    return text;
  }
}

/**
 * Escapes a string to be used in a regex
 *
 * @param {String}
 *            json String to be escaped.
 * @returns {String} escaped String.
 *
 */
export function escapeRegExp(input) {
  return input.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Return an independent copy of a pure data object (functions will not be
 * copied).
 *
 * @param {object}
 *            json JSON object to be cloned.
 * @returns {object} Indpendent JSON clone of input.
 *
 */
export function cloneJson(json) {
  return JSON.parse(JSON.stringify(json));
}

export function extend(obj, def) {
  const res = cloneJson(obj || {});
  for (const prop in def || {}) {
    if (!res.hasOwnProperty(prop)) {
      res[prop] = def[prop];
    }
  }
  return res;
}

// Syntactic check of path to prevent sql injection.  This does not check
// whether the path actually exists in the config.  It just checks
// character ranges and formating.
//
// This is used e.g. for Kaplan-Meier to validate the kmEventIdentifier
//
export function validateRequestPath(path) {
  const pieces = path.split(".");

  function isPathPiece(piece) {
    return /^(\w|-)+$/.test(piece);
  }

  if (!pieces.every(isPathPiece)) {
    throw new Error("invalid request path");
  }
}

export function isEmptyObject(o) {
  return Object.keys(o).length === 0;
}

/**
 * Compares two objects recursivly to check if they are exactly equal.
 * This includes the properties as well as their values.
 * @param   {Object}  o1 First object
 * @param   {Object}  o2 Second object
 * @returns {Boolean} True, if all properties are equal.
 */
export function deepEquals(o1, o2) {
  const keys1 = Object.keys(o1).sort();
  const keys2 = Object.keys(o2).sort();
  if (keys1.length !== keys2.length) {
    return false;
  }
  let res = true;
  for (let i = 0; i < keys1.length; i++) {
    const k1 = keys1[i];
    const k2 = keys2[i];
    if (typeof o1[k1] === "object" && typeof o2[k2] === "object") {
      res = res && deepEquals(o1[k1], o2[k2]);
    } else {
      res = res && o1[k1] === o2[k2];
    }
  }
  return res;
}

export function isObject(x) {
  return typeof x === "object" && x !== null;
}

/**
 * Generate a unique ID (UID).
 *
 * @function
 * @public
 * @static
 * @returns {string} UID string
 */
export function createGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  // The fixed digit '4' indicates that this GUID was generated using random
  // numbers
  //      var dbConnection  = $.db.getConnection();
  //    var st = dbConnection.prepareStatement('SELECT SYSUUID FROM DUMMY');
  //  var rs = st.executeQuery();
  //rs.next()
  //var dbUuid = rs.getString(1);
  //dbConnection.close();
  // return dbUuid;
}

/**
 * Check if a JSON leaf object is an empty array or empty object.
 *
 * @function
 * @private
 * @name isNotEmpty
 * @param {object} value JSON request object
 * @returns {boolean} False if empty object
 *
 */
export function isNotEmpty(value) {
  const valueString = JSON.stringify(value);
  return valueString !== "[]" && valueString !== "{}";
}

/**
 * Formats error message so that it may include the error's message and stack-trace (if available) depending on the global flags
 * "errorDetailsReturnOn" and "errorStackTraceReturnOn", respectively. An optional description can be passed, which is always part of
 * the returned message. It should only contain information that can always be safely shown to the end user.
 * @param   {object} error       Error that was caught
 * @param   {String} description An optional description parameter. Only pass information which may always be safely shown to the end
 *                               user.
 * @returns {string} Error message
 */
export function formatErrorMessage(
  error,
  settingsObj: {
    getSettings(): {
      errorDetailsReturnOn: boolean;
      errorStackTraceReturnOn: boolean;
    };
  },
  description = "",
) {
  let msg = "An error occurred";
  const settings = settingsObj.getSettings();

  if (typeof description !== "undefined" && description) {
    msg += ": " + description;
  } else {
    msg += ".";
  }

  if (settings.errorDetailsReturnOn) {
    msg += "\n\n" + "Error message:\n" + error.toString();
  }

  if (settings.errorStackTraceReturnOn) {
    msg += "\n\n";
    if (error.stack) {
      msg += "Stack trace:\n" + error.stack;
    } else {
      msg += "No stack information available";
    }
  }

  return msg;
}

/** assert
 * @param {Boolean} condition - if false an error will be thrown
 * @param {string} msg - the error message
 */
export function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

/** Checks if identifier for a schema, table or column is safe to be used in non-parameterized SQL statement.
 *  Returns the identifier or throws an assertion if is not safe to be used in SQL.
 *
 * @param {String} identifier - Identifier to check
 * @returns {String} identifier - Checked identifier
 */
export function secureSQLIdentifier(identifier) {
  const regex = /^[\w\.\:]+$/;

  const match = identifier.match(regex);

  assert(match, `Identifier "${identifier}" is not safe to be used in SQL.`);

  return identifier;
}

/** Returns the own-keys of an object in sorted order.
 *
 * @param {object} obj Object whose keys we want
 * @returns {string[]} Keys in sorted order
 */
export function getSortedKeys(obj) {
  return Object.keys(obj).sort();
}

/** Takes a json-object and returns a function that can iterate over the json object.
 * This function takes a path expression and returns all matching results in the json.
 *
 * A path expression is either a concrete path such as
 *
 *    patient.conditions.acme.interactions
 *
 * or it can contain wildcards. Wildcards are
 *
 *   '*'  - exactly one level
 *
 *   '**' - any level
 *
 * Example:
 *
 * patient.conditions.acme.interactions.*
 *  -> all interactions under acme
 *
 * **.attributes
 *
 *  -> all attributes
 *
 * @param {object} obj - object in which to resolve the path expression
 * @return {function} Function that returns a array with objects for all sub-parts of obj that match the passed expression
 */
export function getJsonWalkFunction(obj) {
  // Collect all paths through objects terminating at a non-array non-object
  function isProperObject(obj) {
    return typeof obj === "object" && obj != null;
  }
  const pathIndex = {};
  function collect(curObj, curPath) {
    pathIndex[curPath] = curObj;
    if (isProperObject(curObj)) {
      //Both object and array type should be allowed
      getSortedKeys(curObj).forEach(key => {
        const subPath = curPath === "" ? key : curPath + "." + key;
        collect(curObj[key], subPath);
      });
    }
  }
  collect(obj, "");

  // Construct the match extraction function to be returned
  // Will return an array holding an index for all paths matching the argument
  function getMatch(pathExpression) {
    assert(
      !pathExpression.match(/.\*\*$/g),
      "no ** expression at end of path allowed",
    );
    const pathSplit = pathExpression.split(".");
    // Construct regular expression for matching paths
    const regexpSplit = pathSplit.map(subPath => {
      switch (subPath) {
        case "**":
          return "[^\\.]+(?:\\.[^\\.]+)*";
        case "*":
          return "[^\\.]+";
        default:
          return subPath;
      }
    });
    const regexp = new RegExp("^" + regexpSplit.join("\\.") + "$");

    // Index all matching paths in object
    const result = [];
    let isMatch = null;
    Object.keys(pathIndex).forEach(path => {
      isMatch = regexp.test(path);
      if (isMatch) {
        result.push({
          path,
          obj: pathIndex[path],
        });
        // throw 500;
      }
    });
    // Return index
    return result;
  }

  // Return function
  return getMatch;
}

/** Takes a json-object and returns a function that can iterate over the json object.
 * This function takes a path expression and returns all matching results in the json.
 *
 * A path expression is either a concrete path such as
 *
 *    patient.conditions.acme.interactions
 *
 * or it can contain wildcards. Wildcards are
 *
 *   '*'  - exactly one level
 *
 *   '**' - any level
 *
 * Example:
 *
 * patient.conditions.acme.interactions.*
 *  -> all interactions under acme
 *
 * **.attributes
 *
 *  -> all attributes
 *
 * @param {object} obj - object in which to resolve the path expression
 * @return {function} Function that returns a array with objects for all sub-parts of obj that match the passed expression
 */
export function getJsonWalkFunctionWithArrays(obj) {
  // Collect all paths through objects terminating at a non-array non-object
  function isProperObject(obj) {
    return typeof obj === "object" && obj != null;
  }
  const pathIndex = {};
  function collect(curObj, curPath) {
    pathIndex[curPath] = curObj;
    if (isProperObject(curObj)) {
      getSortedKeys(curObj).forEach(key => {
        const subPath = curPath === "" ? key : curPath + "." + key;
        collect(curObj[key], subPath);
      });
    }
  }
  collect(obj, "");

  // Construct the match extraction function to be returned
  // Will return an array holding an index for all paths matching the argument
  function getMatch(pathExpression) {
    assert(
      !pathExpression.match(/.\*\*$/g),
      "no ** expression at end of path allowed",
    );
    const pathSplit = pathExpression.split(".");
    // Construct regular expression for matching paths
    const regexpSplit = pathSplit.map(subPath => {
      switch (subPath) {
        case "**":
          return "[^\\.]+(?:\\.[^\\.]+)*";
        case "*":
          return "[^\\.]+";
        default:
          return subPath;
      }
    });
    const regexp = new RegExp("^" + regexpSplit.join("\\.") + "$");

    // Index all matching paths in object
    const result = [];
    let isMatch = null;
    Object.keys(pathIndex).forEach(path => {
      isMatch = regexp.test(path);
      if (isMatch) {
        result.push({
          path,
          obj: pathIndex[path],
        });
        // throw 500;
      }
    });
    // Return index
    return result;
  }

  // Return function
  return getMatch;
}

/** * Takes an object and a path and creates nested objects such that the path will exist in the object.
 *
 * Example
 *
 * When given an empty object and the path 'a.b.c.d'
 * The object will be
 *
 * {
 *   a : {
 *     b : {
 *       c : {
 *         d : {
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * after the call.
 *
 * @param {object} obj - The object in which to create the path
 * @param {string} path - The path to create
 * @param {something} [value] - if given, the value will be inserted at the path
 */
export function createPathInObject(obj, path, value) {
  if (value === undefined) {
    value = {};
  }
  const pathSplit = path.split(".");
  let c = obj;
  for (let i = 0; i < pathSplit.length - 1; i++) {
    //assert ( typeof c === 'object' && ! Array.isArray(c));
    if (!c.hasOwnProperty(pathSplit[i])) {
      c[pathSplit[i]] = {};
    }
    c = c[pathSplit[i]];
  }

  c[pathSplit[pathSplit.length - 1]] = value;
}

export function createPathInObject2(obj, path, value) {
  if (value === undefined) {
    value = {};
  }
  const pathSplit = path.split(".");
  let c = obj;
  for (let i = 0; i < pathSplit.length - 1; i++) {
    assert(
      typeof c === "object" && !Array.isArray(c),
      "Object should not be an array",
    );
    if (!c.hasOwnProperty(pathSplit[i])) {
      c[pathSplit[i]] = {};
    }
    c = c[pathSplit[i]];
  }

  c[pathSplit[pathSplit.length - 1]] = value;
}

/**
 * Replaces given placeholder in attribute names of a json object.
 * @param   {Object} obj - Object in which the attribute names should be replaced
 * @param   {String} search - Placeholder that should be replaced
 * @returns {String} replace - String which replaces the placeholder
 */
export function replaceAttributePHolderInObject(obj, search, replace) {
  const sourceSchema = "";
  if (obj === undefined) {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(index => {
      obj[index] = replaceAttributePHolderInObject(obj[index], search, replace);
    });
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach(key => {
      const newKey = key.replace(new RegExp(sourceSchema, "g"), replace);
      //var newKey = key.replace( search, replace );

      obj[newKey] = replaceAttributePHolderInObject(obj[key], search, replace);

      if (newKey !== key) {
        delete obj[key];
      }
    });
  }

  return obj;
}

/**
 * Converts string into ByteArray.
 * @param   {Mixed} value - Input value in string or Uint8Array representation
 * @returns {ByteArray} buffer - ByteArray representation of the input value
 */
export function toByteArray(value) {
  const rawLength = value.length;
  const buffer = new ArrayBuffer(rawLength);
  const byteArray = new Uint8Array(buffer);
  let i;
  if (typeof value === "object") {
    for (i = 0; i < rawLength; i++) {
      byteArray[i] = value[i];
    }
  } else {
    for (i = 0; i < rawLength; i++) {
      byteArray[i] = value.charCodeAt(i);
    }
  }

  return buffer;
}

/**
 * Converts Uint8Array to string.
 * @param   {Uint8Array} array - input array of type Uint8Array
 * @returns {string} - equivalant string representation
 */
export function toString(array: Uint8Array) {
  return String.fromCharCode.apply(null, array);
}

/**
 * gets an json sub-object by string from a parent object
 * @param   {Object} oObject object to get the sub-object from
 * @param   {String} sPath   path to the sub-object
 * @returns {Object} sub-object
 */
export function getObjectByPath(oObject, sPath) {
  const aPathParts = sPath.split(".");
  let i;
  let oResult = oObject;
  for (i = 0; i < aPathParts.length; i += 1) {
    if (
      typeof oResult === "object" &&
      oResult.hasOwnProperty(aPathParts[i]) &&
      typeof oResult[aPathParts[i]] !== "undefined"
    ) {
      oResult = oResult[aPathParts[i]];
    } else {
      throw aPathParts[i] + " from " + sPath + " not in object path";
    }
  }
  return oResult;
}

// returns a sorted version of the array
// where each element occurs only once.
export function getUniqueArrayElements(ar) {
  if (ar.length === 0) {
    return [];
  }
  ar.sort();
  let previousElement = ar[0];
  const result = [previousElement];
  for (const arElement of ar) {
    if (previousElement !== arElement) {
      previousElement = arElement;
      result.push(previousElement);
    }
  }
  return result;
}

export let uniqueSeparatorString = "_UNIQUE_SEPARATOR_STRING_";

export function isXS2() {
  return true;
}

/**
 * sets an json sub-object by string from a parent object
 * @param   {Object} oObject object to get the sub-object from
 * @param   {String} sPath   path to the sub-object
 * @returns {Object} sub-object
 */
export function replaceObjectByPath(oObject, sPath, value) {
  const aPathParts = sPath.split(".");
  let i;
  let oResult = oObject;
  for (i = 0; i < aPathParts.length; i += 1) {
    if (oResult.hasOwnProperty(aPathParts[i])) {
      if (i === aPathParts.length - 1) {
        oResult[aPathParts[i]] = value;
      } else {
        oResult = oResult[aPathParts[i]];
      }
    } else {
      throw aPathParts[i] + " from " + sPath + " not in object path";
    }
  }
}

/**
 * deletes an json sub-object by string from a parent object
 * @param   {Object} oObject object to get the sub-object from
 * @param   {String} sPath   path to the sub-object
 * @returns {Object} sub-object
 */
export function deleteObjectByPath(oObject, sPath) {
  const aPathParts = sPath.split(".");
  let i;
  let oResult = oObject;
  for (i = 0; i < aPathParts.length; i += 1) {
    if (oResult.hasOwnProperty(aPathParts[i])) {
      if (i === aPathParts.length - 1) {
        delete oResult[aPathParts[i]];
      } else {
        oResult = oResult[aPathParts[i]];
      }
    }
  }
}

/**
 * Returns the placeholder specific for an attribute (after overriding the 'from' tables)
 * @param   {Object} mInputPholderMap input place holder map
 * @param   {String} sAttributePath   attribute path
 * @param   {Object} oConfig   input config
 * @returns {Object} updated place holder map
 */
export function getPersonalizedPlaceholderMap(
  mInputPholderMap,
  sAttributePath,
  oConfig,
) {
  const parts = sAttributePath.split(".");
  let configCursor = oConfig;
  const mOutputPholderMap = cloneJson(mInputPholderMap);

  // To avoid DOS, limit the loop
  if (parts.length >= 100) {
    throw new Error("Invalid attribute path: " + sAttributePath);
  }

  for (let i = 0; i < parts.length; ++i) {
    const onePart = parts[i];
    if (configCursor[onePart]) {
      configCursor = configCursor[onePart];
      if (configCursor.from) {
        for (const placeholder in configCursor.from) {
          if (configCursor.from.hasOwnProperty(placeholder)) {
            mOutputPholderMap[placeholder] = configCursor.from[placeholder];
          }
        }
      }
    } else {
      throw new Error(
        "could not find corresponding entry in configuration for: " +
          sAttributePath,
      );
    }
  }

  return mOutputPholderMap;
}

/**
 * Returns the updated placeholder relpaced with the custom string given.
 * @param   {Object} placeholderMap input place holder map
 * @param   {String} expression   custom string for replacement
 * @returns {Object} updated place holder map
 */
export function replacePlaceholderWithCustomString(
  placeholderMap: any,
  expression: string,
) {
  if (!expression) {
    return null;
  }
  // this will return the whole placeholder (table and column name)
  const placeholders = expression.match(/@[A-Z|.|_]+/g);
  if (!placeholders) {
    return expression;
  }
  function getTableFromPholder(placeholder: string) {
    if (placeholder.indexOf(".") >= 0) {
      // there is a table and a column
      const parts = placeholder.split(".");
      const tablePart = placeholderMap[parts[0]];
      const colPart = placeholderMap[placeholder];
      return `${tablePart || parts[0]}.${colPart || parts[1]}`;
    }
    return placeholderMap[placeholder];
  }
  const substExpression = expression.replace(
    /@[A-Z|.|_]+/g,
    getTableFromPholder,
  );
  return substExpression;
}

export function convertZlibBase64ToJson(base64String: string) {
  try {
    const ret = JSON.parse(
      pako.inflate(base64.decodeBase64(base64String), { to: "string" }),
    );
    return ret;
  } catch (err) {
    console.log(err);
    throw new Error("There was en error converting the input to JSON");
  }
}

export function wrapWithQuotes(table: string) {
  return table.indexOf(`"`) === -1 ? `"${table}"` : table;
}

export function stringToBoolean(checkMe: any): boolean {
  if (typeof checkMe === "string") {
    return checkMe.toUpperCase() === "TRUE";
  }
  return false;
}

/**
 * Compares two array buffers for the string contents to check if they are exactly equal.
 * @param   {Uint8Array}  o1 First object
 * @param   {Uint8Array}  o2 Second object
 * @returns {Boolean} True, if string contents are equal.
 */
export function arrayBufferEquals(a: any, b: any) {
  return a && b ? a.toString() === b.toString() : false;
}

/**
 * Check if the token belongs to client credentials authN flow
 * @param   token incoming claims
 * @returns {Boolean} True, if token belongs to client credentials authN flow.
 */
export function isClientCredToken(token: any) {
  return token.authType && token.authType === "azure-ad";
}

/**
 * Check if the request belongs to client credentials authN flow
 * @param   req incoming request
 * @returns {Boolean} True, if request belongs to client credentials authN flow.
 */
export function isClientCredReq(req: any) {
  return (
    req.headers["auth-type"] &&
    (req.headers["auth-type"] === "azure-ad" ||
      req.headers["auth-type"] === "shared-azure-ad")
  );
}

/**
 * Check if the request belongs to Kubernetes Health Probes
 * @param   req incoming request
 * @returns {Boolean} True, if request belongs to readiness / liveness probes
 */
export function isHealthProbesReq(req: any) {
  return req.url === "/check-readiness" || req.url === "/check-liveness";
}

/**
 * Construct salt by replacing the # with $
 * @param   saltStr fixed slat string (length: 22)
 * @returns {string} final salt
 */
export function constructSalt(saltStr: string) {
  return saltStr.replace(/#/g, "$");
}

/**
 * Hash the give string using the given salt
 * @param   strToHash string to hash
 * @param   salt salt to hash
 * @returns {string} Hashed string
 */
export function hash(strToHash: string, salt: string) {
  return bcrypt.hashSync(strToHash, constructSalt(salt));
}

/**
 * Validate the given string against given hash
 * @param   strToCompare string to validate
 * @param   hash hash to compare
 * @returns {Boolean} The comparison outcome
 */
export function compareHash(strToCompare: string, hash: string) {
  return bcrypt.compareSync(strToCompare, hash);
}

/**
 * Validate the given value is null
 * @param   value value to validate
 * @returns {Boolean} Tells whether the value is null or not
 */
export function isNotNullOrEmpty(value: any) {
  return value !== undefined && value !== null && value !== "";
}

/**
 * Decoded UTF8 encoded string
 * @param  encodedToken encoded token string
 * @returns {string} decoded token string
 */
export function decodeString(encodedToken: string) {
  return Buffer.from(encodedToken, "base64").toString("utf8");
}

export const setupGlobalErrorHandling = (app: any, log: ILogger | Logger) => {
  // global error handler
  app.use((err, req, res, next) => {
    log.error(err.message);
    log.error(err.stack);
    res.status(500).json(err.message);
  });
};

export enum CachedbConnectionType {
  READ = "read",
  WRITE = "write",
}

/*
Helepr function to get cachedb database format for protocol A
*/
export const getCachedbDatabaseFormatProtocolA = (
  dialect: string,
  datasetId,
  connectionType: CachedbConnectionType = CachedbConnectionType.READ,
) => {
  return `A|${dialect}|${connectionType}|${datasetId}`;
};

/*
Helepr function to get cachedb database format for protocol B
*/
export const getCachedbDatabaseFormatProtocolB = (
  dialect: string,
  databaseCode: string,
  connectionType: CachedbConnectionType = CachedbConnectionType.READ,
  schemaName: string = "",
  vocabSchemaName: string = "",
) => {
  let cachedbDatabaseFormat = `B|${dialect}|${connectionType}|${databaseCode}`;
  if (schemaName) {
    cachedbDatabaseFormat += `|${schemaName}`;
  }
  if (vocabSchemaName) {
    cachedbDatabaseFormat += `|${vocabSchemaName}`;
  }
  return cachedbDatabaseFormat;
};
