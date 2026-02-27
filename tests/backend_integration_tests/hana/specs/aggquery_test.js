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
var path = require('path')
var hdb = require('hdb')
var defaultBarChartParameters = {
  dataFormat: 'json',
  chartType: 'barchart',
  urlEncodingRequired: 'true',
  httpMethod: 'GET'
}

describe('TEST SUITE TO DEFINE THE BEHAVIOR OF THE AGGREGATION QUERY ENDPOINT --', function () {
  this.timeout(600000)
  // Set up un-initialized test environment
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
  var logToConsole = utils.getLogger(hostConfig.log, 'In aggquery_test: ')

  var hdbClient = null
  var params = null

  before(function (done) {
    hdbClient = hdb.createClient(hostConfig.getHdbSystemCredentials())
    var MIN_COHORT_SIZE = 0
    params = {
      hostConfig: hostConfig,
      configName: configName,
      minCohortSize: MIN_COHORT_SIZE,
      logger: logToConsole,
      configSetupManager: configSetupManager,
      hdbClient: hdbClient,
      patientBuilder: null
    }
    specUtils.setupFullSystem(params, done)
  })

  after(function (done) {
    specUtils.teardownFullSystem(params, done)
  })

  describe('Minimum cohort size censoring', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder.patient().attribute('dateOfBirth', '1950-01-02T00:00:00.000Z').attribute('smoker', 'yes').add()
      patientBuilder.patient().attribute('dateOfBirth', '1940-01-02T00:00:00.000Z').attribute('smoker', 'no').add()
      patientBuilder.patient().attribute('smoker', 'no').add()
      patientBuilder.patient().attribute('dateOfBirth', '1950-01-01T00:00:00.000Z').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, function () {
        var newParams = {
          mriConfigFragment: {
            chartOptions: {
              minCohortSize: 2
            }
          },
          configSetupManager: params.configSetupManager
        }
        specUtils.adaptMriConfiguration(newParams, done)
      })
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      MRI_CONFIG_METADATA['configId'] = 'ABCD1234B'
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), function () {
        var newParams = {
          configSetupManager: params.configSetupManager
        }
        specUtils.resetMriConfigurationToDefault(newParams, done)
      })
    })

    it('should filter to show only groups large than a given size when there is a lower limit on the patient count', function (done) {
      MRI_CONFIG_METADATA['configId'] = 'ABCD1234B_minCohortSize_2'
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .chart()
        .xaxis('basicdata', 'smoker')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.attributes.smoker': ['no'],
          'patient.attributes.pcount': [2]
        })
        done(err)
      })
    })
  })

  describe('patient-attributes filter card', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder.patient().attribute('dateOfBirth', '1950-01-02T00:00:00.000Z').attribute('smoker', 'yes').add()
      patientBuilder.patient().attribute('dateOfBirth', '1940-01-02T00:00:00.000Z').attribute('smoker', 'no').add()
      patientBuilder.patient().attribute('smoker', 'no').add()
      patientBuilder.patient().attribute('dateOfBirth', '1950-01-01T00:00:00.000Z').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should filter to only show patients with the specified attribute value in a text field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('smoker', {
          op: '=',
          value: 'yes'
        })
        .chart()
        .xaxis('basicdata', 'smoker')
        .yaxis('basicdata', 'pcount')
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.attributes.smoker': ['yes'],
          'patient.attributes.pcount': [1]
        })
        done()
      })
    })

    it('should show patients with no entry in the attribute in a "no value" column', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder.request().chart().xaxis('basicdata', 'smoker').yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.attributes.smoker': ['NoValue', 'no', 'yes'],
          'patient.attributes.pcount': [1, 2, 1]
        })
        done()
      })
    })

    it('should be able to show patient year of birth', function (done) {
      //
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder.request().chart().xaxis('basicdata', 'yearOfBirth', 1, 10).yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.attributes.yearOfBirth': ['NoValue', '1.94e+3', '1.95e+3'],
          'patient.attributes.pcount': [1, 1, 2]
        })
        done()
      })
    })

    it('should be able to filter patients by year of birth', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder.request().chart().xaxis('basicdata', 'yearOfBirth').yaxis('basicdata', 'pcount')
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .attribute('yearOfBirth', {
          op: '=',
          value: 1950
        })
        .chart()
        .xaxis('basicdata', 'yearOfBirth')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.attributes.yearOfBirth': [1950],
          'patient.attributes.pcount': [2]
        })
        done()
      })
    })
  })

  describe('single patient-interaction filter card: text attribute', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder.patient().interaction('vStatus').attribute('status', 'Alive').add()
      patientBuilder
        .patient()
        .interaction('vStatus')
        .attribute('status', 'Deceased')
        .interaction('vStatus', '2012-01-01')
        .add()
      patientBuilder.patient().attribute('dateOfBirth', '2012-01-01T00:00:00.000Z').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should filter to only show patients with the specified attribute value', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .filtercard('vStatus', 'vstatus1')
        .attribute('status', {
          op: '=',
          value: 'Deceased'
        })
        .chart()
        .xaxis('vstatus1', 'status')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.interactions.vStatus.1.attributes.status': ['Deceased'],
          'patient.attributes.pcount': [1]
        })
        done()
      })
    })

    it('should show in the "no value" column patients with an interaction of this type but no entry in the attribute. it should not show patients without any interaction of this type', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .filtercard('vStatus', 'vstatus1')
        .chart()
        .xaxis('vstatus1', 'status')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.interactions.vStatus.1.attributes.status': ['NoValue', 'Alive', 'Deceased'],
          'patient.attributes.pcount': [1, 1, 1]
        })
        done()
      })
    })
  })

  describe('single condition-interaction filter card: text attribute', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C35')
        .interaction('chemo', '2012-01-01')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C34')
        .interaction('priDiag', '2012-01-01')
        .add()
      patientBuilder.patient().condition('acme').interaction('chemo', '2012-01-01').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('- should filter to only show patients with the specified attribute value', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'C34'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C34'],
          'patient.attributes.pcount': [1]
        })
        done()
      })
    })

    it('should show in the "no value" column patients with an interaction of this type but no entry in the attribute. it should not show patients without any interaction of this type', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .attribute('pcount')
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10')
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['NoValue', 'C34', 'C35'],
          'patient.attributes.pcount': [1, 1, 1]
        })
        done()
      })
    })

    it('can drill down to the No Value column', function (done) {
      //
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .basicdata()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'NoValue'
        })
        .attribute('icd_10', {
          op: '=',
          value: 'C34'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['NoValue', 'C34'],
          'patient.attributes.pcount': [1, 1]
        })
        done()
      })
    })
  })

  describe('single condition-interaction filter card: numerical attribute -', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
        .condition('acme')
        .interaction('radio', '1947-01-01', '1947-01-01') // Age 47
        .attribute('radio_ops', 'O1')
        .attribute('radio_dosage', 147)
        .add()
      patientBuilder
        .patient()
        .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
        .condition('acme')
        .interaction('radio', '1949-01-01', '1949-01-01') // Age 49
        .attribute('radio_ops', 'O1')
        .attribute('radio_dosage', 149)
        .add()
      patientBuilder
        .patient()
        .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
        .condition('acme')
        .interaction('radio', '1944-01-01', '1944-01-01') // Age 44
        .attribute('radio_ops', 'O2')
        .attribute('radio_dosage', 144)
        .add()
      patientBuilder
        .patient()
        .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
        .condition('acme')
        .interaction('radio', '1946-01-01', '1946-01-01') // Age 46
        .attribute('radio_ops', 'O2')
        .attribute('radio_dosage', 146)
        .add()
      patientBuilder
        .patient()
        .attribute('dateOfBirth', '1900-01-01T00:00:00.000Z')
        .condition('acme')
        .interaction('radio', '1944-01-01', '1944-01-01') // Age 44
        .attribute('radio_dosage', 144)
        .add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should filter to only show patients with attribute values *above or equal to* the specified *inclusive* lower limit in a numerical field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('radio', 'rad1')
        .attribute('radio_dosage', {
          op: '>=',
          value: 146
        })
        .chart()
        .xaxis('rad1', 'radio_ops')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.radio.1.attributes.radio_ops': ['O1', 'O2'],
          'patient.attributes.pcount': [2, 1]
        })
        done()
      })
    })

    it('should filter to only show patients with attribute values *stricly above* the specified *exclusive* lower limit in a numerical field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('radio', 'rad1')
        .attribute('radio_dosage', {
          op: '>',
          value: 146
        })
        .chart()
        .xaxis('rad1', 'radio_ops')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.radio.1.attributes.radio_ops': ['O1'],
          'patient.attributes.pcount': [2]
        })
        done()
      })
    })

    it('should filter to only show patients with attribute values *below or equal to* the specified *inclusive* upper limit in a numerical field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('radio')
        .attribute('radio_dosage', {
          op: '<=',
          value: 146
        })
        .chart()
        .xaxis('rad1', 'radio_ops')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.radio.1.attributes.radio_ops': ['NoValue', 'O2'],
          'patient.attributes.pcount': [1, 2]
        })
        done()
      })
    })

    it('should filter to only show patients with attribute values *strictly below* the specified *exclusive* upper limit in a numerical field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('radio')
        .attribute('radio_dosage', {
          op: '<',
          value: 146
        })
        .chart()
        .xaxis('rad1', 'radio_ops')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.radio.1.attributes.radio_ops': ['NoValue', 'O2'],
          'patient.attributes.pcount': [1, 1]
        })
        done()
      })
    })

    it('can combine upper and lower limits on a numerical field', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('radio')
        .attribute('radio_dosage', {
          and: [
            {
              op: '>=',
              value: 146
            },
            {
              op: '<',
              value: 149
            }
          ]
        })
        .chart()
        .xaxis('rad1', 'radio_ops')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.radio.1.attributes.radio_ops': ['O1', 'O2'],
          'patient.attributes.pcount': [1, 1]
        })
        done()
      })
    })
  })

  describe('two patient-interaction cards of the same type', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .interaction('vStatus')
        .attribute('status', 'Alive')
        .interaction('vStatus')
        .attribute('status', 'Deceased')
        .add()
      patientBuilder
        .patient()
        .interaction('vStatus')
        .attribute('status', 'Alive')
        .interaction('vStatus')
        .attribute('status', 'Alive')
        .add()
      patientBuilder
        .patient()
        .interaction('vStatus')
        .attribute('status', 'Alive')
        .interaction('vStatus')
        .attribute('status', 'Deceased')
        .interaction('vStatus', '1900-01-01')
        .add()
      patientBuilder
        .patient()
        .interaction('vStatus')
        .attribute('status', 'Alive')
        .interaction('vStatus', '1900-01-01')
        .add()
      patientBuilder.patient().attribute('dateOfBirth', '1900-01-01T00:00:00.000Z').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })
  })

  describe('count interactions --', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'FOLFOX')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'FOLFOX')
        .interaction('chemo')
        .attribute('chemo_prot', 'ICE')
        .add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should be able to count interactions', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('chemo', 'ch1')
        .chart()
        .xaxis('ch1', 'chemo_prot')
        .yaxis('ch1', 'interactionCount')

      var expectedProtocols = ['COPP', 'FOLFOX', 'ICE']
      var expectedIcounts = [5, 2, 1]
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot': expectedProtocols,
          'patient.conditions.acme.interactions.chemo.1.attributes.interactionCount': expectedIcounts
        })
        done()
      })
    })
  })

  describe('two condition-interaction cards of the same type', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'FOLFOX')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('chemo')
        .attribute('chemo_prot', 'FOLFOX')
        .interaction('chemo')
        .attribute('chemo_prot', 'ICE')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .interaction('priDiag')
        .attribute('icd_10', 'C34')
        .add()
      patientBuilder.patient().attribute('dateOfBirth', '1900-01-01T00:00:00.000Z').add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })
  })

  describe('case sensitivity --', function () {
    var patientIcds

    before(function (done) {
      logToConsole('Creating test patient data')
      patientIcds = ['C01', 'C01', 'C01', 'C02', 'c02', 'c02']
      var patientBuilder = new PatientBuilder()
      patientIcds.forEach(function (icd) {
        patientBuilder.patient().condition('acme').interaction('priDiag').attribute('icd_10', icd).add()
      })
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('searching with an uppercase search term should retrieve entries stored in uppercase', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'C01'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C01'],
          'patient.attributes.pcount': [3]
        })
        done()
      })
    })

    it('searching with a lowercase search term should retrieve entries stored in uppercase', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'c01'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C01'],
          'patient.attributes.pcount': [3]
        })
        done()
      })
    })

    it('upper- and lowercase keys are treated as distinct groups when searching with an uppercase search term', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'C02'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C02', 'c02'],
          'patient.attributes.pcount': [1, 2]
        })
        done()
      })
    })

    it('upper- and lowercase keys are treated as distinct groups when searching with a lowercase search term', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10', {
          op: '=',
          value: 'c02'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C02', 'c02'],
          'patient.attributes.pcount': [1, 2]
        })
        done()
      })
    })
  })

  describe('absolute time', function () {
    var patients

    before(function (done) {
      //                   5.01.       14.01.      16.01.                24.01.  30.01.
      //            01.01    |          |            |                    |        |
      //              |      | 10.01.   |            |         20.01.     |        |
      //              |      | lower    |            |         upper      |        |
      //    Query                [---------------------------------]
      //
      // n  Pat1      [------]
      // y  Pat2      [------------------------------]
      // y  Pat3                        [------------]
      // y  Pat4                        [------------------------------------------]
      // n  Pat5                                                          [--------]
      // n  Pat6             X
      // y  Pat7                        X
      // n  Pat8                                                          X
      // y  Pat9      [------------------------------------------------------------...
      // y  Pat10                       [------------------------------------------...
      // n  Pat11                                                         [--------...
      // n  Pat12    ...-----]
      // y  Pat13    ...-----------------------------]
      // y  Pat14    ...--------------------------------------------------]
      // y  Pat15     [------------------------------------------------------------]
      // y  Pat16    ** no time specified **

      patients = [
        {
          icd: 'P01',
          start: '2000-01-01',
          end: '2000-01-05',
          included: false
        },
        {
          icd: 'P02',
          start: '2000-01-01',
          end: '2000-01-16',
          included: true
        },
        {
          icd: 'P03',
          start: '2000-01-14',
          end: '2000-01-30',
          included: true
        },
        {
          icd: 'P04',
          start: '2000-01-14',
          end: '2000-01-30',
          included: true
        },
        {
          icd: 'P05',
          start: '2000-01-24',
          end: '2000-01-30',
          included: false
        },
        {
          icd: 'P06',
          start: '2000-01-05',
          end: '2000-01-05',
          included: false
        },
        {
          icd: 'P07',
          start: '2000-01-14',
          end: '2000-01-14',
          included: true
        },
        {
          icd: 'P08',
          start: '2000-01-24',
          end: '2000-01-24',
          included: false
        },
        {
          icd: 'P09',
          start: '2000-01-01',
          included: true
        },
        {
          icd: 'P10',
          start: '2000-01-14',
          included: true
        },
        {
          icd: 'P11',
          start: '2000-01-24',
          included: false
        },
        {
          icd: 'P12',
          end: '2000-01-05',
          included: false
        },
        {
          icd: 'P13',
          end: '2000-01-16',
          included: true
        },
        {
          icd: 'P14',
          end: '2000-01-24',
          included: true
        },
        {
          icd: 'P15',
          start: '2000-01-01',
          end: '2000-01-30',
          included: true
        },
        {
          icd: 'P16',
          included: false
        }
      ]

      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patients.forEach(function (patient) {
        patientBuilder
          .patient()
          .condition('acme')
          .interaction('priDiag', patient.start, patient.end)
          .attribute('icd_10', patient.icd)
          .add()
      })
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should return results regardless of the time information attached to interactions if no time constraint is given', function (done) {
      // without abs time constraint
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('icd_10')
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      var expectedCounts = patients.map(function () {
        return 1
      })
      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': patients.map(function (p) {
            return p.icd
          }),
          'patient.attributes.pcount': expectedCounts
        })
        done()
      })
    })

    it('should limit the result to patients that had the specified interactions within the given absolute time frame', function (done) {
      // with abs time constraint
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .absolutetime({
          and: [
            {
              op: '>=',
              value: '20000110',
              type: 'abstime'
            },
            {
              op: '<=',
              value: '20000120',
              type: 'abstime'
            }
          ]
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        var includedPatients = patients.filter(function (p) {
          return p.included
        })
        var expectedCounts = includedPatients.map(function () {
          return 1
        })
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': includedPatients.map(function (p) {
            return p.icd
          }),
          'patient.attributes.pcount': expectedCounts
        })
        done()
      })
    })
  })

  describe('successor constraint between two cards', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag', '1900-01-10', '1900-01-10')
        .attribute('icd_10', 'C34')
        .interaction('chemo', '1900-01-11', '1900-01-11')
        .attribute('chemo_prot', 'FOLFOX')
        .interaction('chemo', '1900-01-09', '1900-01-09')
        .attribute('chemo_prot', 'COPP')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag', '1900-01-10', '1900-01-10')
        .attribute('icd_10', 'C34')
        .interaction('chemo', '1900-01-11', '1900-01-11')
        .attribute('chemo_prot', 'COPP')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C34')
        .interaction('chemo')
        .attribute('chemo_prot', 'FOLFOX')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C34')
        .interaction('chemo')
        .attribute('chemo_prot', 'COPP')
        .add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should limit the result to patients that had the specified interactions within the given time frame', function (done) {
      // with successor constraint
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'firstDiag')
        .attribute('icd_10', {
          op: '=',
          value: 'C34'
        })
        .filtercard('chemo', 'firstChemo')
        .relativetime('isSucceededBy', 'firstDiag', 'firstChemo', {
          and: [
            {
              op: '>=',
              value: 1
            }
          ]
        })
        .chart()
        .xaxis('firstChemo', 'chemo_prot')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot': ['COPP', 'FOLFOX'],
          'patient.attributes.pcount': [1, 1]
        })
        done()
      })
    })
  })

  describe('freetext field --', function () {
    before(function (done) {
      logToConsole('Creating test patient data')
      var patientBuilder = new PatientBuilder()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C1')
        .attribute('freetextDiag', 'Some free text')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C2')
        .attribute('freetextDiag', 'Some free text')
        .add()
      patientBuilder
        .patient()
        .condition('acme')
        .interaction('priDiag')
        .attribute('icd_10', 'C3')
        .attribute('freetextDiag', 'Another free snippet')
        .add()
      specUtils.persistPatientSet(patientBuilder, hostConfig, configName, done)
    })

    after(function (done) {
      logToConsole('Truncating test patient data')
      specUtils.truncatePatientData(hdbClient, hostConfig.getTestSchemaName(), done)
    })

    it('should return patients with the given string in the interaction text', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .attribute('freetextDiag', {
          op: 'contains',
          value: 'Some free text'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C1', 'C2'],
          'patient.attributes.pcount': [1, 1]
        })
        done()
      })
    })

    it('excluded -- should return patients without the given string in the interaction text', function (done) {
      var requestBuilder = new RequestBuilder(MRI_CONFIG_METADATA, MRI_CUR_CONFIG)
      requestBuilder
        .request()
        .filtercard('priDiag', 'pd1')
        .filtercard('priDiag')
        .exclude()
        .attribute('freetextDiag', {
          op: 'contains',
          value: 'Some free text'
        })
        .chart()
        .xaxis('pd1', 'icd_10')
        .yaxis('basicdata', 'pcount')

      requestBuilder.submit(aliceHanaRequest, PATH, defaultBarChartParameters, function (err, response, body) {
        specUtils.checkAnalyticsResult(body, {
          'patient.conditions.acme.interactions.priDiag.1.attributes.icd_10': ['C3'],
          'patient.attributes.pcount': [1]
        })
        done()
      })
    })
  })
})
