/* eslint-env node */

/**
 * Builder for patients.
 *
 * @module patient_builder
 *
 */

'use strict'

var utils = require('./utils')
var async = require('async')

/**
 * Patient builder object.
 *
 * @constructor
 */
function PatientBuilder() {
  this.curRoot = []
  this.patientSet = []
  this.patientObj = {}
  this.interactionCounts = {}
}

/**
 * Start a new patient.
 *
 * @returns {this} this
 */
PatientBuilder.prototype.patient = function () {
  this._patientStateTransition()
  return this
}

/*
 * Transition into new state after a call to patient().
 *
 * @private
 */
PatientBuilder.prototype._patientStateTransition = function () {
  this._resetPatient()
}

/*
 * Reset the current patient.
 *
 * @private
 */
PatientBuilder.prototype._resetPatient = function () {
  this.curRoot = ['patient']
  this.patientObj = {
    patient: {}
  }
  this.interactionCounts = {}
}

/**
 * Add an attribute.
 *
 * @param {String} attributeName - name of attribute (as in config path)
 * @param {String} attributeValue - value of attribute (as in config path)
 * @returns {this} this
 */
PatientBuilder.prototype.attribute = function (attributeName, attributeValue) {
  this._attributeStateTransition(attributeName)
  utils.createPathInObject(this.patientObj, this.curRoot.join('.'), attributeValue)
  return this
}

/*
 * Returns true if the passed path array represents a path to an attribute.
 *
 * @private
 */
function _isAttributePath(path) {
  return path.length > 1 && path[path.length - 2] === 'attributes'
}

/*
 * Returns true if the passed path array represents a path to a condition.
 *
 * @private
 */
function _isConditionPath(path) {
  return path.length > 1 && path[path.length - 2] === 'conditions'
}

/*
 * Transition into new state after a call to attribute().
 *
 * @private
 */
PatientBuilder.prototype._attributeStateTransition = function (attributeName) {
  if (_isAttributePath(this.curRoot)) {
    this.curRoot[this.curRoot.length - 1] = attributeName
  } else if (_isConditionPath(this.curRoot)) {
    throw new Error('Cannot add attributes to conditions!   ')
  } else {
    this.curRoot.push('attributes', attributeName)
  }
}

/*
 * @private
 */
function _isIsoUtcTimestamp(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(s)
}

/*
 * @private
 */
function _isIsoDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/*
 * Check that the passed times have the right format and the right order.
 *
 * @private
 */
PatientBuilder.prototype._checkTimes = function (startTime, endTime) {
  if (startTime) {
    if (!_isIsoUtcTimestamp(startTime) && !_isIsoDate(startTime)) {
      throw new Error('Start date has to be formatted as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ!')
    }
    if (endTime) {
      if (!_isIsoUtcTimestamp(endTime) && !_isIsoDate(endTime)) {
        throw new Error('Start date has to be formatted as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ!')
      }
      if (new Date(startTime) > new Date(endTime)) {
        throw new Error('End time must after or simulataneous with start time!')
      }
    }
  }
}

/*
 * Set start and end times for an interaction.
 *
 * @private
 */
PatientBuilder.prototype._setTimes = function (startTime, endTime) {
  if (startTime) {
    var time1
    if (_isIsoDate(startTime)) {
      time1 = startTime + 'T00:00:00.000Z'
    } else {
      time1 = startTime
    }
    utils.createPathInObject(this.patientObj, this.curRoot.join('.') + '._start', time1)
  }
  if (endTime) {
    var time2
    if (_isIsoDate(endTime)) {
      time2 = endTime + 'T00:00:00.000Z'
    } else {
      time2 = endTime
    }
    utils.createPathInObject(this.patientObj, this.curRoot.join('.') + '._end', time2)
  }
}

/**
* Add an interaction.
*
* @param {String} interactionName - name of interaction (as in config path)
* @param {String} [startTime] - UTC start time of interaction, formatted as
        YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ
* @param {String} [endTime] - UTC end time of interaction, formatted as
        YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ
* @returns {this} this
*/
PatientBuilder.prototype.interaction = function (interactionName, startTime, endTime) {
  this._checkTimes(startTime, endTime)
  this._interactionStateTransition(interactionName)
  utils.createPathInObject(this.patientObj, this.curRoot.join('.'), {})
  this._setTimes(startTime, endTime)
  return this
}

/*
 * Transition into new state after a call to interaction().
 *
 * @private
 */
PatientBuilder.prototype._interactionStateTransition = function (interactionName) {
  var conditionPos = this.curRoot.indexOf('conditions')
  var unnumberedInteractionRoot
  if (conditionPos < 0) {
    unnumberedInteractionRoot = ['patient', 'interactions', interactionName]
  } else {
    // Condition level
    unnumberedInteractionRoot = this.curRoot.slice(0, conditionPos + 2)
    unnumberedInteractionRoot.push('interactions', interactionName)
  }
  // Handle interaction instance numbering
  var unnumberedInteractionPath = unnumberedInteractionRoot.join('.')
  if (this.interactionCounts.hasOwnProperty(unnumberedInteractionPath)) {
    this.interactionCounts[unnumberedInteractionPath]++
  } else {
    this.interactionCounts[unnumberedInteractionPath] = 1
  }
  this.curRoot = unnumberedInteractionRoot
  this.curRoot.push(this.interactionCounts[unnumberedInteractionPath])
}

/**
 * Add a condition.
 *
 * @param {String} conditionName - name of condition (as in config path)
 * @returns {this} this
 */
PatientBuilder.prototype.condition = function (conditionName) {
  this._conditionStateTransition(conditionName)
  utils.createPathInObject(this.patientObj, this.curRoot.join('.'), {})
  return this
}

/*
 * Transition into new state after a call to condition().
 *
 * @private
 */
PatientBuilder.prototype._conditionStateTransition = function (conditionName) {
  this.curRoot = ['patient', 'conditions', conditionName]
}

/**
 * Add the current patient to the patient set and clear the current patient.
 */
PatientBuilder.prototype.add = function () {
  var curPatientJson = JSON.parse(JSON.stringify(this.patientObj))
  this.patientSet.push(curPatientJson)
  this._resetPatient()
}

/**
 * Return a JSON representation of current patient.
 *
 * @returns {Object} - JSON representation of patient.
 */
PatientBuilder.prototype.buildJson = function () {
  return this.patientObj
}

/**
 * Return an array of JSON representations of current patient set.
 *
 * @returns {Object[]} - array of JSON representations of patients.
 */
PatientBuilder.prototype.buildJsonArray = function () {
  return this.patientSet
}

/**
 * Persist the patient in the current patient set.
 *
 * @param {Object} patientCreator - patient creator object
 * @param {function} callback - callback
 */
PatientBuilder.prototype.persistAll = function (patientCreator, callback) {
  var patientJsonArray = this.buildJsonArray()
  var addPatientWithNoCondId = function (patientJson, cb) {
    patientCreator.addPatient(patientJson, null, cb)
  }
  async.map(patientJsonArray, addPatientWithNoCondId, callback)
}

module.exports = PatientBuilder
