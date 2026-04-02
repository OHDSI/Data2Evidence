/**
 * These test define the Boolean logic when combining different filtering options in MRI.
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

describe('-- SPECS FOR MRI BOOLEAN LOGIC --', function () {
  // Set up un-initialized test environment
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
  var logToConsole = utils.getLogger(hostConfig.log, 'In boolean_logic_test: ')

  var hdbClient = null
  var params = null

  before(function (done) {
    var patientBuilder = new PatientBuilder()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No1')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'D')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .attribute('num_attr', 1)
      .attribute('freetext_attr', 'Some long text')
      .interaction('cond_a_interaction_2')
      .attribute('char_attr', 'A')
      .attribute('num_attr', 1)
      .attribute('freetext_attr', 'Some long text')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('lastName', 'No2')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .attribute('num_attr', 2)
      .interaction('cond_a_interaction_2')
      .attribute('char_attr', 'B')
      .attribute('num_attr', 2)
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 1)
      .attribute('lastName', 'No3')
      .condition('condition_a')
      .interaction('cond_a_interaction_1', '2012-01-01')
      .attribute('char_attr', 'C')
      .attribute('num_attr', 1)
      .attribute('freetext_attr', 'Some other long text')
      .interaction('cond_a_interaction_2')
      .attribute('char_attr', 'C')
      .attribute('num_attr', 1)
      .attribute('freetext_attr', 'Some other long text')
      .add()
    patientBuilder
      .patient()
      .attribute('dateOfBirth', '1960-01-01T00:00:00.000Z')
      .attribute('multiple_birth_order', 6)
      .attribute('lastName', 'No4')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'D')
      .condition('condition_a')
      .interaction('cond_a_interaction_2')
      .attribute('char_attr', 'C')
      .attribute('num_attr', 1)
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

  describe('BASIC DATA filter card: When combining', function () {
    describe('multiple constraints on the SAME ATTRIBUTE in a filter card', function () {
      it('it matches patients who satisfy ANY of the constraints (OR-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No1'
          })
          .attribute('lastName', {
            op: '=',
            value: 'No2'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([
            ['No1', [1]],
            ['No2', [1]]
          ])
          done()
        })
      })
    })

    describe('constraints on DIFFERENT ATTRIBUTES within the SAME FILTER CARD', function () {
      it('it matches patients who satisfy the constraints on ALL the constrained attributes (AND-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No1'
          })
          .attribute('multiple_birth_order', {
            op: '=',
            value: 1
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })
  })

  describe('MATCH ALL section: When combining', function () {
    describe('multiple constraints on the SAME ATTRIBUTE in a filter card', function () {
      it('it matches patients who satisfy ANY of the constraints (OR-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .attribute('char_attr', {
            op: '=',
            value: 'B'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([
            ['No1', [1]],
            ['No2', [1]]
          ])
          done()
        })
      })
    })

    describe('constraints on DIFFERENT ATTRIBUTES within the SAME FILTER CARD', function () {
      it('it matches patients who satisfy the constraints on ALL the constrained attributes (AND-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .attribute('num_attr', {
            op: '=',
            value: 1
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })

    describe('constraints on attributes on DISTINCT FILTER CARDS', function () {
      it('it matches patients who satisfy the constraints on ALL the constrained filter cards in this section (AND-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .filtercard('cond_a_interaction_2', 'x2_int')
          .attribute('num_attr', {
            op: '=',
            value: 1
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })
  })

  describe('MATCH ANY section: When combining', function () {
    describe('multiple constraints on the SAME ATTRIBUTE in a filter card', function () {
      it('it matches patients who satisfy ANY of the constraints (OR-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .matchany()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .attribute('char_attr', {
            op: '=',
            value: 'B'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([
            ['No1', [1]],
            ['No2', [1]]
          ])
          done()
        })
      })
    })

    describe('constraints on DIFFERENT ATTRIBUTES within the SAME FILTER CARD', function () {
      it('it matches patients who satisfy the constraints on ALL the constrained attributes (AND-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .matchany()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .attribute('num_attr', {
            op: '=',
            value: 1
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })

    // Matchany test case is not applicable any more
    xdescribe('constraints on attributes on DISTINCT FILTER CARDS', function () {
      it('it matches patients who satisfy the constraints on ONE OR MORE of the constrained filter cards  in this section (OR-semantics)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .matchany()
          .filtercard('patient_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'D'
          })
          .filtercard('cond_a_interaction_2')
          .attribute('num_attr', {
            op: '=',
            value: 1
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([
            ['No1', [1]],
            ['No3', [1]],
            ['No4', [1]]
          ])
          done()
        })
      })
    })
  })

  describe('Combining BASIC DATA and the MATCH ALL section: When combining', function () {
    describe('constraints on the BASIC DATA card and several cards in the MATCH ALL section', function () {
      it('it matches patients who satisfy BOTH the Basic Data card constraint AND the Match All section constraints (AND-semantics between sections)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('multiple_birth_order', {
            op: '=',
            value: 1
          })
          .matchall()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })
  })

  describe('Combining BASIC DATA and the MATCH ANY section: When combining', function () {
    describe('constraints on the BASIC DATA card and several cards in the MATCH ANY section', function () {
      it('it matches patients who satisfy BOTH the Basic Data card constraint AND the Match Any section constraints (AND-semantics between sections)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('multiple_birth_order', {
            op: '=',
            value: 1
          })
          .matchall()
          .matchany()
          .filtercard('cond_a_interaction_1')
          .attribute('char_attr', {
            op: '=',
            value: 'A'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No1', [1]]])
          done()
        })
      })
    })
  })

  // Matchany test case is not applicable any more
  xdescribe('Combining MATCH ALL and MATCH ANY sections: When combining', function () {
    describe('constraints on cards in both the MATCH ALL and the MATCH ANY section', function () {
      it('it matches patients who satisfy BOTH the Match All card constraints AND the Match Any section constraints (AND-semantics between sections)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .matchall()
          .filtercard('cond_a_interaction_1')
          .attribute('num_attr', {
            op: '=',
            value: 1
          })
          .matchany()
          .filtercard('cond_a_interaction_2')
          .attribute('char_attr', {
            op: '=',
            value: 'B'
          })
          .filtercard('cond_a_interaction_2')
          .attribute('char_attr', {
            op: '=',
            value: 'C'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['No3', [1]]])
          done()
        })
      })
    })
  })
})
