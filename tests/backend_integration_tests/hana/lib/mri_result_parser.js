/**
 * This module provides functionality for parsing the reponse returned by
 * HTTP queries against the MRI backend
 *
 * @module mri_result_parser
 *
 */

var assert = require('assert')

function _cloneJson(json) {
  return JSON.parse(JSON.stringify(json))
}

function _assertMeasuresValid(categories, measures) {
  var measureSet = new Set()
  measures.forEach(function (measure) {
    measureSet.add(measure.group)
  })
  assert(measureSet.size === measures.length, 'A measure (e.g. y-axis) assignment occurred more than once!')
}

var api = {}

/**
 * Factory function for creating MriResultParser instances.
 *
 * @param {Object} response - response object of the HTTP call response
 * @param {Object} body - body obejct of the HTTP call response
 */

api.createNonValidatedMriResultParser = function (response, body) {
  _assertMeasuresValid(body.categories, body.measures)
  var sortedCategories = _cloneJson(body.categories)
  var sortedMeasures = _cloneJson(body.measures).sort(function (a, b) {
    return a.group - b.group
  })
  var data = _cloneJson(body.data)
  var expectedDataFieldNo = sortedCategories.length + sortedMeasures.length + 1
  data.forEach(function (dataPoint) {
    assert(
      Object.keys(dataPoint).length === expectedDataFieldNo,
      'There should be a total of ' +
        expectedDataFieldNo +
        ' categories and fields, but a datapoint contained ' +
        Object.keys(dataPoint).length +
        'fields!'
    )
  })
  var dataTree = _buildDataTree(sortedCategories, sortedMeasures, data)
  var statusCode = response.statusCode
  var noDataReason = null
  if (typeof body.noDataReason !== 'undefined') {
    noDataReason = body.noDataReason
  }
  return new MriResultParser(statusCode, dataTree, noDataReason)
}

function _assertCategoriesAndMeasuresNotEmpty(categories, measures) {
  assert(categories && categories.length !== 0, 'No categories returned!')
  assert(measures && measures.length !== 0, 'No measures returned!')
}

/**
 * Wrapper of createMriResultParser that performs further checks.
 *
 * If will throw errors if the result is empty or has a non-valid return code.
 *
 * @param {Object} response - response object of the HTTP call response
 * @param {Object} body - body obejct of the HTTP call response
 */

api.createMriResultParser = function (response, body) {
  assert(
    /2\d{2}/.test(response.statusCode),
    'Unexpected (non-2XX) HTTP return code: ' + response.statusCode + '\nBody:\n' + body
  )
  assert(
    typeof body.noDataReason === 'undefined' || body.noDataReason === '',
    'No data returned - reason:: ' + body.noDataReason
  )
  _assertCategoriesAndMeasuresNotEmpty(body.categories, body.measures)
  return api.createNonValidatedMriResultParser(response, body)
}

// Recursive function that builds a data tree with one layer per category
// and one node in each layer per corresponding category level
function _buildDataTree(sortCat, sortMeas, data) {
  // Return an array of the measures in the correct order
  function _getMeasures(curData) {
    assert(curData.length === 1, 'There should only by one data point left when all categories have been exhausted!')
    var curMeasureVals = curData[0]
    var orderedMeasureValues = sortMeas.map(function (measure) {
      return curMeasureVals[measure.id]
    })
    return orderedMeasureValues
  }

  // Partion data points into arrays according to value of the highest category
  function _partitionPoints(curData, curCat) {
    var newDataArrays = {}
    curData.forEach(function (dataPoint) {
      var curCatVal = dataPoint[curCat.id]
      assert(
        typeof curCatVal !== 'undefined',
        'A data point did not contain any sorted value for the category  ' + curCat + '!'
      )
      if (newDataArrays[curCatVal]) {
        newDataArrays[curCatVal].push(dataPoint)
      } else {
        newDataArrays[curCatVal] = [dataPoint]
      }
    })
    return newDataArrays
  }

  if (Object.keys(data).length === 0) {
    return {}
  }
  var result = {}
  if (sortCat.length === 0) {
    // If we have reached a leaf, return an array of measure values in correct order
    result = _getMeasures(data)
  } else {
    // Get *independent* copies of head & tail of list
    var catHead = sortCat[0]
    var catTail = sortCat.slice(1, sortCat.length)
    var newDataArrays = _partitionPoints(data, catHead)
    Object.keys(newDataArrays).forEach(function (catVal) {
      result[catVal] = _buildDataTree(catTail, sortMeas, newDataArrays[catVal])
    })
  }
  return result
}

/**
 * Create an MriResultParser object.
 *
 * @constructor
 * @param {String} statusCode - HTTP status code
 * @param {Object} dataTree - JSON object with the nodes for category values and measures on the leaves.
 * @param {String} noDataReason - string provided in the body.noDataReason field (null if this field was absent)
 */
function MriResultParser(statusCode, dataTree, noDataReason) {
  this.statusCode = statusCode
  this.dataTree = dataTree
  this.noDataReason = noDataReason
}

/**
 * Check if the response has an HTTP reponse code that indicates succces.
 *
 * @returns {Boolean} - true iff status code is of the form 2xx
 */
MriResultParser.prototype.isValid = function () {
  return /2\d{2}/.test(this.statusCode)
}

/**
 * Check the data object is empty AND the no data reason says that there are no matching patients.
 *
 * @returns {Boolean} - true iff status code is of the form 2xx
 */
MriResultParser.prototype.hasNoMatchingPatients = function () {
  return this.isEmpty() && this.noDataReason === 'MRI_PA_NO_MATCHING_PATIENTS'
}

/**
 * Check the data object is empty.
 *
 * @returns {Boolean} - true iff status code is of the form 2xx
 */
MriResultParser.prototype.isEmpty = function () {
  return Object.keys(this.dataTree).length === 0
}

/**
 * Returns the number of categories.
 *
 * @returns {Number} - No. categories
 */
MriResultParser.prototype.getCategoryCount = function () {
  var count = 0
  var curTree = this.dataTree
  var curKey
  while (Array.isArray(curTree) === false && Object.keys(curTree).length !== 0) {
    curKey = Object.keys(curTree)[0]
    curTree = curTree[curKey]
    count++
  }
  return count
}

/**
 * Returns the total no. of data points.
 *
 * @returns {Number} - No. of data points
 */
MriResultParser.prototype.getDataPointCount = function () {
  function _countDataPoints(tree) {
    if (Array.isArray(tree)) {
      return 1
    } else if (Object.keys(tree).length === 0) {
      return 0
    } else {
      var countArray = Object.keys(tree).map(function (key) {
        return _countDataPoints(tree[key])
      })
      return countArray.reduce(function (prev, cur) {
        return prev + cur
      }, 0)
    }
  }
  return _countDataPoints(this.dataTree)
}

/**
 * Return all values for the first category in the parser.
 *
 * @returns {(String|Number)[]} - array with category values
 */
MriResultParser.prototype.getCategoryValues = function () {
  assert(Array.isArray(this.dataTree) === false, 'No categories left!')
  return Object.keys(this.dataTree)
}

/**
 * Return a parser containing all data points for which the value of the
 * first category in the parser equals the passed value.
 *
 * @param {(String|Number)} categoryValue - category value we want to select for.
 * @returns {MriResultParser} - new parser instance
 */
MriResultParser.prototype.selectCategory = function (categoryValue) {
  assert(Array.isArray(this.dataTree) === false, 'No categories left!')
  var newTree
  if (typeof this.dataTree[categoryValue] === 'undefined') {
    newTree = {}
  } else {
    newTree = _cloneJson(this.dataTree[categoryValue])
  }
  return new MriResultParser(this.response, newTree)
}

/**
 * Return the measure values (for a completely specified combination of categories).
 *
 * Only works when the parser contains a single datapoint, i.e. when we have
 * chosen values for all categories using selectCategory().
 *
 * @returns {(Number|String)[]} - array with measure values
 */
MriResultParser.prototype.getMeasureValues = function () {
  assert(Array.isArray(this.dataTree) === true, 'Have not chosen values for all categories!')
  return _cloneJson(this.dataTree)
}

/**
 * Return pairs of (final) category and associated values.
 *
 * Only works when the parser contains a categroy, i.e. when we have
 * chosen values for all categories except one using selectCategory().
 *
 * @returns {[(String|Number|(String|Number)[])]} - array with paris of category and measure values
 */
MriResultParser.prototype.getCategoryMeasurePairs = function () {
  assert(this.getCategoryCount() === 1, 'Parser must contain exactly one category!')
  var orderedCats = Object.keys(this.dataTree).sort()
  var that = this
  return orderedCats.map(function (catVal) {
    return [catVal, that.dataTree[catVal]]
  })
}

module.exports = api
