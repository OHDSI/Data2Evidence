/**
 * These test define how categories and measures (e.g. axes) are handled by MRI.
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

describe('-- BASIC SPECS FOR MRI HANDLING OF CATEGORIES AND MEASURES (E.G. AXES) --', function () {
  // Set up un-initialized test environment
  var environmentPath = path.join(__dirname, '.envir')
  var configName = 'test'
  var configSetupManager = new ConfigSetupManager(environmentPath, configName)
  var hostConfig = new HostConfig(environmentPath)

  // Define current logging behavior
  var logToConsole = utils.getLogger(hostConfig.log, 'In category_and_measure_test: ')

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
      .patient()
      .attribute('lastName', 'No1')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .attribute('num_attr', 1)
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'yes')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No2')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .attribute('num_attr', 2)
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'yes')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No3')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'B')
      .attribute('num_attr', 3)
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'yes')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No4')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'A')
      .attribute('num_attr', 4)
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'no')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No5')
      .interaction('patient_interaction_1')
      .attribute('char_attr', 'C')
      .attribute('num_attr', 8)
      .condition('condition_a')
      .interaction('cond_a_interaction_1')
      .attribute('char_attr', 'no')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No6')
      .interaction('patient_interaction_2')
      .attribute('char_attr', 'V')
      .interaction('patient_interaction_2')
      .attribute('char_attr', 'W')
      .add()
    patientBuilder
      .patient()
      .attribute('lastName', 'No7')
      .attribute('multiple_birth_order', '2')
      .interaction('patient_interaction_2')
      .attribute('char_attr', 'X')
      .attribute('num_attr', 2)
      .interaction('patient_interaction_2')
      .attribute('char_attr', 'X')
      .attribute('num_attr', 4)
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

  describe('Categories:', function () {
    it('If multiple categories are given, the order of the categories in the result matches the order in the request', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('patient_interaction_1', 'int2')
        .filtercard('cond_a_interaction_1', 'int1')
        .chart()
        .xaxis('int1', 'char_attr', 1)
        .xaxis('int2', 'char_attr', 2)
        .xaxis('basicdata', 'lastName', 3)
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var resultParser1 = mriResultParser.createMriResultParser(response, body)
        var resultParser2 = resultParser1.selectCategory('yes')
        var resultParser3 = resultParser2.selectCategory('B')
        expect(resultParser1.getCategoryValues().sort()).to.eql(['no', 'yes'])
        expect(resultParser2.getCategoryValues().sort()).to.eql(['A', 'B'])
        expect(resultParser3.getCategoryValues().sort()).to.eql(['No2', 'No3'])
        done()
      })
    })

    describe('The set of returned patients is unaffected by', function () {
      it('making an unconstrained attribute from a filtercard a category (e.g. putting it on the x-axis)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .filtercard('cond_a_interaction_1', 'int1')
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          requestBuilder
            .request()
            .basicdata()
            .basicdata()
            .filtercard('cond_a_interaction_1', 'int1')
            .chart()
            .xaxis('basicdata', 'lastName', 1)
            .xaxis('int1', 'char_attr', 2)
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
            var resultParser1 = mriResultParser.createMriResultParser(response, body)
            var result1 = resultParser1.getCategoryValues().sort()
            var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
            var result2 = resultParser2.getCategoryValues().sort()
            expect(result1).to.eql(result2)
            done()
          })
        })
      })

      it('making a constrained attribute from a filtercard a category (e.g. putting it on the x-axis)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .filtercard('cond_a_interaction_1', 'int1')
          .attribute('char_attr', {
            op: '=',
            value: 'yes'
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          requestBuilder
            .request()
            .basicdata()
            .basicdata()
            .filtercard('cond_a_interaction_1', 'int1')
            .attribute('char_attr', {
              op: '=',
              value: 'yes'
            })
            .chart()
            .xaxis('basicdata', 'lastName', 1)
            .xaxis('int1', 'char_attr', 2)
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
            var resultParser1 = mriResultParser.createMriResultParser(response, body)
            var result1 = resultParser1.getCategoryValues().sort()
            var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
            var result2 = resultParser2.getCategoryValues().sort()
            expect(result1).to.eql(result2)
            done()
          })
        })
      })
    })

    describe('Binning behavior:', function () {
      describe('With no default bin size and no bin size specified,', function () {
        it('all distinct category values should be returned', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1', 'int1')
            .chart()
            .xaxis('int1', 'num_attr')
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues().sort()).to.eql([
              '1.0000000000',
              '2.0000000000',
              '3.0000000000',
              '4.0000000000',
              '8.0000000000'
            ])
            done()
          })
        })
      })

      describe('With a bin size specified,', function () {
        it('missing (empty) bars should be filled in to have a continuous x-axis', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1', 'int1')
            .chart()
            .xaxis('int1', 'num_attr', 1, 2)
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryValues()).to.eql(['0e+0', '2e+0', '4e+0', '8e+0'])
            done()
          })
        })

        it('the resulting x-values should be grouped together according to the binsize', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1', 'int1')
            .chart()
            .xaxis('int1', 'num_attr', 1, 2)
            .yaxis('basicdata', 'pcount')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)

            expect(resultParser.getCategoryMeasurePairs()).to.eql([
              ['0e+0', [1]],
              ['2e+0', [2]],
              ['4e+0', [1]],
              ['8e+0', [1]]
            ])
            done()
          })
        })
      })
    })
  })

  describe('Measures:', function () {
    it('Making an unconstrained attribute from a filtercard a measure (e.g. putting it on the y-axis) does not affect the set of patients returned', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('cond_a_interaction_1', 'int1')
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        requestBuilder
          .request()
          .basicdata()
          .filtercard('cond_a_interaction_1', 'int1')
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('int1', 'num_attr')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
          var resultParser1 = mriResultParser.createMriResultParser(response, body)
          var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
          expect(resultParser1.getCategoryValues().sort()).to.eql(resultParser2.getCategoryValues().sort())
          done()
        })
      })
    })

    it('Making a constrained attribute from a filtercard a measure (e.g. putting it on the y-axis) does not affect the set of patients returned', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('patient_interaction_1')
        .attribute('num_attr', {
          op: '>',
          value: 3
        })
        .chart()
        .xaxis('basicdata', 'lastName')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        requestBuilder
          .request()
          .basicdata()
          .filtercard('patient_interaction_1', 'card1')
          .attribute('num_attr', {
            op: '>',
            value: 3
          })
          .chart()
          .xaxis('basicdata', 'lastName')
          .yaxis('card1', 'num_attr')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err2, response2, body2) {
          var resultParser1 = mriResultParser.createMriResultParser(response, body)
          var resultParser2 = mriResultParser.createMriResultParser(response2, body2)
          expect(resultParser1.getCategoryValues().sort()).to.eql(resultParser2.getCategoryValues().sort())
          done()
        })
      })
    })

    describe('Aggregation behavior:', function () {
      xit('If the measure is an attribute that is not pre-aggregated, the corresponding measure value returned is the *average* of that quantity for the corresponding category values', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .filtercard('patient_interaction_1', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('int1', 'num_attr')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([
            ['A', [2.5]],
            ['B', [2.5]],
            ['C', [8]]
          ])
          done()
        })
      })

      describe('The aggregation of the measure is done *after* the filter has been applied (only the filtered cohort is aggregated over)', function () {
        xit('when the measure attribute is NOT constrained', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1', 'int1')
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {
              op: '=',
              value: 'yes'
            })
            .chart()
            .xaxis('int1', 'char_attr')
            .yaxis('int1', 'num_attr')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryMeasurePairs()).to.eql([
              ['A', [1.0]],
              ['B', [2.5]]
            ])
            done()
          })
        })

        xit('when the measure attribute is constrained', function (done) {
          var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
          requestBuilder
            .request()
            .basicdata()
            .filtercard('patient_interaction_1', 'int1')
            .attribute('num_attr', {
              op: '>=',
              value: 3
            })
            .chart()
            .xaxis('int1', 'char_attr')
            .yaxis('int1', 'num_attr')
          requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
            var resultParser = mriResultParser.createMriResultParser(response, body)
            expect(resultParser.getCategoryMeasurePairs()).to.eql([
              ['A', [4.0]],
              ['B', [3.0]],
              ['C', [8.0]]
            ])
            done()
          })
        })
      })

      it('IF a single patient has multiple interactions that match a specific filtercard and an atttribute from that card is a category, THEN that patient contributes to the measures for all the category values that match (Example: If a patient has two chemotherapies, one with protocol FOLFOX and one with protocol COPP, and we put chemotherapy protocol on the x-axis, then this patient will contribute both to the bar for "FOLFOX" and to the bar "COPP")', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No6'
          })
          .filtercard('patient_interaction_2', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(
            resultParser.getCategoryMeasurePairs().sort(function (a, b) {
              return a[0].localeCompare(b[0])
            })
          ).to.eql([
            ['V', [1.0]],
            ['W', [1.0]]
          ])
          done()
        })
      })

      xit('IF a single patient has (1) multiple instances of a given interaction with the same value for some attribute and (2) that attribute is a category and (3) a numerical attribute from this interaction is set as measure, THEN all interaction instances with a given category value contribute to the measure value (Example: If a patient has two radiotherapies, both with the same OPS code but one with dosage 20 Gy and one with 40 Gy, and we put radiotherapy OPS code on the x-axis and (average) radiotherapy dosage on the y-axis, then both the value 20 Gy and the value 40 Gy is included in the average)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No7'
          })
          .filtercard('patient_interaction_2', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('int1', 'num_attr')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['X', [3.0]]])
          done()
        })
      })

      it('[WARNING! NON-INTENDED BEHAVIOR] IF a single patient has (1) multiple instances of a given interaction with the same values for ALL (used) attributes and (2) one of these attribute is a category and (3) a numerical attribute from this interaction is set as measure, THEN these interactions only contribute ONCE IN TOTAL to the measure value (Example: If a patient has two radiotherapies, both with the same OPS code and dosage 40 Gy, and we put radiotherapy OPS code on the x-axis and the sum of radiotherapy dosages on the y-axis, this patient will only contribute with 40 Gy to this sum)', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No7'
          })
          .filtercard('patient_interaction_2', 'card1')
          .chart()
          .xaxis('card1', 'char_attr')
          .yaxis('basicdata', 'multiple_birth_order', 1, 'count')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['X', [1.0]]])
          done()
        })
      })

      it('IF a single patient has (1) multiple instances of a given interaction with the same value for some attribute and (2) that attribute is a category, THEN the patient still only contributes once to (distinct) patient count for the corresponding category value (Example: If a patient has two chemotherapies, both with with protocol FOLFOX, and we put chemotherapy protocol on the x-axis, then this patient will only be counted in the bar for "FOLFOX")', function (done) {
        var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
        requestBuilder
          .request()
          .basicdata()
          .attribute('lastName', {
            op: '=',
            value: 'No7'
          })
          .filtercard('patient_interaction_2', 'int1')
          .chart()
          .xaxis('int1', 'char_attr')
          .yaxis('basicdata', 'pcount')
        requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
          var resultParser = mriResultParser.createMriResultParser(response, body)
          expect(resultParser.getCategoryMeasurePairs()).to.eql([['X', [1.0]]])
          done()
        })
      })
    })
  })
})
