/* eslint-env node */

/**
 * Test suite for the HDB test_environment.
 *
 * @module backend_uplink
 */
/* eslint-disable no-unused-expressions */
;(function () {
  'use strict'

  var chai = require('chai')
  var expect = chai.expect
  var sinon = require('sinon')
  var sinonChai = require('sinon-chai')
  chai.use(sinonChai)

  var BackendUplink = require('../lib/backend_uplink')

  /*
   * Test suite for normalizeSql().
   */
  var uplink
  describe('HTTP-BASED BACKEND COMMUNICATION TEST SUITE', function () {
    describe('BackendUplink', function () {
      var fakeStandardGlobalSettings = {
        tableMapping: {
          '@INTERACTION': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTIONS"',
          '@OBS': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS"',
          '@CODE': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV"',
          '@MEASURE': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV"',
          '@REF': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.CODES"',
          '@PATIENT': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.PATIENT"',
          '@TEXT': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV"',
          '@INTERACTION.PATIENT_ID': '"PATIENT_ID"',
          '@INTERACTION.INTERACTION_ID': '"INTERACTION_ID"',
          '@INTERACTION.CONDITION_ID': '"CONDITION_ID"',
          '@INTERACTION.PARENT_INTERACT_ID': '"PARENT_INTERACT_ID"',
          '@INTERACTION.START': '"START"',
          '@INTERACTION.END': '"END"',
          '@OBS.PATIENT_ID': '"PATIENT_ID"',
          '@OBS.OBSERVATION_ID': '"OBS_CHAR_VAL"',
          '@CODE.INTERACTION_ID': '"INTERACTION_ID"',
          '@MEASURE.INTERACTION_ID': '"INTERACTION_ID"',
          '@REF.VOCABULARY_ID': '"VOCABULARY_ID"',
          '@REF.CODE': '"CODE"',
          '@REF.TEXT': '"DESCRIPTION"',
          '@TEXT.INTERACTION_TEXT_ID': '"INTERACTION_TEXT_ID"',
          '@TEXT.INTERACTION_ID': '"INTERACTION_ID"',
          '@TEXT.VALUE': '"VALUE"',
          '@PATIENT.PATIENT_ID': '"PATIENT_ID"',
          '@PATIENT.DOD': '"DOD"',
          '@PATIENT.DOB': '"DOB"'
        },
        guardedTableMapping: {
          '@PATIENT': '"CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.GUARDED_PATIENT"',
          '@INTERACTION': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTIONS"',
          '@OBS': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.OBSERVATIONS"',
          '@CODE': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV"',
          '@MEASURE': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_MEASURES_EAV"',
          '@REF': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.CODES"',
          '@TEXT': 'CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_TEXT_EAV"',
          '@INTERACTION.PATIENT_ID': '"PATIENT_ID"',
          '@INTERACTION.INTERACTION_ID': '"INTERACTION_ID"',
          '@INTERACTION.CONDITION_ID': '"CONDITION_ID"',
          '@INTERACTION.PARENT_INTERACT_ID': '"PARENT_INTERACT_ID"',
          '@INTERACTION.START': '"START"',
          '@INTERACTION.END': '"END"',
          '@OBS.PATIENT_ID': '"PATIENT_ID"',
          '@OBS.OBSERVATION_ID': '"OBSERVATION_ID"',
          '@CODE.INTERACTION_ID': '"INTERACTION_ID"',
          '@MEASURE.INTERACTION_ID': '"INTERACTION_ID"',
          '@REF.VOCABULARY_ID': '"VOCABULARY_ID"',
          '@REF.CODE': '"CODE"',
          '@REF.TEXT': '"DESCRIPTION"',
          '@TEXT.INTERACTION_TEXT_ID': '"INTERACTION_TEXT_ID"',
          '@TEXT.INTERACTION_ID': '"INTERACTION_ID"',
          '@TEXT.VALUE': '"VALUE"',
          '@PATIENT.PATIENT_ID': '"PATIENT_ID"',
          '@PATIENT.DOD': '"DOD"',
          '@PATIENT.DOB': '"DOB"'
        },
        language: ['en', 'de', 'fr'],
        settings: {
          fuzziness: 0.7,
          maxResultSize: 5000,
          sqlReturnOn: false,
          errorDetailsReturnOn: false,
          errorStackTraceReturnOn: false,
          freetextTempTable: '"CDMDEFAULT"."legacy.cdw.db.models::Helper.TmpTextKeys"',
          hhpSchemaName: 'CDMDEFAULT',
          refSchemaName: 'CDMDEFAULT',
          genomicsEnabled: true,
          kaplanMeierTable: 'CDMDEFAULT."pa.db::MRIEntities.KaplanMeierInput"',
          bookmarks_schema: 'CDMDEFAULT',
          medexSchemaName: 'CDMDEFAULT',
          vbEnabled: true,
          afpEnabled: true,
          patientDataAccessLogging: false,
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss'
        },
        configId: 'GlobalSettings'
      }

      describe('redirectQueriesToTestSchema()', function () {
        var fakeHanaRequest

        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse, fakeStandardGlobalSettings)
          fakeHanaRequest.request.onCall(1).callsArgWith(1, null, fakeResponse)
          fakeHanaRequest.request.onCall(2).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('retrieves the existing global setting from the global settings HTTP endpoint', function (done) {
          uplink.redirectQueriesToTestSchema('testSchema', function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/\/global.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('loadGlobalSettings')
            done()
          })
        })

        it('resets the global setting so that all non-guarded placeholders now point to the test schemas', function (done) {
          uplink.redirectQueriesToTestSchema('testSchema', function (err) {
            var secondCallArg = fakeHanaRequest.request.getCall(1).args[0]
            expect(secondCallArg.path).to.match(/\/global.xsjs/)
            var bodyPassed = JSON.parse(secondCallArg.body)
            expect(bodyPassed.action).to.equal('setGlobalSettings')
            var settingPassed = bodyPassed.settings
            Object.keys(settingPassed.tableMapping).forEach(function (placeholder) {
              if (/^@\w$/.test(placeholder)) {
                expect(settingPassed.tableMapping[placeholder]).to.match(/\"testSchema\"/)
              }
            })
            done()
          })
        })

        it('resets the global setting so that all guarded placeholders now point to the test schemas', function (done) {
          uplink.redirectQueriesToTestSchema('testSchema', function (err) {
            var secondCallArg = fakeHanaRequest.request.getCall(1).args[0]
            expect(secondCallArg.path).to.match(/\/global.xsjs/)
            var bodyPassed = JSON.parse(secondCallArg.body)
            expect(bodyPassed.action).to.equal('setGlobalSettings')
            var settingPassed = bodyPassed.settings
            Object.keys(settingPassed.guardedTableMapping).forEach(function (placeholder) {
              if (/^@\w$/.test(placeholder)) {
                expect(settingPassed.guardedTableMapping[placeholder]).to.match(/\"testSchema\"/)
              }
            })
            done()
          })
        })

        it('switches on full error information', function (done) {
          uplink.redirectQueriesToTestSchema('testSchema', function (err) {
            var secondCallArg = fakeHanaRequest.request.getCall(1).args[0]
            var bodyPassed = JSON.parse(secondCallArg.body)
            var settingsPassed = bodyPassed.settings.settings
            expect(secondCallArg.path, 'Should point to the global settings endpoint').to.match(/\/global.xsjs/)
            expect(bodyPassed.action).to.equal('setGlobalSettings')
            expect(settingsPassed.sqlReturnOn, 'SQL return is on').to.be.true
            expect(settingsPassed.errorDetailsReturnOn, 'Error detail return is on').to.be.true
            expect(settingsPassed.errorStackTraceReturnOn, 'Stack trace return is on').to.be.true
            done()
          })
        })
      })

      describe('redirectQueriesBackToStandardSchema()', function () {
        var fakeHanaRequest
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse, fakeStandardGlobalSettings)
          fakeHanaRequest.request.onCall(1).callsArgWith(1, null, fakeResponse)
          fakeHanaRequest.request.onCall(2).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('reverts the changes done by redirectQueriesToTestSchema() via the global settings HTTP endpoint', function (done) {
          uplink.redirectQueriesToTestSchema('testSchema', function (err) {
            uplink.redirectQueriesBackToStandardSchema(function (err2) {
              var thirdCallArg = fakeHanaRequest.request.getCall(2).args[0]
              expect(thirdCallArg.path).to.match(/\/global.xsjs/)
              var bodyPassed = JSON.parse(thirdCallArg.body)
              expect(bodyPassed.settings).to.eql(fakeStandardGlobalSettings)
              done()
            })
          })
        })
      })

      describe('addCdwConfiguration()', function () {
        var fakeHanaRequest
        var fakeConfig = {
          a: 1
        }
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends an activate-request to the config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          uplink.addCdwConfiguration(fakeConfig, fakeName, fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/hph\/cdw\/config\/services\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('activate')
            done()
          })
        })

        it('passes the passed parameter in the corresponding fields in the request body', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          uplink.addCdwConfiguration(fakeConfig, fakeId, fakeName, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.config).to.eql(fakeConfig)
            expect(bodyPassed.configName).to.equal(fakeName)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })

        it('sets the config version to 1', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          uplink.addCdwConfiguration(fakeConfig, fakeId, fakeName, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configVersion).to.equal('1')
            done()
          })
        })
      })

      describe('removeCdwConfiguration()', function () {
        var fakeHanaRequest
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends a delete-request to the config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          uplink.removeCdwConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('delete')
            done()
          })
        })

        it('passes the config ID to the request body', function (done) {
          var fakeId = 'abcd'
          uplink.removeCdwConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })
      })

      describe('addMriConfiguration()', function () {
        var fakeHanaRequest
        var fakeConfig = {
          a: 1
        }
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends an activate-request to the MRI config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addMriConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/mri\/pa\/config\/services\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('activate')
            done()
          })
        })

        it('passes the passed parameter in the corresponding fields in the request body', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addMriConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.config).to.eql(fakeConfig)
            expect(bodyPassed.configName).to.equal(fakeName)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })

        it('sets the version no. of the dependent CDW config to 1', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addMriConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.dependentConfig.configVersion).to.equal('1')
            done()
          })
        })
      })

      describe('removeMriConfiguration()', function () {
        var fakeHanaRequest
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends a delete-request to the MRI config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          uplink.removeMriConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/mri\/pa\/config\/services\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('delete')
            done()
          })
        })

        it('passes the config ID to the request body', function (done) {
          var fakeId = 'abcd'
          uplink.removeMriConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })

        it('always deletes the active version', function (done) {
          var fakeId = 'abcd'
          uplink.removeMriConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configVersion).to.equal('A')
            done()
          })
        })
      })

      describe('addPatientConfiguration()', function () {
        var fakeHanaRequest
        var fakeConfig = {
          a: 1
        }
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends an activate-request to the Patient Summary config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addPatientConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/hph\/patient\/config\/services\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('activate')
            done()
          })
        })

        it('passes the passed parameter in the corresponding fields in the request body', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addPatientConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.config).to.eql(fakeConfig)
            expect(bodyPassed.configName).to.equal(fakeName)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })

        it('sets the version no. of the dependent CDW config to 1', function (done) {
          var fakeId = 'abcd'
          var fakeName = 'someName'
          var fakeCdwId = 'dcba'
          uplink.addPatientConfiguration(fakeConfig, fakeId, fakeName, fakeCdwId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.dependentConfig.configVersion).to.equal('1')
            done()
          })
        })
      })

      describe('removePatientConfiguration()', function () {
        var fakeHanaRequest
        beforeEach(function () {
          fakeHanaRequest = {
            request: sinon.stub()
          }
          var fakeResponse = {
            statusCode: 200
          }
          fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
          uplink = new BackendUplink(fakeHanaRequest)
        })

        it('sends a delete-request to the Patient Summary config.xsjs endpoint', function (done) {
          var fakeId = 'abcd'
          uplink.removePatientConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            expect(firstCallArg.path).to.match(/hph\/patient\/config\/services\/config.xsjs/)
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.action).to.equal('delete')
            done()
          })
        })

        it('passes the config ID to the request body', function (done) {
          var fakeId = 'abcd'
          uplink.removePatientConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configId).to.equal(fakeId)
            done()
          })
        })

        it('always deletes the active version', function (done) {
          var fakeId = 'abcd'
          uplink.removePatientConfiguration(fakeId, function (err) {
            var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
            var bodyPassed = JSON.parse(firstCallArg.body)
            expect(bodyPassed.configVersion).to.equal('A')
            done()
          })
        })
      })
    })
  })
})()
