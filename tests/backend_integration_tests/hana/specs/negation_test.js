/**
 * These test define the basic semantics for the exclude option of MRI filter cards.
 *
 * Note that because excluded filtercard are used to specify the
 * *absence* of certain events ("non-interactions") and the question of whether
 * two such "non-intetraction" are identical does not make any sense, we cannot
 * dirrectly apply the "different filtercards = different interactions" principle
 * to cases where we have multiple excluded filtercards of the same type,
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

describe('-- BASIC SPECS FOR MRI EXCLUDED CARD LOGIC --', function () {
  // Set up un-initialized test environment
  this.timeout(600000)
  var environmentPath = path.join(__dirname, '.envir')
  var configName = 'test'
  var configSetupManager = new ConfigSetupManager(environmentPath, configName)
  var hostConfig = new HostConfig(environmentPath)

  // Define current logging behavior
  var logToConsole = utils.getLogger(hostConfig.log, 'In negation_test: ')

  // Parameters and functions needed for tests
  var aliceHanaRequest = new HanaRequest(hostConfig.getTestUserLogin())
  var PATH = utils.PATHS.population
  var MRI_CUR_CONFIG = configSetupManager.getMriConfiguration()
  var MRI_CONFIG_METADATA = configSetupManager.getMriConfigurationMetadata()

  var hdbClient = null
  var params = null

  before(function (done) {
    var patientBuilder = new PatientBuilder()
    patientBuilder
      .patient() // No interactions
      .attribute('lastName', 'No1')
      .add()
    patientBuilder
      .patient() // A
      .attribute('lastName', 'No2')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .add()
    patientBuilder
      .patient() // B
      .attribute('lastName', 'No3')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .add()
    patientBuilder
      .patient() // A, B
      .attribute('lastName', 'No4')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .add()
    patientBuilder
      .patient() // A, A
      .attribute('lastName', 'No5')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .add()
    patientBuilder
      .patient() // B, B
      .attribute('lastName', 'No6')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .add()
    patientBuilder
      .patient() // A, A, B
      .attribute('lastName', 'No7')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .add()
    patientBuilder
      .patient() // A, B, B
      .attribute('lastName', 'No8')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'A')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'B')
      .add()
    patientBuilder
      .patient() // C
      .attribute('lastName', 'No9')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'C')
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'C')
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

  describe('A single, excluded filtercard', function () {
    describe('for a given patient interaction', function () {
      describe('without any attribute constraints,', function () {
        it('matches only patient histories without any instances of the corresponding interaction', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with an attribute constraint,', function () {
        it('matches all patient who either (1) do not have any interaction instances of this type, OR (2) only have instances that do NOT match the specified constraint', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues().sort()).to.eql(['No1', 'No3', 'No6', 'No9'])
            done()
          })
        })
      })
    })

    describe('for a given condition interaction', function () {
      describe('without any attribute constraints,', function () {
        it('matches only patient histories without any instances of the corresponding interaction', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with attribute constraints,', function () {
        it('matches all patient who either (1) do not have any interaction instances of this type, or (2) only have instances that do NOT match the specified cosntraints', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues().sort()).to.eql(['No1', 'No3', 'No6', 'No9'])
            done()
          })
        })
      })
    })
  })

  describe('Given two filtercards of the SAME type', function () {
    describe('for a given patient interaction', function () {
      describe('without any attribute constraints,', function () {
        it('excluding ONE of these cards results in zero matches (the two filtercards form a contradiction-in-terms)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .filtercard('patient_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH cards matches patient histories that do not contain any interaction of the specified type (the second filtercard is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .filtercard('patient_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with an attribute constraint on ONE of the cards,', function () {
        it('excluding the card WITH the attribute constraints matches patient histories that (1) contain at least one interaction of the relevant type and (2) do not contains interactions that match the constraint in the excluded card', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No3', 'No6', 'No9'])
            done()
          })
        })

        it('excluding the card WITHOUT the attribute constraints return zero matches (the cards form a contradiction-in-terms because the non-excluded card only has a match if the (more specific) excluded card also does)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH of those cards matches patient histories that do not contain any interaction of the given type (the filter imposed by the (more specific) excluded card with the attribute constraint is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with IDENTICAL attribute constraints on BOTH cards,', function () {
        it('excluding ONE of those cards gives back zero matches (the two filtercards form a contradiction-in-terms)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH cards matches patient histories that do not contain any interacctions matching the constraint on one of the cards (the filter imposed by the second card is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1', 'No3', 'No6', 'No9'])
            done()
          })
        })
      })

      describe('with DISTINCT attribute constraints on the two cards,', function () {
        it('excluding ONE of those cards matches patient histories that (1) have an interaction matching the non-excluded filtercard and (2) no interactions matching the excluded filtercard', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'B'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No2', 'No5'])
            done()
          })
        })

        it('excluding BOTH of those cards matches patient histories that do not have any interactions matching either (or both) of the cards', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('patient_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'B'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1', 'No9'])
            done()
          })
        })
      })
    })

    describe('for a given condition interaction', function () {
      describe('without any attribute constraints,', function () {
        it('excluding ONE of these cards results in zero matches (the two filtercards form a contradiction-in-terms)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .filtercard('cond_a_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH cards matches patient histories that do not contain any interaction of the specified type (the second filtercard is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with an attribute constraint on ONE of the cards,', function () {
        it('excluding the card WITH the attribute constraints matches patient histories that (1) contain at least one interaction of the relevant type AND (2) do not contains interactions that match the constraint in the excluded card', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No3', 'No6', 'No9'])
            done()
          })
        })

        it('excluding the card WITHOUT the attribute constraints return zero matches (the cards form a contradiction-in-terms because the non-excluded card only has a match if the (more specific) excluded card also does)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH of those cards matches patient histories that do not contain any interaction of the given type (the filter imposed by the (more specific) excluded card with the attribute constraint is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1'])
            done()
          })
        })
      })

      describe('with IDENTICAL attribute constraints on BOTH cards,', function () {
        it('excluding ONE of those cards gives back zero matches (the two filtercards form a contradiction-in-terms)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createNonValidatedMriResultParser(response, body)
            expect(resultParser.hasNoMatchingPatients(), 'There should not be any matching patients').to.be.true
            done()
          })
        })

        it('excluding BOTH cards matches patient histories that do not contain any interacctions matching the constraint on one of the cards (the filter imposed by the second card is redundant)', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1', 'No3', 'No6', 'No9'])
            done()
          })
        })
      })

      describe('with DISTINCT attribute constraints on the two cards,', function () {
        it('excluding ONE of those cards matches patient histories that (1) have an interaction matching the non-excluded filtercard and (2) no interactions matching the excluded filtercard', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'B'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No2', 'No5'])
            done()
          })
        })

        it('excluding BOTH of those cards matches patient histories that do not have any interactions matching either (or both) of the cards', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'A'
            })
            .filtercard('cond_a_interaction_1')
            .exclude()
            .attribute('char_attr', {
              op: '=',
              value: 'B'
            })
            .chart()
            .xaxis('basicdata', 'lastName')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['No1', 'No9'])
            done()
          })
        })
      })
    })
  })
})
