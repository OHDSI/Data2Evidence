/* eslint-env node */
/* global __dirname */

/**
 * Utiilty functions specific to this specification suite.
 *
 * @module
 */

var hdb = require('hdb')
var path = require('path')
var fs = require('fs')
var async = require('async')

var assert = require('assert')
var chai = require('chai')
var expect = chai.expect

var PatientCreator = require('../lib/patient_creator')
const PATIENT_TABLES = [
  'legacy.cdw.db.models::DWEntities',
  'legacy.cdw.db.models::DWDocuments',
  'legacy.cdw.db.models::Config'
]

/**
 * Retrive to total patient count from the response body of
 * the patient count endpoint.
 *
 * @param {Object} body - HTTP response body
 * @returns {Number} - total patient count
 */
function getPcount(body) {
  return body.data[0]['patient.attributes.pcount']
}

/**
 * Truncate all tables in a schema
 *
 * @param {HdbClient} hdbClient - HBD DB client
 * @param {String} schemaName - schema inwhich to truncate
 * @param {Function} cb - callback
 */
function truncateSchema(hdbClient, schemaName, cb) {
  getAllTableNamesInSchema(hdbClient, schemaName, function (err, tableNames) {
    if (err) {
      process.nextTick(cb, err)
      return
    }
    async.each(
      tableNames,
      function (tableName, errCallback) {
        var testTable = '"' + schemaName + '"."' + tableName + '"'
        var sqlCommand = 'TRUNCATE TABLE ' + testTable
        hdbClient.exec(sqlCommand, errCallback)
      },
      function (err) {
        cb(err)
      }
    )
  })
}

/**
 * Truncate patient data tables in a schema
 *
 * @param {HdbClient} hdbClient - HBD DB client
 * @param {String} schemaName - schema inwhich to truncate
 * @param {Function} cb - callback
 */
function truncatePatientData(hdbClient, schemaName, cb) {
  getAllTableNamesInSchema(
    hdbClient,
    schemaName,
    function (err, tableNames) {
      if (err) {
        process.nextTick(cb, err)
        return
      }
      async.each(
        tableNames,
        function (tableName, errCallback) {
          var testTable = '"' + schemaName + '"."' + tableName + '"'
          var sqlCommand = 'TRUNCATE TABLE ' + testTable
          // console.log(`sqlCommand: ${sqlCommand}`);
          hdbClient.exec(sqlCommand, errCallback)
        },
        function (err) {
          cb(err)
        }
      )
    },
    PATIENT_TABLES
  )
}

/**
 * Retrieve the names of a set of tables in a schema.
 *
 * @param {HdbClient} hdbClient - HBD DB client
 * @param {String} schemaName - schema inwhich to truncate
 * @param {Function} cb - callback
 */
function getAllTableNamesInSchema(hdbClient, schemaName, cb, tablePrefixArray) {
  // get list of all tables within schema
  var sqlCommand = `SELECT TABLE_NAME FROM M_TABLES WHERE SCHEMA_NAME = '${schemaName}' AND TABLE_TYPE = 'COLUMN'`
  if (
    tablePrefixArray !== undefined &&
    typeof tablePrefixArray === 'object' &&
    tablePrefixArray.length !== undefined &&
    tablePrefixArray.length > 0
  ) {
    let subQueryArray = tablePrefixArray.map(e => {
      return `TABLE_NAME LIKE '${e}%'`
    })
    sqlCommand += ` AND (${subQueryArray.join(' OR ')})`
  }

  var collectTableNames = function (err, rows) {
    if (err) {
      return cb(err)
    }
    var tableNames = []
    rows.forEach(function (row) {
      tableNames.push(row['TABLE_NAME'])
    })
    cb(null, tableNames)
  }
  hdbClient.exec(sqlCommand, collectTableNames)
}

/**
* Set up all configuration (CDW, MRI, global parameters)
=======
* Create an organisation
*
* @param {HdbClient} hdbClient - HBD DB client
* @param {String} schemaName - schema inwhich to truncate
* @param {String} orgId - name of the organisation
* @param {Function} cb - callback
*/
function createOrg(hdbClient, schemaName, orgId, cb) {
  function createOrgItself(callback) {
    var fullTableName = '"' + schemaName + '"."legacy.cdw.db.models::Config.Org"'
    var sqlCommand =
      'INSERT INTO ' + fullTableName + ' ("ValidFrom", "OrgID") VALUES (\'1950-01-02T00:00:00.000Z\', \'' + orgId + "')"
    hdbClient.exec(sqlCommand, callback)
  }

  function createOrgAncestor(callback) {
    var fullTableName = '"' + schemaName + '"."legacy.cdw.db.models::Config.OrgAncestors"'
    var sqlCommand =
      'INSERT INTO ' +
      fullTableName +
      ' ("OrgID", "AncestorOrgID", "Distance") VALUES (\'' +
      orgId +
      "', '" +
      orgId +
      "', 0)"
    hdbClient.exec(sqlCommand, callback)
  }

  // Do the actual work here
  async.series([createOrgItself, createOrgAncestor], cb)
}

/**
 * Assign a user to an organisation
 *
 * @param {HdbClient} hdbClient - HBD DB client
 * @param {String} schemaName - schema inwhich to truncate
 * @param {String} user - name of the user
 * @param {String} orgId - name of the organisation
 * @param {Function} cb - callback
 */
function assignUserToOrg(hdbClient, schemaName, user, orgId, cb) {
  var fullTableName = '"' + schemaName + '"."legacy.cdw.db.models::Config.UserOrgMapping"'
  var sqlCommand = 'INSERT INTO ' + fullTableName + ' ("OrgID", "UserName") VALUES (\'' + orgId + "', '" + user + "')"
  hdbClient.exec(sqlCommand, cb)
}

/**
 * Write the patients added to the loadedPatientBuilder to the DB.
 * the patient count endpoint.
 *
 * @param {PatientBuilder} loadedPatientBuilder - patient builder with patients to be persisted added
 * @param {HostConfig} hostConfig - host confugration object
 * @param {Strong} configName - name of config set to use
 * @param {Function} finalCallback - callback
 */
function persistPatientSet(loadedPatientBuilder, hostConfig, configName, finalCallback) {
  var patientCreationHdbClient = hdb.createClient(hostConfig.getHdbSystemCredentials())

  patientCreationHdbClient.on('error', function (err) {
    if (hostConfig.getLogStatus()) {
      // eslint-disable-next-line no-console
      console.log('Network connection error: ', err)
    }
  })

  // Define async tasks to be carried out
  var patientCreator
  var setupPatientCreatorTask = function (callback) {
    var createConfigFilePath = path.join(__dirname, hostConfig.getCreationConfigName(configName))
    var createConfig = JSON.parse(fs.readFileSync(createConfigFilePath))
    patientCreator = new PatientCreator(hostConfig.getTestSchemaName(), patientCreationHdbClient, createConfig)
    patientCreator.init(callback)
  }

  var writeTestPatientsTask = function (callback) {
    loadedPatientBuilder.persistAll(patientCreator, callback)
  }

  // This will be called when all the async tasks are completed
  var stopHdbClient = function (err, result) {
    patientCreationHdbClient.end()
    var patientIDs
    if (!err) {
      patientIDs = result[result.length - 1]
    }
    finalCallback(err, patientIDs)
  }

  // Do the actual work here
  async.series([setupPatientCreatorTask, writeTestPatientsTask], stopHdbClient)
}

/**
 * Customer assertion for the result returned form the analytics endpoint.
 *
 * @param {Object} actualResult - result returned form endpoint (response body)
 * @param {Object} expectedData - expected data
 * @param {Number} accuracy - error tolerance for numerical values (absolute deviation)
 * @throws Error
 */
function checkAnalyticsResult(actualResult, expectedData, accuracy) {
  accuracy = accuracy || 0.1
  if (!actualResult.data) {
    throw new Error('No data returned!\nCall returned ' + actualResult.toString())
  }
  var expectedKeys = Object.keys(expectedData)
  var objLength = expectedData[expectedKeys[0]].length
  expectedKeys.forEach(function (key) {
    assert(
      expectedData[key].length === objLength,
      'Invalid expected result, the result arrays must have the same length for every key!'
    )
  })
  expect(actualResult.data.length).to.equal(objLength, 'Data set returned has the wrong no. of entries!')

  // Get all numerical measures. For numerical measures we test approximate equality.
  var numericalMeasureKeys = {}
  actualResult.measures.forEach(function (measure) {
    if (measure.type === 'num') {
      numericalMeasureKeys[measure.id] = 1
    }
  })
  var expectedDataValue
  actualResult.data.forEach(function (resDatum, idx) {
    expectedKeys.forEach(function (key) {
      expectedDataValue = expectedData[key][idx]
      if (key in numericalMeasureKeys) {
        expect(resDatum[key]).to.be.closeTo(expectedDataValue, accuracy)
      } else {
        expect(resDatum[key]).to.equal(expectedDataValue)
      }
    })
  })
}

/*
 * Helper function for asserting approximate identity of two vectors.
 */
function _approxEqualValues(v1, v2, eps) {
  eps = eps || 0.1
  expect(v1.length).to.equal(v2.length)
  for (var i = 0; i < v1.length; i++) {
    expect(v1[i]).to.be.closeTo(v2[i], eps)
  }
}

/**
 * Custom assert which checks that an HTTP response is valid
 * (no error and status code = 2XX).
 *
 * @param {Object} err - error object returned by HTTP call
 * @param {Object} statusCode - reponse status code
 * @throws Error
 */
function assertIsValidResponse(err, statusCode) {
  expect(err, 'The HTTP call should not return an error').to.not.exist
  expect(statusCode, 'Status code should be of the form "2XX"').to.match(/2\d{2}/)
}

/**
 * Custom assert for box-plot test.
 *
 * @param {Object} data - returned data (data field of the response body)
 * @param {Object} expectedData - expected data
 * @throws Error
 */
function approxEqualData(data, expectedData) {
  expect(data.length).to.equal(expectedData.length)
  data.forEach(function (datum, i) {
    var x = datum
    var y = expectedData[i]

    expect(Object.keys(x)).to.eql(Object.keys(y))
    Object.keys(x).forEach(function (key) {
      if (key !== 'values') {
        expect(x[key]).to.eql(y[key])
      } else {
        _approxEqualValues(x[key], y[key])
      }
    })
  })
}

/**
 * Reset the active MRI configuraton to the default one used in the tests.
 *
 * @param {Object} params - parameter object, which must contain the following
 * {
 *     configSetupManager: a ConfigSetupManager
 * };
 * @param {Function} callback - callback
 */

function resetMriConfigurationToDefault(params, callback) {
  params.configSetupManager.adaptMriConfiguration({}, callback)
}

/**
 * Update the active MRI config by overwriting parts of it (or adding
 * not defined in the default).
 *
 * @param {Object} params - parameter object, which must contain the following
 * {
 *     configSetupManager: a ConfigSetupManager
 *     mriConfigFragment: fragment (sub-object) of an MRI config,
 * };
 * @param {Function} callback - callback
 */
function adaptMriConfiguration(params, callback) {
  params.configSetupManager.adaptMriConfiguration(params.mriConfigFragment, callback)
}

/**
 * Full set-up - this is what wil ltypically be called from the test files themselves.
 *
 * If no patients are to be persisted, let the patientBuilder field be undefined or null
 *
 * @param {Object} params - parameter object, with the following structure:
 * {
 *     patientBuilder: PatientBuilder, [OPTIONAL]
 *     hostConfig: HostConfig,
 *     configName: configName,
 *     minCohortSize: MIN_COHORT_SIZE,
 *     logger: logToConsole,
 *     configSetupManager: XonfigSetupManager,
 *     hdbClient: HdbClient
 * };
 * @param {Function} callback - callback
 */
function setupFullSystem(params, callback) {
  var connectClientTask = function (cb) {
    params.logger('Opening DB connection')
    params.hdbClient.connect(cb)
  }

  var truncateDbTask = function (cb) {
    params.logger('Truncating test patient data')
    truncateSchema(params.hdbClient, params.hostConfig.getTestSchemaName(), cb)
  }

  var buildPatientsTask = function (cb) {
    if (params.patientBuilder === null || typeof params.patientBuilder === 'undefined') {
      params.logger('No patients to create')
      process.nextTick(cb, null)
    } else {
      params.logger('Creating test patient data')
      persistPatientSet(params.patientBuilder, params.hostConfig, params.configName, cb)
    }
  }

  var setupConfigurationTask = function (cb) {
    params.logger('Setting up configurations')
    params.configSetupManager.setupConfiguration(params.hostConfig.getTestSchemaName(), params.minCohortSize, cb)
  }

  // Do the actual work here
  async.series([connectClientTask, truncateDbTask, buildPatientsTask, setupConfigurationTask], callback)
}

function teardownFullSystem(params, callback) {
  var truncateSchemaTask = function (cb) {
    params.logger('Truncating test patient data')
    truncateSchema(params.hdbClient, params.hostConfig.getTestSchemaName(), function (err) {
      params.hdbClient.end()
      cb(err)
    })
  }

  var teardownConfigurationTask = function (cb) {
    params.logger('Tearing down configuration')
    params.configSetupManager.teardownConfiguration(cb)
  }

  async.series([truncateSchemaTask, teardownConfigurationTask], callback)
}

module.exports.truncateSchema = truncateSchema
module.exports.truncatePatientData = truncatePatientData
module.exports.persistPatientSet = persistPatientSet
module.exports.checkAnalyticsResult = checkAnalyticsResult
module.exports.getPcount = getPcount
module.exports.approxEqualData = approxEqualData
module.exports.assertIsValidResponse = assertIsValidResponse
module.exports.createOrg = createOrg
module.exports.assignUserToOrg = assignUserToOrg
module.exports.setupFullSystem = setupFullSystem
module.exports.teardownFullSystem = teardownFullSystem
module.exports.adaptMriConfiguration = adaptMriConfiguration
module.exports.resetMriConfigurationToDefault = resetMriConfigurationToDefault
