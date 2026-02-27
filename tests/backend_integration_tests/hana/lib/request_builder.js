/* eslint-env node */
/**
 * Builder for requests.
 *
 * @module request_builder
 *
 */

'use strict'

var assert = require('assert')
var utils = require('./utils')
var request2Bookmark = require('./Request2Bookmark').request2Bookmark

// Tags defined independently of config
var predefinedTags = {
  basicdata: 'patient'
}

/**
 * Patient builder object.
 *
 * @constructor
 * @param {Object} configMetaData - configuration metadata for request
 *                               (specifies which MRI config to use)
 * @param {Object} mriConfig - MRI config (as JSON)
 */
function RequestBuilder(configMetaData, mriConfig) {
  assert(typeof mriConfig !== 'undefined', 'Need to specify an MRI configuration!')
  // "Constant" data
  this.configMetaData = configMetaData
  this.interactionConditionMap = this._getInteractionConditionMap(mriConfig)
  // These will change over the object lifetime
  this.curRoot = []
  this.interactionCounts = {}
  this.interactionTags = predefinedTags
  this.section = null
  this.allRequestObj = null
  this.anyRequestObj = null
  this.inChartSetting = false
}

/*
 * Set-up a mapping between interction IDs and condition IDs.
 */
RequestBuilder.prototype._getInteractionConditionMap = function (mriConfig) {
  var map = {}
  var interactionMatch
  var interactionId
  var conditionMatch
  var curPath
  mriConfig.filtercards.forEach(function (filtercard) {
    curPath = filtercard.source
    interactionMatch = curPath.match(/\.interactions\.([^\.]+)(?:\.|$)/)
    if (interactionMatch) {
      interactionId = interactionMatch[1]
      conditionMatch = curPath.match(/\.conditions\.([^\.]+)\./)
      if (conditionMatch) {
        map[interactionId] = conditionMatch[1]
      } else {
        map[interactionId] = null
      }
    }
  })
  return map
}

/**
 * Starts a new patient.
 *
 * @returns {this} this
 */
RequestBuilder.prototype.request = function () {
  this._resetRequest()
  return this
}

/*
 * Resets the current patient (i.e. resets all the
 * variables that are modified during building).
 *
 * @private
 */
RequestBuilder.prototype._resetRequest = function () {
  this.curRoot = []
  this.interactionCounts = {}
  this.interactionTags = predefinedTags
  this.section = null
  this.allRequestObj = {
    patient: {
      isFiltercard: true
    },
    configData: this.configMetaData
  }
  this.anyRequestObj = null
}

/**
 * Set the request object to be guarded (i.e. use guarded tables).
 *
 * @returns {this} this
 */
RequestBuilder.prototype.guarded = function () {
  this.allRequestObj.guarded = true
  return this
}

/**
 * Set the Kaplan-Meier chart start even to be the event pointed to by the filtercard tag passed
 *
 * @param {String} tag - tag of reference event
 * @returns {this} this
 */
RequestBuilder.prototype.kmstart = function (tag) {
  if (!this.interactionTags.hasOwnProperty(tag)) {
    throw new Error('The filtercard tag ' + tag + ' has not been defined!')
  }
  this.allRequestObj.kmEventIdentifier = this.interactionTags[tag]
  return this
}

/**
 * Start the "match all" section
 *
 * @returns {this} this
 */
RequestBuilder.prototype.matchall = function () {
  if (this.section !== null) {
    throw new Error('matchall() can only be called once and must be called before matchany()!')
  }
  this.section = 'all'
  return this
}

/**
 * Start the "match any" section
 *
 * @returns {this} this
 */
RequestBuilder.prototype.matchany = function () {
  if (this.section !== 'all') {
    throw new Error('matchany() can only be called once and must be called after matchall()!')
  }
  this.section = 'any'
  this.curRoot = []
  this.anyRequestObj = {
    patient: {
      isFiltercard: true
    }
  }
  return this
}

/**
 * Start the basic data function (not inself a filtering operation).
 *
 * @returns {this} this
 */
RequestBuilder.prototype.basicdata = function () {
  this._basicdataStateTransition()
  return this
}

/**
 * Transition to new state after a call to basicdata().
 *
 * @private
 */
RequestBuilder.prototype._basicdataStateTransition = function () {
  this.curRoot = ['patient']
}

/**
 * Transition to the right state (path) after a call to attribute().
 *
 * @private
 * @param {String} attributeName - name of the attribute being added
 */
RequestBuilder.prototype._attributeStateTransition = function (attributeName) {
  if (this.curRoot.length === 0) {
    throw new Error('Cannot add attributes outside a filter card!')
  }
  var pathEnd = this.curRoot[this.curRoot.length - 1]
  if (pathEnd === 'patient') {
    this.curRoot.push('attributes', attributeName)
  } else if (utils.isNumber(pathEnd)) {
    // Inside a filtercard
    this.curRoot.push('attributes', attributeName)
  } else {
    this.curRoot[this.curRoot.length - 1] = attributeName
  }
}

/*
 * Return the current request object (which is either that for the matchall
 * section or that for the match any section).
 *
 * @private
 */
RequestBuilder.prototype._getCurRequestObj = function () {
  var curRequestObj
  if (this.section === 'any') {
    curRequestObj = this.anyRequestObj
  } else {
    curRequestObj = this.allRequestObj
  }
  return curRequestObj
}

/**
 * Add an attribute constraint.
 *
 * @param {string} attributeName - name of attribute (as in config path)
 * @param {Object} [attributeConstraint={}] - constraint on attribute
 * @returns {this} this
 */
RequestBuilder.prototype.attribute = function (attributeName, attributeConstraint) {
  this._attributeStateTransition(attributeName)
  var curRequestObj = this._getCurRequestObj()
  var filterPath = this.curRoot.join('.') + '.0.filter'
  if (utils.pathExistsInObject(curRequestObj, filterPath)) {
    if (typeof attributeConstraint !== 'undefined') {
      var currentVal = utils.getValueInObject(curRequestObj, filterPath)
      currentVal.push(attributeConstraint)
    }
  } else {
    var attributeObj = [{}]
    if (typeof attributeConstraint !== 'undefined') {
      attributeObj[0].filter = [attributeConstraint]
    }
    utils.createPathInObject(curRequestObj, this.curRoot.join('.'), attributeObj)
  }
  return this
}

/*
 * Transition to the right state (path) after a call to filtercard().
 *
 * @private
 */
RequestBuilder.prototype._filtercardStateTransition = function (interactionName, tag) {
  if (tag === 'basicdata') {
    throw new Error('the tag "basicdata" is reserved for the basic data card!')
  }
  var unnumberedInteractionRoot
  if (this.interactionConditionMap[interactionName] === null) {
    unnumberedInteractionRoot = ['patient', 'interactions', interactionName]
  } else {
    unnumberedInteractionRoot = [
      'patient',
      'conditions',
      this.interactionConditionMap[interactionName],
      'interactions',
      interactionName
    ]
  }
  // Handle interaction instance numbering
  var unnumberedInteractionPath = unnumberedInteractionRoot.join('.')
  if (this.interactionCounts.hasOwnProperty(unnumberedInteractionPath)) {
    this.interactionCounts[unnumberedInteractionPath]++
  } else {
    this.interactionCounts[unnumberedInteractionPath] = 1
  }
  this.curRoot = unnumberedInteractionRoot
  this.curRoot.push(this.interactionCounts[unnumberedInteractionPath].toString())
  this.interactionTags[tag] = this.curRoot.join('.')
}

/**
 * Add a filtercard constraint.
 *
 * @param {String} interactionName - name of interaction (as in config path)
 * @param {String} [tag] - tag for this configuration (used for referring to it later)
 * @returns {this} this
 */
RequestBuilder.prototype.filtercard = function (interactionName, tag) {
  this._filtercardStateTransition(interactionName, tag)
  var curRequestObj = this._getCurRequestObj()
  var filterPath = this.curRoot.join('.')
  if (!utils.pathExistsInObject(curRequestObj, filterPath)) {
    utils.createPathInObject(curRequestObj, filterPath, { isFiltercard: true })
  }
  return this
}

/*
 * Checks if a given path (given as an array of strings) is a path to an interaction.
 *
 * @private
 */
function _isInteractionPath(path) {
  return path.length > 1 && utils.isNumber(path[path.length - 1])
}

/*
 * Checks if a given path (given as an array of strings) is a path to an
 * interactions or an interaction attribute.
 *
 * @private
 */
function _isInteractionOrInteractionAttributePath(path) {
  return path.length > 1 && path.indexOf('interactions') >= 0
}

/**
 * Sets the preceding interaction to be excluded.
 *
 * @returns {this} this
 */
RequestBuilder.prototype.exclude = function () {
  if (!_isInteractionPath(this.curRoot)) {
    throw new Error('exclude() must be called right after filtercard()')
  }
  var curRequestObj = this._getCurRequestObj()
  var curRootAsString = this.curRoot.join('.')
  utils.createPathInObject(curRequestObj, curRootAsString + '.exclude', true)
  return this
}

/*
 * Transition to the right state (path) after a call to relativetime().
 *
 * @private
 */
RequestBuilder.prototype._relativetimeTransition = function (type, firstTag, secondTag) {
  if (type !== 'isSucceededBy') {
    throw new Error('Can currently only handle "isSucceededBy" constraints!')
  }
  if (!this.interactionTags.hasOwnProperty(firstTag) || !this.interactionTags.hasOwnProperty(secondTag)) {
    throw new Error('One or both of the interaction tags have not been defined!')
  }
  this.curRoot = this.interactionTags[firstTag].split('.')
  if (!_isInteractionOrInteractionAttributePath(this.curRoot)) {
    throw new Error('Cannot add attributes outside a filter card!')
  }
  var pathEnd = this.curRoot[this.curRoot.length - 1]
  if (utils.isNumber(pathEnd)) {
    // Inside an interaction
    this.curRoot.push('attributes', '_succ')
  } else {
    this.curRoot[this.curRoot.length - 1] = '_succ'
  }
}

/**
 * Add a relative time constraint between two interactions.
 *
 * @param {String} type - type of constraint
 * @param {String} firstTag - tag of first constraintned interaction
 * @param {String} secondTag - tag of second constraintned interaction
 * @param {Object} [constraint={}] - constraint
 * @returns {this} this
 */
RequestBuilder.prototype.relativetime = function (type, firstTag, secondTag, constraint) {
  this._relativetimeTransition(type, firstTag, secondTag)
  if (typeof constraint === 'undefined' || constraint === null) {
    throw new Error('No pair constraint defined!')
  }
  var attributeObj = [
    {
      value: this.interactionTags[secondTag]
    }
  ]
  if (typeof constraint !== 'undefined') {
    attributeObj[0].filter = [constraint]
  }
  var curRequestObj = this._getCurRequestObj()
  utils.createPathInObject(curRequestObj, this.curRoot.join('.'), attributeObj)
  return this
}

/*
 * Transition to the right state (path) after a call to absoluteTime().
 *
 * @private
 */
RequestBuilder.prototype._absoluteTimeStateTransition = function () {
  if (!_isInteractionOrInteractionAttributePath(this.curRoot)) {
    throw new Error('Cannot add time constraints outside a filter card!')
  }
  var pathEnd = this.curRoot[this.curRoot.length - 1]
  if (utils.isNumber(pathEnd)) {
    // Inside an interaction
    this.curRoot.push('attributes', '_absTime')
  } else {
    this.curRoot[this.curRoot.length - 1] = '_absTime'
  }
}

/**
 * Add an absolute time constraint to an interaction.
 *
 * @param {Object} constraint - constraint
 * @returns {this} this
 */
RequestBuilder.prototype.absolutetime = function (constraint) {
  this._absoluteTimeStateTransition()
  this.attribute('_absTime', constraint)
  return this
}

/**
 * Start the chart settings section.
 *
 * @returns {this} this
 */
RequestBuilder.prototype.chart = function () {
  this.section = 'chart'
  return this
}

/*
 * Transition to the right state (path) after a call to xaxis().
 *
 * @private
 */
RequestBuilder.prototype._xaxisTransition = function (tag, attribute) {
  if (this.section !== 'chart') {
    throw new Error('X-axes can only be assigned in section following a call to chart()!')
  }
  if (!this.interactionTags.hasOwnProperty(tag)) {
    throw new Error('One or both of the interaction tags have not been defined!')
  }
  this.curRoot = this.interactionTags[tag].split('.')
  this.curRoot = this.curRoot.concat(['attributes', attribute])
}

/**
 * Assign an attribute to an x-axis.
 *
 * @param {String} tag - filtercard tag for required attribute
 * @param {String} attribute - fname of required attribute
 * @param {Number} [axisNo=1] - no. of x-axis to assign to
 * @param {Number} [binsize] - size of bin used for result binning
 * @returns {this} this
 */
RequestBuilder.prototype.xaxis = function (tag, attribute, axisNo, binsize) {
  this._xaxisTransition(tag, attribute)
  if (typeof axisNo === 'undefined' || axisNo === null) {
    axisNo = 1
  }
  var curRootAsString = this.curRoot.join('.')
  var curRequestObj = this._getCurRequestObj()
  if (utils.pathExistsInObject(curRequestObj, curRootAsString)) {
    var currentVal = utils.getValueInObject(curRequestObj, curRootAsString)
    currentVal[0].xaxis = axisNo
    if (typeof binsize !== 'undefined') {
      currentVal[0].binsize = binsize
    }
  } else {
    var axisProp = { xaxis: axisNo }
    if (typeof binsize !== 'undefined' && binsize !== null) {
      axisProp.binsize = binsize
    }
    utils.createPathInObject(curRequestObj, curRootAsString, [axisProp])
  }
  return this
}

/*
 * Transition to the right state (path) after a call to yaxis().
 *
 * @private
 */
RequestBuilder.prototype._yaxisTransition = function (tag, attribute) {
  if (this.section !== 'chart') {
    throw new Error('Y-axes can only be assigned in section following a call to chart()!')
  }
  if (!this.interactionTags.hasOwnProperty(tag)) {
    throw new Error('One or both of the interaction tags have not been defined!')
  }
  this.curRoot = this.interactionTags[tag].split('.')
  this.curRoot = this.curRoot.concat(['attributes', attribute])
}

/**
 * Assign an attribute to an y-axis.
 *
 * @param {String} tag - filtercard tag for required attribute
 * @param {String} attribute - fname of required attribute
 * @param {Number} [axisNo=1] - no. of y-axis to assign to
 * @param {String} [aggregation] - aggregation to use ('avg, ''sum' etc.)
 * @returns {this} this
 */
RequestBuilder.prototype.yaxis = function (tag, attribute, axisNo, aggregation) {
  this._yaxisTransition(tag, attribute)
  if (typeof axisNo === 'undefined' || axisNo === null) {
    axisNo = 1
  }
  var curRootAsString = this.curRoot.join('.')
  var curRequestObj = this._getCurRequestObj()
  if (utils.pathExistsInObject(curRequestObj, curRootAsString)) {
    var currentVal = utils.getValueInObject(curRequestObj, curRootAsString)
    currentVal[0].yaxis = axisNo
    if (typeof aggregation !== 'undefined') {
      currentVal[0].aggregation = aggregation
    }
  } else {
    var axisProp = { yaxis: axisNo }
    if (typeof aggregation !== 'undefined') {
      axisProp.aggregation = aggregation
    }
    utils.createPathInObject(curRequestObj, curRootAsString, [axisProp])
  }
  return this
}

/*
 * Return a JSON with the paths to the OR (match any) patient interactions as keys
 * and the corresponding interaction objects as values.
 *
 * @private
 */
RequestBuilder.prototype._getPatientOrInteractions = function () {
  var orIntObj = {}
  var that = this
  // Patient interactions
  if (utils.pathExistsInObject(this.anyRequestObj, 'patient.interactions')) {
    var patientInteractions = Object.keys(that.interactionConditionMap).filter(function (interactionName) {
      return that.interactionConditionMap[interactionName] === null
    })
    patientInteractions.forEach(function (interactionType) {
      var intPath = 'patient.interactions.' + interactionType
      if (utils.pathExistsInObject(that.anyRequestObj, intPath)) {
        orIntObj[intPath] = []
        var interactionObj = that.anyRequestObj.patient.interactions[interactionType]
        var interactionObjKeys = Object.keys(interactionObj)
        interactionObjKeys.forEach(function (key) {
          orIntObj[intPath].push(interactionObj[key])
        })
      }
    })
  }
  return orIntObj
}

/*
 * Add the passed JSON entries with the paths to the OR (match any) condition interactions as keys
 * and the corresponding interaction objects as values.
 *
 * @private
 */
RequestBuilder.prototype._addConditionOrInteractions = function (orIntObj) {
  var that = this
  if (utils.pathExistsInObject(this.anyRequestObj, 'patient.conditions')) {
    var conditionTypes = Object.keys(this.anyRequestObj.patient.conditions)
    conditionTypes.forEach(function (conditionsType) {
      var conditionInteractionTypes = Object.keys(that.anyRequestObj.patient.conditions[conditionsType].interactions)
      conditionInteractionTypes.forEach(function (interactionType) {
        var intPath = 'patient.conditions.' + conditionsType + '.interactions.' + interactionType
        orIntObj[intPath] = []
        var interactionObj = that.anyRequestObj.patient.conditions[conditionsType].interactions[interactionType]
        var interactionObjKeys = Object.keys(interactionObj)
        interactionObjKeys.forEach(function (key) {
          orIntObj[intPath].push(interactionObj[key])
        })
      })
    })
  }
  return orIntObj
}

/*
 * Return a JSON with the paths to the OR (match any) interactions as keys
 * and the corresponding interaction objects as values.
 *
 * @private
 */
RequestBuilder.prototype._getOrInteractions = function () {
  var orIntObj = this._getPatientOrInteractions()
  orIntObj = this._addConditionOrInteractions(orIntObj)
  return orIntObj
}

/*
 * Return the path of the format interactionPath + '.X' for some integer X such
 * that (a) the path does not exist in the passed object, and (b) X is small as possible.
 *
 * @private
 */
RequestBuilder.prototype._getFirstNonexistentNumberedPath = function (interactionPath, reqObjClone) {
  var intCounter = 1
  var numberedPath = interactionPath + '.' + intCounter
  while (utils.pathExistsInObject(reqObjClone, numberedPath)) {
    intCounter++
    numberedPath = interactionPath + '.' + intCounter
  }
  return numberedPath
}

/*
 * Take an array of specified interaction, merge each it into a *cloned* version of the
 * match all request object, and return an array with the results.
 *
 * @private
 */
RequestBuilder.prototype._mergeInteraction = function (interactionPath, interactionObjArr) {
  var mergedObjArray = []
  var reqObjClone
  var numberedPath
  var that = this
  interactionObjArr.forEach(function (interactionObj) {
    reqObjClone = JSON.parse(JSON.stringify(that.allRequestObj))
    numberedPath = that._getFirstNonexistentNumberedPath(interactionPath, reqObjClone)
    utils.createPathInObject(reqObjClone, numberedPath, interactionObj)
    mergedObjArray.push(reqObjClone)
  })
  return mergedObjArray
}

/**
 * Return a JSON representation of current patient.
 *
 * @returns {Object} - JSON representation of patient.
 */
RequestBuilder.prototype.buildJson = function () {
  var requestArray = []
  if (this.anyRequestObj === null) {
    // Nothing in the "match any" section
    requestArray.push(this.allRequestObj)
  } else {
    var orInteractions = this._getOrInteractions()
    var that = this
    Object.keys(orInteractions).forEach(function (interactionPath) {
      var mergedInteractionObjArr = that._mergeInteraction(interactionPath, orInteractions[interactionPath])
      mergedInteractionObjArr.forEach(function (mergedInteractionObj) {
        requestArray.push(mergedInteractionObj)
      })
    })
  }
  return requestArray
}

/**
 * Return a IFR representation of current patient.
 *
 * @returns {Object} - IFR representation of patient.
 */
RequestBuilder.prototype.buildIFR = function (isKMRequest) {
  var request = isKMRequest ? request2Bookmark(this.buildJson(), 'km') : request2Bookmark(this.buildJson())
  return { ...request, datasetId: 'cd13fd3e-9f35-4812-b2a1-497b232a8771' }
}

/**
 * Send the request to the specified endpoint endpoint.
 *
 * @param {HanaRequest} hanaRequest - HanaRequest object
 * @param {String} urlPath - URL of endpoint (relative to base URL given in hanaRequest)
 * @param {Object} parameters - JSON parameter argument to be passed to hanaRequest
 * @param {Function} cb - callback
 */
RequestBuilder.prototype.submit = function (hanaRequest, urlPath, parameters, cb) {
  var kmRequest = false

  if (parameters[`dataFormat`]) {
    urlPath += `/${parameters[`dataFormat`]}`
  }
  if (parameters[`chartType`]) {
    urlPath += `/${parameters[`chartType`]}`
  }
  if (parameters.isKMRequest) {
    kmRequest = parameters.isKMRequest
    delete parameters.isKMRequest
  }

  // Append datasetId as query param for trex auth
  parameters['datasetId'] = 'cd13fd3e-9f35-4812-b2a1-497b232a8771'

  var setQuery = {
    method: parameters[`httpMethod`],
    path: urlPath,
    body: JSON.stringify(this.buildIFR(kmRequest)),
    parameters: parameters,
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  hanaRequest.request(setQuery, function (err, response, body) {
    cb(err, response, body)
  })
}

module.exports = RequestBuilder
