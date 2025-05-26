/* eslint-env node */
/* global __dirname */
/* eslint-disable no-unused-expressions */

'use strict'

// Internal modules
var HanaRequest = require('../lib/hana_request')
var ConfigSetupManager = require('../lib/config_setup_manager')
var HostConfig = require('../lib/host_config')
var PatientBuilder = require('../lib/patient_builder')
var RequestBuilder = require('../lib/request_builder')
var utils = require('../lib//utils')
var specUtils = require('./spec_utils')
var request2IFR = require('../lib/Request2IFR').request2IFR

// Standard modules
var path = require('path')
var hdb = require('hdb')
var querystring = require('querystring')
var defaultBarChartParameters = {
  dataFormat: 'json',
  chartType: 'barchart',
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}
var defaultPatientListParameters = {
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}
var defaultPCountParameters = {
  dataFormat: 'json',
  chartType: 'patientcount',
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}
var defaultBookmarkParameters = {
  httpMethod: 'GET'
}
var defaultValuesParameters = {
  urlEncodingRequired: 'false',
  httpMethod: 'GET'
}

describe('-- MRI ENDPOINT SMOKE TESTS --', function () {
  // Set up un-initialized test environment
  var environmentPath = path.join(__dirname, '.envir')
  var configName = 'test'
  var configSetupManager = new ConfigSetupManager(environmentPath, configName)
  var hostConfig = new HostConfig(environmentPath)

  // Parameters and functions needed for tests
  var aliceHanaRequest = new HanaRequest(hostConfig.getTestUserLogin())
  var POPULATION_PATH = utils.PATHS.population
  var BOOKMARK_PATH = utils.PATHS.bookmark
  var VALUES_PATH = utils.PATHS.values
  const PATIENT_PATH = utils.PATHS.patient
  var ANALYTICS_PATH = utils.PATHS.analytics

  var MRI_CUR_CONFIG = configSetupManager.getMriConfiguration()
  var MRI_CONFIG_METADATA = configSetupManager.getMriConfigurationMetadata()

  // Define current logging behavior
  var logToConsole = utils.getLogger(hostConfig.log, 'In endpoint_smoke_test: ')

  var hdbClient = null
  var params = null

  before(function (done) {
    var patientBuilder = new PatientBuilder()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No1')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .attribute('num_attr', 1)
      .attribute('freetext_attr', 'Some long text')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 2)
      .attribute('lastName', 'No2')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .attribute('num_attr', 2)
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('dateOfDeath', '2014-01-02T00:00:00.000Z')
      .attribute('multiple_birth_order', 3)
      .attribute('lastName', 'No3')
      .condition('condition_a')
      .interaction('cond_a_interaction_1', '2012-01-01')
      .attribute('char_attr', 'C')
      .attribute('num_attr', 3)
      .attribute('freetext_attr', 'Some other long text')
      .add()
    var MIN_COHORT_SIZE = 0
    hdbClient = hdb.createClient(hostConfig.getHdbSystemCredentials())
    params = {
      patientBuilder: patientBuilder,
      hostConfig: hostConfig,
      configName: configName,
      minCohortSize: MIN_COHORT_SIZE,
      logger: logToConsole,
      configSetupManager: configSetupManager,
      hdbClient: hdbClient
    }
    specUtils.setupFullSystem(params, done)
  })

  after(function (done) {
    specUtils.teardownFullSystem(params, done)
  })

  describe('Calling REST endpoints of ', function () {
    describe('barchart', function () {
      it('returns a valid response', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder.request().chart().xaxis('basicdata', 'lastName').yaxis('basicdata', 'multiple_birth_order')
        requestBuilder.submit(aliceHanaRequest, POPULATION_PATH, defaultBarChartParameters, function (err, response) {
          specUtils.assertIsValidResponse(err, response.statusCode)
          done()
        })
      })
    })

    describe('totalpcount', function () {
      it('returns a valid response', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .filtercard('cond_a_interaction_1', 'i1')
          .attribute('char_attr', {
            op: '=',
            value: 'B'
          })
          .chart()
          .xaxis('i1', 'char_attr')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, POPULATION_PATH, defaultPCountParameters, function (err, response) {
          specUtils.assertIsValidResponse(err, response.statusCode)
          done()
        })
      })
    })

    describe('patient list', function () {
      it('returns a valid response', function (done) {
        // TODO: This should also be handled by the request builder
        var requestBody = {
          cohortDefinition: {
            cards: {
              content: [
                {
                  content: [
                    {
                      configPath: 'patient',
                      instanceNumber: 0,
                      instanceID: 'patient',
                      name: 'Basic Data',
                      inactive: false,
                      type: 'FilterCard',
                      attributes: {
                        content: [],
                        type: 'BooleanContainer',
                        op: 'AND'
                      },
                      advanceTimeFilter: null
                    }
                  ],
                  type: 'BooleanContainer',
                  op: 'OR'
                }
              ],
              type: 'BooleanContainer',
              op: 'AND'
            },
            configData: {
              configId: '4321DCBAB',
              configVersion: 'A'
            },
            axes: [],
            guarded: true,
            limit: 20,
            offset: 0,
            columns: [
              {
                configPath: 'patient.attributes.dateOfBirth',
                order: '',
                seq: 1
              }
            ]
          },
          datasetId: 'cd13fd3e-9f35-4812-b2a1-497b232a8771'
        }
        var setQuery = {
          method: 'GET',
          path: PATIENT_PATH,
          body: JSON.stringify(requestBody),
          parameters: { ...defaultPatientListParameters, datasetId: 'cd13fd3e-9f35-4812-b2a1-497b232a8771' },
          headers: {
            authorization: process.env.BEARER_TOKEN
          }
        }
        aliceHanaRequest.request(setQuery, function (err, response) {
          specUtils.assertIsValidResponse(err, response.statusCode)
          done()
        })
      })
    })

    // TODO: unskip after bookmarks datastore init is ready. Awaiting artifact manager.
    describe.skip('bookmarks', function () {
      it('returns a valid response', function (done) {
        var setQuery = {
          method: defaultBookmarkParameters.httpMethod,
          path: BOOKMARK_PATH,
          parameters: { paConfigId: '4321DCBA', r: '1', username: process.env.IDP_SUB },
          body: '',
          headers: {
            authorization: process.env.BEARER_TOKEN
          }
        }
        aliceHanaRequest.request(setQuery, function (err, response, body) {
          specUtils.assertIsValidResponse(err, response.statusCode)
          done()
        })
      })
    })

    describe('domain values', function () {
      it('returns a valid response', function (done) {
        var requestBody = {
          attributePath: 'patient.attributes.lastName',
          attributeType: 'text',
          configId: '4321DCBAB',
          configVersion: 'A',
          datasetId: 'cd13fd3e-9f35-4812-b2a1-497b232a8771',
          searchQuery: 'testSearchQuery'
        }
        var setQuery = {
          method: defaultValuesParameters.httpMethod,
          path: VALUES_PATH,
          body: JSON.stringify(requestBody),
          parameters: requestBody,
          headers: {
            authorization: process.env.BEARER_TOKEN
          }
        }
        aliceHanaRequest.request(setQuery, function (err, response, body) {
          specUtils.assertIsValidResponse(err, response.statusCode)
          done()
        })
      })
    })
  })
})
