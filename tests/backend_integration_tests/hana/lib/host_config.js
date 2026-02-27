/**
 * Class for handling host configuration (i.e. which Db system to use). It is a thin wrapper on the JSON configuration, providing helper functions for retrieving particular elements and combinations.
 *
 * @module host_config
 *
 */

/* eslint-env node */
'user strict'

var fs = require('fs')
const APPROUTER_PORT = 8888
/**
 * Simple object to hold an access config
 *
 * @constructor
 * @param {String} accessConfigPath - path to the config file
 */
function HostConfig(accessConfigPath) {
  var accessConfig = JSON.parse(fs.readFileSync(accessConfigPath))
  var key
  for (key in accessConfig) {
    this[key] = accessConfig[key]
  }
}

/**
 * Get the HDB SYSTEM login data for the HDB connection
 *
 * @returns {Object} - JSON object with the login details
 */
HostConfig.prototype.getHdbSystemCredentials = function () {
  var credentials = {}
  credentials.host = this.dbhost
  credentials.port = this.dbport
  credentials.user = this.system_user
  credentials.password = this.system_password
  return credentials
}

/**
 * Get the platform (FFH) admin user HTTP login
 *
 * @returns {Object} - JSON object with the login details
 */
HostConfig.prototype.getFfhAdminUserLogin = function () {
  var login = {}
  var port = this.appport
  login.target = this.host + ':' + port
  login.user = this.chp_admin_user
  login.password = this.chp_admin_password
  return login
}

/**
 * Get the platform (FFH) admin user HTTP login
 *
 * @returns {Object} - JSON object with the login details
 */
HostConfig.prototype.getMriAdminUserLogin = function () {
  var login = {}
  var port = this.appport
  login.target = this.host + ':' + port
  login.user = this.mri_admin_user
  login.password = this.mri_admin_password
  return login
}

/**
 * Get the test user HTTP login
 *
 * @returns {Object} - JSON object with the login details
 */
HostConfig.prototype.getTestUserLogin = function () {
  var login = {}
  var port = this.sysappport
  login.target = this.host + ':' + port
  login.user = this.test_user
  login.password = this.test_password
  return login
}

/**
 * Get the name of the test schema.
 *
 * @returns {String} - test schema name
 */
HostConfig.prototype.getTestSchemaName = function () {
  return this.test_schema_name
}

/**
 * Get the name of the standard (default) platform/MRI schema.
 *
 * @returns {String} - standard schema name
 */
HostConfig.prototype.getStandardSchemaName = function () {
  return this.standard_schema_name
}

/**
 * Get the name of the CDW config file for a given configuration setup.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - name of CDW configuration file
 */
HostConfig.prototype.getCdwConfigName = function (configName) {
  return this.configurations[configName].cdw
}

/**
 * Get the ID of a given CDW config.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - ID of the configuration configuration setup
 */
HostConfig.prototype.getCdwConfigId = function (configName) {
  return this.configurations[configName].id + 'A'
}

/**
 * Get the name of the MRI config file for a given configuration setup.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - name of MRI configuration file
 */
HostConfig.prototype.getMriConfigName = function (configName) {
  return this.configurations[configName].mri
}

/**
 * Get the ID of a given MRI config.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - ID of the configuration configuration setup
 */
HostConfig.prototype.getMriConfigId = function (configName) {
  return this.configurations[configName].id + 'B'
}

/**
 * Get the name of the Patient Summary config file for a given configuration setup.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - name of Patient Summary configuration file
 */
HostConfig.prototype.getPatientSummaryConfigName = function (configName) {
  return this.configurations[configName].patient
}

/**
 * Get the ID of a given Patient Summary config.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - ID of the configuration configuration setup
 */
HostConfig.prototype.getPatientSummaryConfigId = function (configName) {
  return this.configurations[configName].id + 'C'
}

/**
 * Get the name of the CDW creation config file (needed for writing test data) for a given config set-up.
 *
 * @param {String} configName - name of the configuration setup (as stored in configuration file)
 * @returns {String} - name of CDW configuration file
 */
HostConfig.prototype.getCreationConfigName = function (configName) {
  return this.configurations[configName].creation
}

/**
 * Get the name of the integration test folder.
 *
 * @returns {String} - name of the folder holding the integration tests
 */
HostConfig.prototype.getIntegrationTestFolder = function () {
  return this.integration_test_folder
}

/**
 * Check if logging is on.
 *
 * @returns {Boolean} - true if logging is on.
 */
HostConfig.prototype.getLogStatus = function () {
  return this.log
}

/**
 * Get the DB username for the technical user.
 *
 * @returns {String} - DB user name
 */
HostConfig.prototype.getTechnicalUserName = function () {
  return this.chp_technical_user
}

module.exports = HostConfig
