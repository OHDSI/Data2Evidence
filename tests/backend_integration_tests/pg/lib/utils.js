/* eslint-env node */

/**
 * Back-end utility functions.
 *
 * @module utils
 *
 */

var chalk = require('chalk')
var pako = require('pako')

;('use strict')

/**
 * Escapes a string to be used in a regex
 *
 * @param {String}
 *            string - String to be escaped.
 * @returns {String} - escaped atring.
 */
function escapeRegExp(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')
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
function cloneJson(json) {
  return JSON.parse(JSON.stringify(json))
}

/**
 * Syntactic check of path to prevent sql injection.  This does not check
 * whether the path actually exists in the config.  It just checks
 * character ranges and formating.
 *
 * Throws an error if the request is not valid.
 *
 * This is used e.g. for Kaplan-Meier to validate the kmEventIdentifier
 *
 * @param {String} path - path to be validate (some.thing.like.this)
 * @throws Error
 */
function validateRequestPath(path) {
  var pieces = path.split('.')

  function isPathPiece(piece) {
    return /^(\w|-)+$/.test(piece)
  }

  if (!pieces.every(isPathPiece)) {
    throw new Error('invalid request path')
  }
}

/**
 * Checks if an object is empty (has no keys).
 *
 * @param {Object} o - Object
 * @returns {Boolean} - true if the object has no keys
 */
function isEmptyObject(o) {
  return Object.keys(o).length === 0
}

/**
 * Compares two objects recursivly to check if they are exactly equal.
 * This includes the properties as well as their values.
 *
 * @param   {Object}  o1 First object
 * @param   {Object}  o2 Second object
 * @returns {Boolean} True, if all properties are equal.
 */
function deepEquals(o1, o2) {
  var keys1 = Object.keys(o1).sort()
  var keys2 = Object.keys(o2).sort()
  if (keys1.length !== keys2.length) {
    return false
  }
  var res = true
  for (var i = 0; i < keys1.length; i++) {
    var k1 = keys1[i]
    var k2 = keys2[i]
    if (typeof o1[k1] === 'object' && typeof o2[k2] === 'object') {
      res = res && deepEquals(o1[k1], o2[k2])
    } else {
      res = res && o1[k1] === o2[k2]
    }
  }
  return res
}

/*
 * Check if something is an object.
 */
function _isObject(x) {
  return typeof x === 'object' && x !== null
}

/**
 * Generate a unique ID (UID).
 *
 * @function
 * @public
 * @static
 * @returns {string} UID string
 */
function createGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0
    var v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Generate a DWID.
 *
 * @function
 * @public
 * @static
 * @returns {string} UID string
 */
function createDWID() {
  var guid = createGuid()
  return Buffer.from(guid.substring(0, 32)).toString('hex')
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
function isNotEmpty(value) {
  var valueString = JSON.stringify(value)
  return valueString !== '[]' && valueString !== '{}'
}

/**
 * assert
 *
 * @param {Boolean} condition - if false an error will be thrown
 * @param {string} msg - the error message
 */
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg)
  }
}

/** Checks if identifier for a schema, table or column is safe to be used in non-parameterized SQL statement.
 *  Returns the identifier or throws an assertion if is not safe to be used in SQL.
 *
 * @param {String} identifier - Identifier to check
 * @returns {String} identifier - Checked identifier
 */
function secureSQLIdentifier(identifier) {
  var regex = /^[\w\.:]+$/
  var match = identifier.match(regex)
  assert(match, 'Identifier "' + identifier + '" is not safe to be used in SQL.')
  return identifier
}

/** Returns the own-keys of an object in sorted order.
 *
 * @param {object} obj Object whose keys we want
 * @returns {string[]} Keys in sorted order
 */
function getSortedKeys(obj) {
  return Object.keys(obj).sort()
}

/**
 * Takes a json-object and returns a function that can iterate over the json object.
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
 * @returns {function} Function that returns a array with objects for all sub-parts of obj that match the passed expression
 */
function getJsonWalkFunction(obj) {
  // Collect all paths through objects terminating at a non-array non-object
  function isProperObject(objToTest) {
    return typeof objToTest === 'object' && objToTest !== null && !Array.isArray(objToTest)
  }
  var pathIndex = {}

  function collect(curObj, curPath) {
    pathIndex[curPath] = curObj
    if (isProperObject(curObj)) {
      getSortedKeys(curObj).forEach(function (key) {
        var subPath = curPath === '' ? key : curPath + '.' + key
        collect(curObj[key], subPath)
      })
    }
  }
  collect(obj, '')

  // Construct the match extraction function to be returned
  // Will return an array holding an index for all paths matching the argument
  function getMatch(pathExpression) {
    assert(!pathExpression.match(/.\*\*$/g), 'no ** expression at end of path allowed')
    var pathSplit = pathExpression.split('.')
    // Construct regular expression for matching paths
    var regexpSplit = pathSplit.map(function (subPath) {
      switch (subPath) {
        case '**':
          return '[^\\.]+(?:\\.[^\\.]+)*'
        case '*':
          return '[^\\.]+'
        default:
          return subPath
      }
    })
    var regexp = new RegExp('^' + regexpSplit.join('\\.') + '$')

    // Index all matching paths in object
    var result = []
    var isMatch = null
    Object.keys(pathIndex).forEach(function (path) {
      isMatch = regexp.test(path)
      if (isMatch) {
        result.push({
          path: path,
          obj: pathIndex[path]
        })
      }
    })
    // Return index
    return result
  }

  // Return function
  return getMatch
}

/**
 * Takes an object and a path and creates nested objects such that the path will exist in the object.
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
function createPathInObject(obj, path, value) {
  if (typeof value === 'undefined') {
    value = {}
  }
  var pathSplit = path.split('.')
  var c = obj
  for (var i = 0; i < pathSplit.length - 1; i++) {
    assert(typeof c === 'object' && !Array.isArray(c), JSON.stringify(c) + ' is not an object!')
    if (!c.hasOwnProperty(pathSplit[i])) {
      c[pathSplit[i]] = {}
    }
    c = c[pathSplit[i]]
  }
  c[pathSplit[pathSplit.length - 1]] = value
}

/**
 * Check if a path exists in a JSON object.
 *
 * @param {Object} obj - JSON object
 * @param {String} path - path (some.thing.like.this)
 * @returns {Boolean} - true if object contains path
 */
function pathExistsInObject(obj, path) {
  if (path === '') {
    return true
  }
  var pathElems = path.split('.')
  var pathHead = pathElems.shift()
  var pathTail = pathElems.join('.')
  if (Array.isArray(obj)) {
    var index = parseInt(pathHead, 10)
    if (obj.length > index) {
      return pathExistsInObject(obj[index], pathTail)
    } else {
      return false
    }
  } else if (obj.hasOwnProperty(pathHead)) {
    return pathExistsInObject(obj[pathHead], pathTail)
  } else {
    return false
  }
}

/**
 * Return the value stored at a particular path in a JSON object.
 *
 * @param {Object} obj - JSON object
 * @param {String} path - path (some.thing.like.this)
 * @returns {Object} - whatever is stored at the given path
 */
function getValueInObject(obj, path) {
  if (path === '') {
    return obj
  }
  var pathElems = path.split('.')
  var key = pathElems.shift()
  var newObj
  try {
    if (isNumber(key)) {
      newObj = obj[parseInt(key, 10)]
    } else {
      newObj = obj[key]
    }
  } catch (err) {
    throw new Error('Path ' + path + ' does not exist in object ' + JSON.stringify(obj))
  }
  var newPath = pathElems.join('.')
  return getValueInObject(newObj, newPath)
}

/**
 * Replaces given placeholder in attribute names of a json object.
 *
 * @param   {Object} obj - Object in which the attribute names should be replaced
 * @param   {String} search - Placeholder that should be replaced
 * @param {String} replace - String which replaces the placeholder
 * @returns {Object} - object with replacements done
 */
function replaceAttributePHolderInObject(obj, search, replace) {
  if (typeof obj === 'undefined') {
    return
  }
  if (Array.isArray(obj)) {
    obj.forEach(function (index) {
      obj[index] = replaceAttributePHolderInObject(obj[index], search, replace)
    })
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(function (key) {
      var newKey = key.replace(new RegExp(search, 'g'), replace)
      obj[newKey] = replaceAttributePHolderInObject(obj[key], search, replace)
      if (newKey !== key) {
        delete obj[key]
      }
    })
  }
  return obj
}

/**
 * Converts string into ByteArray.
 *
 * @param   {String} strValue - String value
 * @returns {ByteArray} buffer - ByteArray representation of the input string
 */
function toByteArray(strValue) {
  var rawLength = strValue.length
  var buffer = new ArrayBuffer(rawLength)
  var byteArray = new Uint8Array(buffer)
  var i
  for (i = 0; i < rawLength; i++) {
    byteArray[i] = strValue.charCodeAt(i)
  }
  return buffer
}

/**
 * Gets an json sub-object by string from a parent object
 *
 * @param   {Object} oObject object to get the sub-object from
 * @param   {String} sPath   path to the sub-object
 * @returns {Object} sub-object
 */
function getObjectByPath(oObject, sPath) {
  var aPathParts = sPath.split('.')
  var i
  var oResult = oObject
  for (i = 0; i < aPathParts.length; i += 1) {
    if (oResult.hasOwnProperty(aPathParts[i])) {
      oResult = oResult[aPathParts[i]]
    } else {
      throw new Error(aPathParts[i] + ' from ' + sPath + ' not in object path')
    }
  }
  return oResult
}

/**
 * Returns a sorted version of the array
 * where each element occurs only once.
 *
 * @param {Array} ar - array
 * @returns {Array} - araay containing only unique, sorted elements
 */
function getUniqueArrayElements(ar) {
  if (ar.length === 0) {
    return []
  }
  ar.sort()
  var previousElement = ar[0]
  var result = [previousElement]
  for (var i = 0; i < ar.length; i++) {
    if (previousElement !== ar[i]) {
      previousElement = ar[i]
      result.push(previousElement)
    }
  }
  return result
}

/**
 * Iterator that allow simultaneously
 * walking a request and the corresponding config.
 *
 * @returns {RequestIterator} - request iterator constructor
 */
var RequestIterator = (function () {
  function RequestIteratorImpl(request, config) {
    this.request = request
    this.config = config
    this.requestWalkFunction = getJsonWalkFunction(this.request)
  }
  RequestIteratorImpl.prototype.get = function (pathExpression) {
    var results = this.requestWalkFunction(pathExpression)
    for (var i = 0, len = results.length; i < len; i++) {
      // For excluded interactions (for which no config entry is available),
      // we leave the config element empty
      if (_isExcludePath(results[i].path)) {
        results[i].configValue = {}
      } else {
        results[i].configValue = getConfigElement(this.config, results[i].path)
      }
      // rename the result properties
      results[i].requestPath = results[i].path
      delete results[i].path
      results[i].requestValue = results[i].obj
      delete results[i].obj
    }
    return results
  }
  return RequestIteratorImpl
})()

/**
 * Returns an iterator that allow simultaneously
 * walking a request and the corresponding config.
 *
 * @param {Object} request - request object
 * @param {Object} config - configuratin for parsing request
 * @returns {RequestIterator} - requst iterator
 */
function getRequestIterator(request, config) {
  return new RequestIterator(request, config)
}

/**
 * Return true if the paths is an exclude path (i.e. indicating that a given
 * interaction is to be excluded).
 *
 * @param {string} path Path to check
 * @returns {boolean} True if the path is a path to an exlcude conditions
 */
function _isExcludePath(path) {
  var result = /\.exclude$/.test(path)
  return result
}

function isNumber(x) {
  return x.match(/^\d+$/g)
}

/**
* Get a certain part of the config.
/**
* Return the value stored at a particular path in a JSON config.
*
* @param {Object} config - JSON config object
* @param {String} path - path (some.thing.like.this)
* @returns {Object} - whatever is stored at the given path
*/
function getConfigElement(config, path) {
  var pathSplit = path.split('.')
  var curObj = config
  pathSplit.forEach(function (part) {
    // Skip numbers
    if (isNumber(part)) {
      return
    }
    if (_isObject(curObj)) {
      curObj = curObj[part]
    } else {
      throw new Error('could not find config element for path: ' + path)
    }
  })
  return curObj
}

/**
* Get a certain part of the config.
/**
* A function for logging to console which is
*
* @param {Object} config - JSON config object
* @param {String} path - path (some.thing.like.this)
* @returns {Object} - whatever is stored at the given path
*/
var getLogger = function (loggingOn, msgPrefix) {
  var usePrefix = msgPrefix || ''
  return function (msg) {
    if (loggingOn) {
      console.log(chalk.yellow(usePrefix) + msg)
    }
  }
}

function _isNonArrayObject(val) {
  return val !== null && !Array.isArray(val) && typeof val === 'object'
}

/**
 * Recursively extend the properties of a given object with that of a second
 * object, overwriting already existing properties.
 *
 * @param {Object} original - object to be modified/extended
 * @param {Object} replacement - object with modifications
 * @returns {Object} - merged object
 */
function merge(original, replacement) {
  if (_isNonArrayObject(original)) {
    var newObj = cloneJson(original)
    for (var key in replacement) {
      if (key in newObj) {
        newObj[key] = merge(newObj[key], replacement[key])
      } else {
        newObj[key] = replacement[key]
      }
    }
    return newObj
  } else {
    return replacement
  }
}

const _serialize = ({ queryString, compress }) => {
  return `?${Object.keys(queryString)
    .reduce((a, key) => {
      a.push(
        `${key}=${encodeURIComponent(
          compress.indexOf(key) > -1 && key !== 'datasetId' // Dont encode if key is datasetId
            ? Buffer.from(pako.deflate(queryString[key], { to: 'string' }), 'binary').toString('base64')
            : queryString[key]
        )}`
      )
      return a
    }, [])
    .join('&')}`
}

const _generateQueryString = ({ url, queryString, compress = [] }) => `${url}${_serialize({ queryString, compress })}`

const generateUrl = (url, params) => {
  return _generateQueryString({
    url,
    queryString: { ...params },
    compress: Object.keys(params)
  })
}
var uniqueSeparatorString = '_UNIQUE_SEPARATOR_STRING_'

const PATHS = {
  population: '/analytics-svc/api/services/population',
  patient: '/analytics-svc/api/services/patient',
  bookmark: '/analytics-svc/api/services/bookmark',
  values: '/analytics-svc/api/services/values',
  analytics: '/analytics-svc/pa/services/analytics.xsjs'
}

// --- EXPORTS ---
module.exports.cloneJson = cloneJson
module.exports.validateRequestPath = validateRequestPath
module.exports.deepEquals = deepEquals
module.exports.createGuid = createGuid
module.exports.createDWID = createDWID
module.exports.isNotEmpty = isNotEmpty
module.exports.assert = assert
module.exports.isNumber = isNumber
module.exports.getJsonWalkFunction = getJsonWalkFunction
module.exports.pathExistsInObject = pathExistsInObject
module.exports.createPathInObject = createPathInObject
module.exports.getUniqueArrayElements = getUniqueArrayElements
module.exports.getValueInObject = getValueInObject
module.exports.getObjectByPath = getObjectByPath
module.exports.isEmptyObject = isEmptyObject
module.exports.uniqueSeparatorString = uniqueSeparatorString
module.exports.replaceAttributePHolderInObject = replaceAttributePHolderInObject
module.exports.toByteArray = toByteArray
module.exports.secureSQLIdentifier = secureSQLIdentifier
module.exports.escapeRegExp = escapeRegExp
module.exports.getRequestIterator = getRequestIterator
module.exports.getLogger = getLogger

// For testing only - consider instead using e.g. https://github.com/jhnns/rewire once in node.js
module.exports.getSortedKeys = getSortedKeys
module.exports.merge = merge
module.exports.generateUrl = generateUrl
module.exports.PATHS = PATHS
