/* eslint-env node */
/* global __dirname */
/* eslint-disable no-unused-expressions */

'use strict'

var HanaRequest = require('../lib/hana_request')
var HostConfig = require('../lib/host_config')
var specUtils = require('../specs/spec_utils')

var path = require('path')
var fs = require('fs')
var chai = require('chai')
var expect = chai.expect

var STRATEGUS_ANALYSIS_PATH = '/d2e/strategus/analysis/'

var analysisSpec = fs.readFileSync(
  path.join(__dirname, 'configs/strategus_analysis_json/treatment_pathways.json'),
  'utf8'
)

var HARDCODED_STUDY = {
  studyId: 'http_test_strategus_study',
  tokenStudyCode: 'http_test_strategus_study',
  tenantId: 'e0348e4d-2e17-43f2-a3c6-efd752d17c23',
  analysisSpec: analysisSpec,
  mode: 'kernel',
  notebookName: 'http_test_strategus_study'
}

describe('-- STRATEGUS ANALYSIS TESTS --', function () {
  var environmentPath = path.join(__dirname, '.envir')
  var hostConfig = new HostConfig(environmentPath)
  var hanaRequest = new HanaRequest(hostConfig.getTestUserLogin())

  after(function (done) {
    var deleteQuery = {
      method: 'DELETE',
      path: STRATEGUS_ANALYSIS_PATH + HARDCODED_STUDY.studyId,
      parameters: {},
      body: '',
      headers: {
        authorization: process.env.BEARER_TOKEN
      }
    }
    hanaRequest.request(deleteQuery, function () {
      // swallow errors — cleanup best-effort
      done()
    })
  })

  describe('POST /d2e/strategus/analysis/', function () {
    it('creates a strategus study dataset and returns analysisId', function (done) {
      var createQuery = {
        method: 'POST',
        path: STRATEGUS_ANALYSIS_PATH,
        parameters: {},
        body: JSON.stringify(HARDCODED_STUDY),
        contentType: 'application/json',
        headers: {
          authorization: process.env.BEARER_TOKEN
        }
      }
      hanaRequest.request(createQuery, function (err, response, body) {
        specUtils.assertIsValidResponse(err, response.statusCode)
        expect(body.analysisId, 'Response should contain analysisId').to.be.a('string').and.not.be.empty
        expect(body.message).to.equal('Analysis specification saved successfully.')
        done()
      })
    })
  })

  describe('POST /d2e/jobplugins/prefect/jupyter-kernel/flow-run/strategus', function () {
    it('creates a prefect flow run for the strategus study and polls until COMPLETED', function (done) {
      this.timeout(360000)

      var PREFECT_FLOW_RUN_PATH = '/d2e/jobplugins/prefect/jupyter-kernel/flow-run/strategus'
      var PREFECT_STATE_BASE_PATH = '/d2e/jobplugins/prefect/flow-run/'
      var POLL_INTERVAL_MS = 15000
      var MAX_POLLS = 20

      var createQuery = {
        method: 'POST',
        path: PREFECT_FLOW_RUN_PATH,
        parameters: {},
        body: JSON.stringify({
          json_graph: {
            analysisSpecification: analysisSpec
          },
          options: {
            mode: 'kernel',
            datasetId: process.env.DATASET_ID,
            studyId: HARDCODED_STUDY.studyId,
            tokenStudyCode: HARDCODED_STUDY.tokenStudyCode,
            uploadResults: true
          }
        }),
        contentType: 'application/json',
        headers: {
          authorization: process.env.BEARER_TOKEN
        }
      }

      hanaRequest.request(createQuery, function (err, response, body) {
        specUtils.assertIsValidResponse(err, response.statusCode)
        expect(body.flowrunId, 'Response should contain flowrunId').to.be.a('string').and.not.be.empty
        expect(body.status).to.equal('Successfully created a flow run')

        var flowRunId = body.flowrunId
        var pollCount = 0

        function writeToGithubEnv(key, value) {
          if (process.env.GITHUB_ENV) {
            fs.appendFileSync(process.env.GITHUB_ENV, key + '=' + value + '\n')
          }
        }

        function pollState() {
          if (pollCount >= MAX_POLLS) {
            writeToGithubEnv('PREFECT_FLOW_RUN_ID', flowRunId)
            return done(new Error('Flow run did not complete within the expected time'))
          }
          pollCount++

          var stateQuery = {
            method: 'GET',
            path: PREFECT_STATE_BASE_PATH + flowRunId + '/state',
            parameters: {},
            body: '',
            headers: {
              authorization: process.env.BEARER_TOKEN
            }
          }

          hanaRequest.request(stateQuery, function (stateErr, stateResponse, stateBody) {
            try {
              specUtils.assertIsValidResponse(stateErr, stateResponse.statusCode)
            } catch (assertErr) {
              writeToGithubEnv('PREFECT_FLOW_RUN_ID', flowRunId)
              return done(assertErr)
            }

            if (stateBody.state_type === 'COMPLETED') {
              return done()
            } else if (stateBody.state_type === 'FAILED' || stateBody.state_type === 'CRASHED') {
              writeToGithubEnv('PREFECT_FLOW_RUN_ID', flowRunId)
              return done(new Error('Flow run ended with state: ' + stateBody.state_type))
            } else {
              setTimeout(pollState, POLL_INTERVAL_MS)
            }
          })
        }

        setTimeout(pollState, POLL_INTERVAL_MS)
      })
    })
  })
})
