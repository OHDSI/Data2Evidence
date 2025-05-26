/* eslint-env node */
/* global __dirname */
/* eslint-disable no-unused-expressions */

'use strict'

// Internal modules
var HanaRequest = require('../lib/hana_request')
var ConfigSetupManager = require('../lib/config_setup_manager')
var PatientBuilder = require('../lib/patient_builder')
var RequestBuilder = require('../lib/request_builder')
var HostConfig = require('../lib/host_config')
var utils = require('../lib//utils')
var specUtils = require('./spec_utils')

// Standard modules
var async = require('async')
var path = require('path')
var hdb = require('hdb')
var chai = require('chai')
var expect = chai.expect
var defaultPCountParameters = {
  dataFormat: 'json',
  chartType: 'patientcount',
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}

describe('TEST SUITE TO DEFINE THE BEHAVIOR OF THE TOTALPCOUNT ENDPOINT --', function () {
  // Set up un-initialized test environment
  this.timeout(600000)
  var environmentPath = path.join(__dirname, '.envir')
  var configName = 'acme'
  var configSetupManager = new ConfigSetupManager(environmentPath, configName)
  var hostConfig = new HostConfig(environmentPath)

  // Parameters and functions needed for tests
  var aliceHanaRequest = new HanaRequest(hostConfig.getTestUserLogin())
  var PATH = utils.PATHS.population
  var MRI_CUR_CONFIG = configSetupManager.getMriConfiguration()
  var MRI_CONFIG_METADATA = configSetupManager.getMriConfigurationMetadata()

  // Define current logging behavior
  var logToConsole = utils.getLogger(hostConfig.log, 'In totalcount_test ')

  var hdbClient = null
  var params = null

  before(function (done) {
    var patientBuilder = new PatientBuilder()
    patientBuilder.patient().attribute('dateOfBirth', '1950-01-02T00:00:00').attribute('smoker', 'yes').add()
    patientBuilder.patient().attribute('dateOfBirth', '1940-01-02T00:00:00').attribute('smoker', 'no').add()
    patientBuilder.patient().attribute('smoker', 'no').add()
    patientBuilder.patient().attribute('dateOfBirth', '1950-01-01T00:00:00').add()
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

  describe('totalpcount backend', function () {
    it('should return the total number of patients matching the filters', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('smoker', {
          op: '=',
          value: 'no'
        })
        .chart()
        .xaxis('basicdata', 'smoker')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultPCountParameters, function (err, response, body) {
        expect(specUtils.getPcount(body)).to.equal(2)
        done()
      })
    })

    xit('does not apply min cohort protection for patient list', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .guarded()
        .basicdata()
        .attribute('smoker', {
          op: '=',
          value: 'yes'
        })
        .chart()
        .xaxis('basicdata', 'smoker')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultPCountParameter, function (err, response, body) {
        expect(specUtils.getPcount(body)).to.equal(1)
        done()
      })
    })
  })
})
