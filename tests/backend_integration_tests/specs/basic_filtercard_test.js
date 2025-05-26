/**
 * These test define the basic semantics for MRI filter cards.
 */
/* eslint-disable no-unused-expressions */

'use strict'

// Internal modules
var HanaRequest = require('../lib/hana_request')
var ConfigSetupManager = require('../lib/config_setup_manager')
var HostConfig = require('../lib/host_config')
var PatientBuilder = require('../lib/patient_builder')
var RequestBuilder = require('../lib/request_builder')
var mriResultParser = require('../lib/mri_result_parser')
var utils = require('../lib//utils')
var specUtils = require('./spec_utils')

// Standard modules
var path = require('path')
var hdb = require('hdb')
var chai = require('chai')
var expect = chai.expect
var defaultBarChartParameters = {
  dataFormat: 'json',
  chartType: 'barchart',
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}

describe('-- BASIC SPECS FOR MRI FILTER CARD LOGIC --', function () {
  // Set up un-initialized test environment
  this.timeout(600000)
  var environmentPath = path.join(__dirname, '.envir')
  var configName = 'test'
  var configSetupManager = new ConfigSetupManager(environmentPath, configName)
  var hostConfig = new HostConfig(environmentPath)

  // Parameters and functions needed for tests
  var aliceHanaRequest = new HanaRequest(hostConfig.getTestUserLogin())
  var PATH = utils.PATHS.population
  var MRI_CUR_CONFIG = configSetupManager.getMriConfiguration()
  var MRI_CONFIG_METADATA = configSetupManager.getMriConfigurationMetadata()

  // Define current logging behavior
  var logToConsole = utils.getLogger(hostConfig.log, 'In basic_filtercard_test: ')

  var hdbClient = null
  var params = null

  before(function (done) {
    var patientBuilder = new PatientBuilder()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No1')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 2)
      .attribute('lastName', 'No2')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'C')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No3')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'C')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'D')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No4')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'X')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'C')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'D')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'Y')
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

  describe('The Basic Data filtercard', function () {
    it('does not filter out any patients when it is empty', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder.request().basicdata().chart().xaxis('basicdata', 'lastName').yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No1', [1]],
          ['No2', [1]],
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })
  })

  describe('For patient interactions,', function () {
    it('a single, empty filter card matches patients with at least one instance of the corresponding interaction', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('patient_interaction_1')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No2', [1]],
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })

    it('multiple filtercards of the same type must match distinct instances of the corresponding interaction', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('patient_interaction_1')
        .filtercard('patient_interaction_1')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })

    it('the order of filtercards of the same type is irrelevant', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('patient_interaction_1', 'int1')
        .filtercard('patient_interaction_1')
        .attribute('char_attr', {
          op: '=',
          value: 'A'
        })
        .chart()
        .xaxis('int1', 'char_attr')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser1 = mriResultParser.createMriResultParser(response, body)
        requestBuilder
          .request()
          .basicdata()
          .filtercard('patient_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .filtercard('patient_interaction_1', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
          var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
          expect(resultParser2.getCategoryMeasurePairs()).to.eql(resultParser1.getCategoryMeasurePairs())
          done()
        })
      })
    })
  })

  describe('For condition interactions,', function () {
    it('a single, empty filter card matches patients with at least one instance of the corresponding interaction', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('cond_a_interaction_1')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No2', [1]],
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })

    it('multiple filtercards of the same type must match distinct instances of the corresponding interaction', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('cond_a_interaction_1')
        .filtercard('cond_a_interaction_1')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })

    it('multiple filtercards of the same type must match distinct instances of the corresponding interaction', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('cond_a_interaction_1', 'int1')
        .filtercard('cond_a_interaction_1', 'int2')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser = mriResultParser.createMriResultParser(response, body)
        expect(resultParser.getCategoryMeasurePairs()).to.eql([
          ['No3', [1]],
          ['No4', [1]]
        ])
        done()
      })
    })

    it('the order of filtercards of the same type is irrelevant', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('cond_a_interaction_1', 'int1')
        .filtercard('cond_a_interaction_1')
        .attribute('char_attr', {
          op: '=',
          value: 'C'
        })
        .chart()
        .xaxis('int1', 'char_attr')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser1 = mriResultParser.createMriResultParser(response, body)
        requestBuilder
          .request()
          .basicdata()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'C'
          })
          .filtercard('cond_a_interaction_1', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
          var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
          expect(resultParser2.getCategoryMeasurePairs()).to.eql(resultParser1.getCategoryMeasurePairs())
          done()
        })
      })
    })
  })
})
