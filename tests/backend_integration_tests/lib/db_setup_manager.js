/**
 * Setup functionality for the DB.
 *
 * @module db_setup_manager
 *
 */
/* eslint-env node */
/* global __dirname */
'use strict'
var pgConnLib = require('./pg-connection-lib.js')
const { PGConn } = pgConnLib
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
  this.pgConn = PGConn.createPGConn(oHostConfig.getPGSystemCredentials())
  this.log = utils.getLogger(oHostConfig.getLogStatus(), 'In db_setup_manager: ')
  this.testEnvironment = new TestEnvironment(this.pgConn, oHostConfig.getTestSchemaName(), false)
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
 */
DbSetupManager.prototype.clearTestSchema = async () => {
  await this.testEnvironment.clearSchema()
}

/**
 * Set up the internal test environment.
 *
 * @param {String} testSchemaName - name of test schema
 */
DbSetupManager.prototype.setUpTestEnvironment = async () => {
  await this.testEnvironment.envSetup()
}

/**
* Set up all configuration (CDW, MRI, global parameters)
=======
* Create an organisation
*
* @param {String} org - name of the organisation
*/
DbSetupManager.prototype.createOrg = async org => {
  await this.testEnvironment.insertIntoTable('legacy.cdw.db.models::Config.Org', {
    OrgID: org,
    ValidFrom: '1950-01-02T00:00:00.000Z'
  })
  await this.testEnvironment.insertIntoTable('legacy.cdw.db.models::Config.OrgAncestors', {
    OrgID: org,
    AncestorOrgID: org,
    Distance: 0
  })
}

/**
 * Assign a user to an organisation
 *
 * @param {String} user - name of the user
 * @param {String} org - name of the organisation
 */
DbSetupManager.prototype.assignUserToOrg = async (user, org) => {
  await this.testEnvironment.insertIntoTable('legacy.cdw.db.models::Config.UserOrgMapping', {
    OrgID: org,
    UserName: user
  })
}

/**
 * Do a complete teardown of the test DB setup.
 *
 */
DbSetupManager.prototype.teardownDb = async () => {
  // Define async tasks to be carried out
  this.log('Revoking test schema access rights')
  await this.testEnvironment.revokeUserTestSchemaRights(that.technicalUserName)

  this.log('Tearing down test environment')
  await this.testEnvironment.envTeardown()

  // This will be called when all the async tasks are completed

  await this.releasePGClient()
}

/**
 * Truncate all the tables from the schema
 */
DbSetupManager.prototype.truncateTestSchema = async () => {
  await this.testEnvironment.truncateSchema()
}

/**
 * Release the PG client to the coonection pool.
 */
DbSetupManager.prototype.releasePGClient = async () => {
  await this.pgConn.releaseClient()
}

module.exports = DbSetupManager
