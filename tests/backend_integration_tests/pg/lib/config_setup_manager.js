/**
 * Setup functionality for configurations
 *
 * @module config_setup_manager
 *
 */
/* eslint-env node */
/* global __dirname */
'use strict'

var BackendUplink = require('./backend_uplink')
var HostConfig = require('./host_config')
var HanaRequest = require('./hana_request')
var utils = require('./utils')

var assert = require('assert')
var async = require('async')
var fs = require('fs')
var path = require('path')

/**
 * Constructor for the setupmanager.
 *
 * @constructor
 * @param {String} sEnvironmentPath - path to the file holding the environment settings
 * @param {String} configName - name of the configuration set-up to (as stored in configuration file) to be used
 */
function ConfigSetupManager(sEnvironmentPath, configName) {
  assert(configName, 'Need to specify a configuration name!')
  var oHostConfig = new HostConfig(sEnvironmentPath)
  this.log = utils.getLogger(oHostConfig.getLogStatus(), 'In config_setup_manager: ')
  this.testSchemaName = oHostConfig.getTestSchemaName()
  this.mriAssignmentId = null
  this.patientAssignmentId = null
  // HTTP request handlers
  var hphHanaRequest = new HanaRequest(oHostConfig.getFfhAdminUserLogin())
  var mriHanaRequest = new HanaRequest(oHostConfig.getMriAdminUserLogin())
  this.hphUplink = new BackendUplink(hphHanaRequest, oHostConfig.getLogStatus())
  this.mriUplink = new BackendUplink(mriHanaRequest, oHostConfig.getLogStatus())
  this.cdwConfigName = oHostConfig.getCdwConfigName(configName)
  this.mriConfigName = oHostConfig.getMriConfigName(configName)
  this.patientConfigName = oHostConfig.getPatientSummaryConfigName(configName)
  this.creationConfigName = oHostConfig.getCreationConfigName(configName)
  this.integrationTestFolder = oHostConfig.getIntegrationTestFolder()
  // Constants used throughout
  this.CDW_CONFIG_ID = oHostConfig.getCdwConfigId(configName)
  this.MRI_CONFIG_ID = oHostConfig.getMriConfigId(configName)
  this.PATIENT_CONFIG_ID = oHostConfig.getPatientSummaryConfigId(configName)
}

/**
 * Return the current MRI configuration (as JSON).
 *
 * @returns {Object} - MRI configuration
 */
ConfigSetupManager.prototype.getMriConfiguration = function () {
  // Read config synchronously
  var mriConfigFilePath = path.join(__dirname, '..', this.integrationTestFolder, this.mriConfigName)
  return JSON.parse(fs.readFileSync(mriConfigFilePath))
}

/**
 * Return the current MRI metadata (as JSON).
 *
 * @returns {Object} - MRI configuration metadata
 */
ConfigSetupManager.prototype.getMriConfigurationMetadata = function () {
  var metaData = {
    configId: this.MRI_CONFIG_ID,
    configVersion: 'A'
  }
  return metaData
}

/**
 * Set up all configuration (CDW, MRI, Patient Summary, global parameters)
 *
 * @param {String} testSchemaName - name of test schema
 * @param {Number} minCohortSize - censoring threshold for cohorts
 * @param {Function} callback - callback
 */
ConfigSetupManager.prototype.setupConfiguration = function (testSchemaName, minCohortSize, callback) {
  // Read configs synchronously
  var cdwConfigFilePath = path.join(__dirname, '..', this.integrationTestFolder, this.cdwConfigName)
  var mriConfigFilePath = path.join(__dirname, '..', this.integrationTestFolder, this.mriConfigName)
  var patientConfigFilePath = path.join(__dirname, '..', this.integrationTestFolder, this.patientConfigName)
  var cdwConfig = JSON.parse(fs.readFileSync(cdwConfigFilePath))
  var mriConfig = JSON.parse(fs.readFileSync(mriConfigFilePath))
  var patientConfig = JSON.parse(fs.readFileSync(patientConfigFilePath))
  // Parameter overriding
  if (minCohortSize) {
    mriConfig.chartOptions.minCohortSize = minCohortSize
  }

  var that = this
  var aliceUser = 'bbdaab1b-c43b-4f69-9542-5959a7c40e69'

  var addCdwTestConfigTask = function (cb) {
    that.log('Adding CDW configuration with ID ' + that.CDW_CONFIG_ID)
    that.hphUplink.addCdwConfiguration(cdwConfig, that.CDW_CONFIG_ID, 'auto_cdw_config_' + that.CDW_CONFIG_ID, cb)
  }
  var addMriTestConfigTask = function (cb) {
    that.log('Adding MRI configuration with ID ' + that.MRI_CONFIG_ID)
    that.mriUplink.addMriConfiguration(
      mriConfig,
      that.MRI_CONFIG_ID,
      'auto_mri_config_' + that.MRI_CONFIG_ID,
      that.CDW_CONFIG_ID,
      cb
    )
  }
  var addPatientTestConfigTask = function (cb) {
    that.log('Adding Patient Summary configuration with ID ' + that.PATIENT_CONFIG_ID)
    that.hphUplink.addPatientConfiguration(
      patientConfig,
      that.PATIENT_CONFIG_ID,
      'auto_patient_config_' + that.PATIENT_CONFIG_ID,
      that.CDW_CONFIG_ID,
      cb
    )
  }

  // Do the actual work here
  async.series([addCdwTestConfigTask, addMriTestConfigTask], callback)
}

/**
 * Override the part of the standard MRI config with what is passed in JSON
 * parameter and activate the new config (under the same ID).,
 *
 * @param {Object} mriConfigFragment - a sub-object of an MRI config JSON -
 *                                    if an empty object, the function will
 *                                    return the stored default MRI config.
 * @param {Function} callback - callback
 */
ConfigSetupManager.prototype.adaptMriConfiguration = function (mriConfigFragment, callback) {
  // Read configs synchronously
  var mriConfigFilePath = path.join(__dirname, '..', this.integrationTestFolder, this.mriConfigName)
  var mriConfig = JSON.parse(fs.readFileSync(mriConfigFilePath))
  var newMriConfig = utils.merge(mriConfig, mriConfigFragment)
  this.mriUplink.addMriConfiguration(
    newMriConfig,
    this.MRI_CONFIG_ID,
    'auto_mri_config_' + this.MRI_CONFIG_ID,
    this.CDW_CONFIG_ID,
    callback
  )
}

/**
 * Remove all coniguration set up as part of the test environment
 *
 * @param {Function} callback - callback
 */
ConfigSetupManager.prototype.teardownConfiguration = function (callback) {
  // Define async tasks to be carried out
  var that = this
  var removeMriTestConfigAssignmentToAliceTask = function (cb) {
    that.log('Removing config assignment')
    if (typeof that.mriAssignmentId !== 'undefined' && that.mriAssignmentId !== null) {
      that.hphUplink.removeMriConfigurationAssignment(that.mriAssignmentId, cb)
    } else {
      process.nextTick(cb)
    }
  }
  var removeMriTestConfigTask = function (cb) {
    that.log('Removing MRI config')
    that.mriUplink.removeMriConfiguration(that.MRI_CONFIG_ID, cb)
  }
  var removePatientTestConfigAssignmentToAliceTask = function (cb) {
    that.log('Removing config assignment')
    if (typeof that.patientAssignmentId !== 'undefined' && that.patientAssignmentId !== null) {
      that.hphUplink.removePatientConfigurationAssignment(that.patientAssignmentId, cb)
    } else {
      process.nextTick(cb)
    }
  }
  var removePatientTestConfigTask = function (cb) {
    that.log('Removing Patient config')
    that.hphUplink.removePatientConfiguration(that.PATIENT_CONFIG_ID, cb)
  }
  var removeCdwTestConfigTask = function (cb) {
    that.log('Removing CDW config')
    that.hphUplink.removeCdwConfiguration(that.CDW_CONFIG_ID, cb)
  }
  var redirectQueriesBackTask = function (cb) {
    that.log('Redirecting queries back to normal schema')
    that.hphUplink.redirectQueriesBackToStandardSchema(cb)
  }
  // Do the actual work here
  async.series([removeMriTestConfigAssignmentToAliceTask, removeMriTestConfigTask, removeCdwTestConfigTask], callback)
}

module.exports = ConfigSetupManager
