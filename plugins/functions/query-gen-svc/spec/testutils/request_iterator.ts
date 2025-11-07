import { isObject, getJsonWalkFunction } from "@alp/alp-base-utils";

function isNumber(x) {
  return x.match(/^\d+$/g);
}

export function getConfigElement(config, path) {
  let pathSplit = path.split(".");
  let curObj = config;
  for (let i = 0; i < pathSplit.length; i++) {
    if (isNumber(pathSplit[i])) {
      continue;
    }

    if (isObject(curObj)) {
      curObj = curObj[pathSplit[i]];
    } else {
      throw new Error("could not find config element for path: " + path);
    }
  }
  return curObj;
}
/**
 * Return true if the paths is an exclude path (i.e. indicating that a given
 * interaction is to be excluded).
 *
 * @param {string} path Path to check
 * @returns {boolean} True if the path is a path to an exlcude conditions
 */
function _isExcludePath(path) {
  let result = /\.exclude$/.test(path);
  return result;
}

export function getRequestIterator(request, config) {
  let requestWalkFunction = getJsonWalkFunction(request);

  function requestIterator(pathExpression) {
    let results = requestWalkFunction(pathExpression);
    for (let i = 0, len = results.length; i < len; i++) {
      // For excluded interactions (for which no config entry is available),
      // we leave the config element empty
      if (_isExcludePath(results[i].path)) {
        results[i].configValue = {};
      } else {
        results[i].configValue = getConfigElement(config, results[i].path);
      }
      // rename the result properties
      results[i].requestPath = results[i].path;
      delete results[i].path;
      results[i].requestValue = results[i].obj;
      delete results[i].obj;
    }
    return results;
  }

  return requestIterator;
}
