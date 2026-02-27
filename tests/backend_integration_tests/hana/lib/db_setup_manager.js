/**
 * Setup functionality for the DB.
 *
 * @module db_setup_manager
 *
 */
/* eslint-env node */
/* global __dirname */
'use strict'

var TestEnvironment = require('./hdb_testenvironment')
var HostConfig = require('./host_config')
var utils = require('./utils')

var hdb = require('hdb')
var async = require('async')

/**
 * Constructor for the setupmanager.
 *
 * @constructor
 * @param {String} sEnvironmentPath - path to the file holding the environment settings
 * @param {String} configName - name of the configuration set-up to (as stored in configuration file) to be used
 */
function DbSetupManager(sEnvironmentPath, configName) {
  var oHostConfig = new HostConfig(sEnvironmentPath)
  // Set up database connection
  this.hdbClient = hdb.createClient(oHostConfig.getHdbSystemCredentials())
  this.log = utils.getLogger(oHostConfig.getLogStatus(), 'In db_setup_manager: ')
  var that = this
  this.hdbClient.on('error', function (err) {
    that.log('Network connection error: ', err)
  })
  this.testEnvironment = new TestEnvironment(this.hdbClient, oHostConfig.getTestSchemaName(), false)
  this.mriAssignmentId = null
  this.patientAssignmentId = null
  this.creationConfigName = oHostConfig.getCreationConfigName(configName)
  this.technicalUserName = oHostConfig.getTechnicalUserName()
  this.standardSchemaName = oHostConfig.getStandardSchemaName()
}

/**
 * Get the name of the test schema.
 *
 * @returns {String} - name of test schema
 */
DbSetupManager.prototype.getTestSchemaName = function () {
  return this.testEnvironment.schema
}

/**
 * Clear the test schema.
 *
 * @param {Function} cb - callback
 */
DbSetupManager.prototype.clearTestSchema = function (cb) {
  this.testEnvironment.clearSchema(cb)
}

/**
 * Set up the internal test environment.
 *
 * @param {String} testSchemaName - name of test schema
 * @param {Function} cb - callback
 */
DbSetupManager.prototype.setUpTestEnvironment = function (testSchemaName, cb) {
  this.testEnvironment.envSetup(cb)
}

/**
* Set up all configuration (CDW, MRI, global parameters)
=======
* Create an organisation
*
* @param {String} org - name of the organisation
* @param {Function} cb - callback
*/
DbSetupManager.prototype.createOrg = function (org, cb) {
  var that = this
  function createOrg(callback) {
    that.testEnvironment.insertIntoTable(
      'legacy.cdw.db.models::Config.Org',
      {
        OrgID: org,
        ValidFrom: '1950-01-02T00:00:00.000Z'
      },
      callback
    )
  }
  function createOrgAncestor(callback) {
    that.testEnvironment.insertIntoTable(
      'legacy.cdw.db.models::Config.OrgAncestors',
      {
        OrgID: org,
        AncestorOrgID: org,
        Distance: 0
      },
      callback
    )
  }

  // Do the actual work here
  async.series([createOrg, createOrgAncestor], cb)
}

/**
 * Assign a user to an organisation
 *
 * @param {String} user - name of the user
 * @param {String} org - name of the organisation
 * @param {Function} cb - callback
 */
DbSetupManager.prototype.assignUserToOrg = function (user, org, cb) {
  this.testEnvironment.insertIntoTable(
    'legacy.cdw.db.models::Config.UserOrgMapping',
    {
      OrgID: org,
      UserName: user
    },
    cb
  )
}

/**
 * Do a complete teardown of the test DB setup.
 *
 * @param {Function} callback - callback
 */
DbSetupManager.prototype.teardownDb = function (callback) {
  // Define async tasks to be carried out
  var that = this
  var revokeAccessRightsTask = function (cb) {
    that.log('Revoking test schema access rights')
    that.testEnvironment.revokeUserTestSchemaRights(that.technicalUserName, cb)
  }
  var tearDownTestEnvTask = function (cb) {
    that.log('Tearing down test environment')
    that.testEnvironment.envTeardown(cb)
  }
  // This will be called when all the async tasks are completed
  var stopHdbClientCallback = function (err) {
    console.log(`stopHdbClientCallback: ${err}`)

    that.stopHdbClient()
    callback(err)
  }
  // Do the actual work here
  async.series([revokeAccessRightsTask, tearDownTestEnvTask], stopHdbClientCallback)
}

/**
 * Truncate all the tables from the schema
 *
 * @param {Function} callback - callback
 */
DbSetupManager.prototype.truncateTestSchema = function (callback) {
  this.testEnvironment.truncateSchema(callback)
}

/**
 * Shut down the HDB client.
 */
DbSetupManager.prototype.stopHdbClient = function () {
  this.hdbClient.end()
}

module.exports = DbSetupManager
