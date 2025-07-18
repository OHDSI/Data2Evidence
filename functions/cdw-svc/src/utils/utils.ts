/**
 * Back-end utility functions.
 *
 * @namespace legacy.cdw.services.lib
 *
 */
import { env } from "../configs";
import * as _textLib from "./text";
import { getCachedbDbConnections } from "./cachedb";
import { getTrexConnection } from "./trexConnection";
import * as xsenv from "@sap/xsenv";
import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import PortalServerAPI from "../api/PortalServerAPI";
import {
  DUCKDB_FILE_DATABASE_CODE,
  DUCKDB_FILE_SCHEMA_NAME,
} from "../qe/settings/Defaults";
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

// Syntactic check of path to prevent sql injection.  This does not check
// whether the path actually exists in the config.  It just checks
// character ranges and formating.
//
// This is used e.g. for Kaplan-Meier to validate the kmEventIdentifier
//
export function validateRequestPath(path) {
  let pieces = path.split(".");

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
  let keys1 = Object.keys(o1).sort();
  let keys2 = Object.keys(o2).sort();
  if (keys1.length !== keys2.length) {
    return false;
  }
  let res = true;
  for (let i = 0; i < keys1.length; i++) {
    let k1 = keys1[i];
    let k2 = keys2[i];
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
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0;
    let v = c === "x" ? r : (r & 0x3) | 0x8;
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
  let valueString = JSON.stringify(value);
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
  description = ""
) {
  let msg = "An error occurred";
  let settings = settingsObj.getSettings();

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
  let regex = /^[\w\.\:]+$/;

  let match = identifier.match(regex);

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
    return typeof obj === "object" && obj != null && !Array.isArray(obj);
  }
  let pathIndex = {};
  function collect(curObj, curPath) {
    pathIndex[curPath] = curObj;
    if (isProperObject(curObj)) {
      getSortedKeys(curObj).forEach(function (key) {
        let subPath = curPath === "" ? key : curPath + "." + key;
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
      "no ** expression at end of path allowed"
    );
    let pathSplit = pathExpression.split(".");
    // Construct regular expression for matching paths
    let regexpSplit = pathSplit.map(function (subPath) {
      switch (subPath) {
        case "**":
          return "[^\\.]+(?:\\.[^\\.]+)*";
        case "*":
          return "[^\\.]+";
        default:
          return subPath;
      }
    });
    let regexp = new RegExp("^" + regexpSplit.join("\\.") + "$");

    // Index all matching paths in object
    let result = [];
    let isMatch = null;
    Object.keys(pathIndex).forEach(function (path) {
      isMatch = regexp.test(path);
      if (isMatch) {
        result.push({
          path: path,
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
  let pathSplit = path.split(".");
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

/**
 * Replaces given placeholder in attribute names of a json object.
 * @param   {Object} obj - Object in which the attribute names should be replaced
 * @param   {String} search - Placeholder that should be replaced
 * @returns {String} replace - String which replaces the placeholder
 */
export function replaceAttributePHolderInObject(obj, search, replace) {
  let sourceSchema = "";
  if (obj === undefined) {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(function (index) {
      obj[index] = replaceAttributePHolderInObject(obj[index], search, replace);
    });
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach(function (key) {
      let newKey = key.replace(new RegExp(sourceSchema, "g"), replace);
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
  let rawLength = value.length;
  let buffer = new ArrayBuffer(rawLength);
  let byteArray = new Uint8Array(buffer);
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
 * gets an json sub-object by string from a parent object
 * @param   {Object} oObject object to get the sub-object from
 * @param   {String} sPath   path to the sub-object
 * @returns {Object} sub-object
 */
export function getObjectByPath(oObject, sPath) {
  let aPathParts = sPath.split(".");
  let i;
  let oResult = oObject;
  for (i = 0; i < aPathParts.length; i += 1) {
    if (oResult.hasOwnProperty(aPathParts[i])) {
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
  let result = [previousElement];
  for (let arElement of ar) {
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

export function getUsername() {
  if (isXS2()) {
    let getUserFromEnv = function () {
      return env.MRI_USER;
    };
    let username = getUserFromEnv();
    return username ? username.toUpperCase() : "SYSTEM";
  } else {
    //TODO: return $.session.getUsername();
  }
}

const filterVcapByTag = (
  vcapServices: {
    mridb: {
      name: string;
      tags: string[];
      credentials: { dialect: string };
    }[];
  },
  tag: string
) => {
  const dbs: typeof vcapServices.mridb = [];
  for (const db of vcapServices.mridb) {
    if (db.tags.includes(tag)) {
      dbs.push(db);
    }
  }
  return dbs;
};

export async function getAnalyticsConnection(
  userObj,
  token?: string,
  datasetId: string = "DEFAULT"
) {
  let analyticsCredentials;
  let analyticsConnection;

  let databaseCode;
  let schemaName;
  let vocabSchemaName;
  let dialect;

  // Use built in duckdb file
  if (datasetId === "DEFAULT") {
    databaseCode = DUCKDB_FILE_DATABASE_CODE;
    schemaName = DUCKDB_FILE_SCHEMA_NAME;
    vocabSchemaName = DUCKDB_FILE_SCHEMA_NAME;
  } else {
    // Resolve datasetId into database code, schema name and vocab schema name
    const dataset = await new PortalServerAPI().getDataset(token, datasetId);
    databaseCode = dataset.databaseCode;
    schemaName = dataset.schemaName;
    vocabSchemaName = dataset.vocabSchemaName;
    dialect = dataset.dialect;
  }

  if (dialect === "hana") {
    let cdwService = filterVcapByTag(env.VCAP_SERVICES, "cdw").map(
      (db) => db.credentials
    );
    cdwService = cdwService.filter((db) => db.dialect == "hana");
    // TODO: Get correct analytics credentials based on resolved details
    analyticsCredentials = cdwService[0];
    // node hdb library checks for these to use TLS
    // TLS does not work with deno for self signed certs
    if (!analyticsCredentials.useTLS) {
      delete analyticsCredentials.key;
      delete analyticsCredentials.cert;
      delete analyticsCredentials.ca;
      delete analyticsCredentials.pfx;
    }

    if (analyticsCredentials.authentication_mode === "JWT") {
      delete analyticsCredentials.user;
      delete analyticsCredentials.password;
      if (userObj.thirdPartyToken) {
        analyticsCredentials["token"] = userObj.thirdPartyToken;
      } else {
        throw new Error(
          "Intermediary IDP token doesnt exist for HANA JWT Authentication!"
        );
      }
    }

    analyticsConnection =
      await dbConnectionUtil.DBConnectionUtil.getDBConnection({
        credentials: analyticsCredentials,
        schemaName: analyticsCredentials.schema,
        vocabSchemaName: analyticsCredentials.vocabSchema,
        userObj,
      });
  } else {
    // USE_TREX_DB_CONN takes precedence over USE_CACHEDB
    if (env.USE_TREX_DB_CONN === "true") {
      analyticsConnection = await getTrexConnection(
        databaseCode,
        schemaName,
        vocabSchemaName
      );
    } else if (env.USE_CACHEDB === "true") {
      // Get duckdb db connection via alp-cachedb
      analyticsConnection = await getCachedbDbConnections({
        userObj,
        token,
        databaseCode,
        schemaName,
        vocabSchemaName,
      });
    }
  }

  return analyticsConnection;
}
