/* eslint-env node */

/**
 * Test suite for the patient creator
 */
/* eslint-disable no-unused-expressions */

;(function () {
  'use strict'

  var chai = require('chai')
  var expect = chai.expect
  var sinon = require('sinon')
  var sinonChai = require('sinon-chai')
  chai.use(sinonChai)

  var PatientCreator = require('../lib/patient_creator')
  var utils = require('../lib/utils')

  describe('PatientCreator', function () {
    var patientCreator

    describe('constructor', function () {
      var fakeClient = { x: 'y' }
      var fakeConfig = { a: 1 }
      beforeEach(function () {
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
      })

      it('can be called', function () {
        expect(patientCreator).to.exist
      })

      it('sets the schema, client and config to the passed values', function () {
        expect(patientCreator.schemaName).to.equal('fakeSchema')
        expect(patientCreator.config).to.eql(fakeConfig)
        expect(patientCreator.hdbClient).to.eql(fakeClient)
      })
    })

    describe('init()', function () {
      var fakeClient
      var fakeConfig = { a: 1 }
      var testRows = [{ a: 1 }, { 2: 1 }]
      var fakeTables = ['a', 'b']
      var gtStub
      beforeEach(function () {
        fakeClient = {
          connect: sinon.stub().callsArg(0),
          exec: sinon.stub().callsArgWith(1, null, testRows),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        gtStub = sinon.stub(patientCreator, 'getTables').callsArgWith(1, null, fakeTables)
      })

      it('connects the client', function (done) {
        patientCreator.init(function () {
          expect(fakeClient.connect).to.have.been.called
          done()
        })
      })

      it('fetches the schema tables', function (done) {
        patientCreator.init(function () {
          expect(gtStub).to.have.been.called
          done()
        })
      })

      it('stores the retrieved the schema tables', function (done) {
        patientCreator.init(function () {
          expect(patientCreator.tables).to.eql(fakeTables)
          done()
        })
      })
    })

    describe('getTables()', function () {
      var fakeClient = {}
      var fakeConfig = { a: 1 }
      var sqlStub
      beforeEach(function () {
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        var fakeRows = [
          { TABLE_NAME: 'firstTable', COLUMN_NAME: 'firstColumn', POSITION: 1, DATA_TYPE_NAME: 'NVARCHAR' },
          { TABLE_NAME: 'firstTable', COLUMN_NAME: 'secondColumn', POSITION: 2, DATA_TYPE_NAME: 'TIMESTAMP' },
          { TABLE_NAME: 'secondTable', COLUMN_NAME: 'firstColumn', POSITION: 3, DATA_TYPE_NAME: 'INTEGER' }
        ]
        sqlStub = sinon.stub(patientCreator, 'executeSqlCommand').callsArgWith(1, null, fakeRows)
      })

      it('calls the callback with an object that stores the info using the table names as keys', function (done) {
        patientCreator.getTables('fakeSchema', function (err, result) {
          expect(result).to.have.all.keys('firstTable', 'secondTable')
          done()
        })
      })
      it('calls the callback with an object for which each value contains the right positions', function (done) {
        patientCreator.getTables('fakeSchema', function (err, result) {
          expect(result['firstTable']['firstColumn'].position).to.equal(1)
          expect(result['firstTable']['secondColumn'].position).to.equal(2)
          expect(result['secondTable']['firstColumn'].position).to.equal(3)
          done()
        })
      })

      it('calls the callback with an object for which each value contains the converted SQL datatype', function (done) {
        patientCreator.getTables('fakeSchema', function (err, result) {
          expect(result['firstTable']['firstColumn'].dataType).to.equal('text')
          expect(result['firstTable']['secondColumn'].dataType).to.equal('time')
          expect(result['secondTable']['firstColumn'].dataType).to.equal('num')
          done()
        })
      })

      it('fires a SELECT SQL statement on the TABLE_COLUMNS table', function (done) {
        patientCreator.getTables('fakeSchema', function (err, result) {
          var sqlString = sqlStub.getCall(0).args[0]
          expect(sqlString).to.match(/SELECT.*FROM\s+TABLE_COLUMNS/i)
          done()
        })
      })
    })

    describe('extractPholderTableFieldValue()', function () {
      var oldPmap
      before(function () {
        oldPmap = JSON.parse(JSON.stringify(PatientCreator.insertPholderTableMap))
        PatientCreator.insertPholderTableMap = {
          '@PHOLDER1': ['some.long.table::name'],
          '@PHOLDER2': ['some.other.long.table::name', 'another.long.table::name']
        }
      })

      after(function () {
        PatientCreator.insertPholderTableMap = oldPmap
      })

      var fakeClient = {}
      var fakeConfig = { a: 1 }
      beforeEach(function () {
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        var fakeTableInfo = {
          'some.long.table::name': {
            aField: {},
            anotherField: {}
          },
          'some.other.long.table::name': {
            bField: {},
            bnotherField: {}
          },
          'another.long.table::name': {
            cField: {},
            cnotherField: {}
          }
        }
        patientCreator.tables = fakeTableInfo
      })

      it('throws an error if the passed expression is not a valid values assignment', function () {
        var noPlaceholderConfig = 'PHOLDER1.someField = 1'
        var noFieldConfig = '@PHOLDER1 = 1'
        var noValueConfig = '@PHOLDER1.someField = '
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(noPlaceholderConfig)
        }).to.throw(Error)
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(noFieldConfig)
        }).to.throw(Error)
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(noValueConfig)
        }).to.throw(Error)
      })

      it('throws an error if the extracted table placeholder is not on the internal list', function () {
        var wrongPlaceholderConfig = '@NOT_VALID.someField = 1'
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(wrongPlaceholderConfig)
        }).to.throw(Error)
      })

      it('throws an error if the extracted field is not found in the extracted table', function () {
        var wrongPlaceholderConfig = '@PHOLDER1.notAField = 1'
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(wrongPlaceholderConfig)
        }).to.throw(Error)
      })

      it('searches the possible tables for the placeholder for a matching field', function () {
        var placeholderConfig = '@PHOLDER2.cField = 1'
        expect(function () {
          return patientCreator.extractPholderTableFieldValue(placeholderConfig)
        }).not.to.throw(Error)
      })

      it('extracts the table, field, value and placeholder for a match', function () {
        var placeholderConfig = '@PHOLDER2.cField = 1'
        var result = patientCreator.extractPholderTableFieldValue(placeholderConfig)
        var expectedResult = {
          table: 'another.long.table::name',
          field: 'cField',
          value: '1',
          pholder: '@PHOLDER2'
        }
        expect(result).to.eql(expectedResult)
      })

      it('strips single quotes from values', function () {
        var placeholderConfig = "@PHOLDER2.cField = 'x'"
        var result = patientCreator.extractPholderTableFieldValue(placeholderConfig)
        expect(result.value).to.eql('x')
      })
    })

    describe('insertIntoTable()', function () {
      var fakeClient
      var fakeConfig = { a: 1 }
      var sqlStub
      beforeEach(function () {
        var fakeRows = [{}]
        fakeClient = {
          connect: sinon.stub().callsArg(0),
          exec: sinon.stub().callsArgWith(1, null, fakeRows),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        sqlStub = sinon.stub(patientCreator, 'executeSqlStatement').callsArgWith(2, null, fakeRows)
      })

      it('adds a default validTo date if none is present for the table legacy.cdw.db.models::DWEntities.Patient_Attr', function (done) {
        var fakeTableInfo = {
          'legacy.cdw.db.models::DWEntities.Patient_Attr': {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            },
            ValidFrom: {
              position: 3,
              dataType: 'time'
            },
            Lang: {
              position: 4,
              dataType: 'text'
            },
            InteractionTextID: {
              position: 5,
              dataType: 'text'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 1,
          b: 'something'
        }
        patientCreator.insertIntoTable('legacy.cdw.db.models::DWEntities.Patient_Attr', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var sqlString = sqlStub.getCall(0).args[0]
          expect(sqlString).to.match(/ValidFrom/)
          done()
        })
      })

      it('adds a default language and a text ID if none is present for the table legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text', function (done) {
        var fakeTableInfo = {
          'legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text': {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            },
            ValidFrom: {
              position: 3,
              dataType: 'time'
            },
            Lang: {
              position: 4,
              dataType: 'text'
            },
            InteractionTextID: {
              position: 5,
              dataType: 'text'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 1,
          b: 'something'
        }
        patientCreator.insertIntoTable(
          'legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text',
          fakeJsonData,
          function (err) {
            expect(err).to.not.be.defined
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString)
              .to.match(/Lang/)
              .and.to.match(/InteractionTextID/)
            done()
          }
        )
      })

      it('escapes the column names', function (done) {
        var fakeTableInfo = {
          fakeTable: {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 1,
          b: 'something'
        }
        patientCreator.insertIntoTable('fakeTable', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var sqlString = sqlStub.getCall(0).args[0]
          expect(sqlString).to.match(/"a"/).and.to.match(/"b"/)
          done()
        })
      })

      it('fires SQL that INSERTs all data into the passed table ', function (done) {
        var fakeTableInfo = {
          fakeTable: {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 1,
          b: 'something'
        }
        patientCreator.insertIntoTable('fakeTable', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var sqlString = sqlStub.getCall(0).args[0]
          expect(sqlString).to.match(/INSERT\s+INTO\s+fakeSchema\."fakeTable"/)
          done()
        })
      })

      it('the INSERT statement maps the passed values to the correct columns', function (done) {
        var fakeTableInfo = {
          fakeTable: {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            },
            c: {
              position: 3,
              dataType: 'num'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 1,
          c: 45.6,
          b: 'something'
        }
        patientCreator.insertIntoTable('fakeTable', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var sqlString = sqlStub.getCall(0).args[0]
          var paramArray = sqlStub.getCall(0).args[1]
          // Extract the field names
          var fieldSql = sqlString.match(/\([^\)]+\)/)
          var fieldArr = fieldSql[0].split('(')[1].split(')')[0].split(',')
          var cleanFieldArr = fieldArr.map(function (rawElem) {
            return rawElem.replace(/(?:"|\s)/g, '')
          })
          // Check that the orderings match
          var matchObj = {}
          cleanFieldArr.forEach(function (field, index) {
            matchObj[field] = paramArray[index]
          })
          expect(matchObj).to.eql(fakeJsonData)
          done()
        })
      })

      it('converts handles numerical fields stored as strings into numbers', function (done) {
        var fakeTableInfo = {
          fakeTable: {
            a: {
              position: 1,
              dataType: 'num'
            },
            b: {
              position: 2,
              dataType: 'text'
            },
            c: {
              position: 3,
              dataType: 'num'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: '1',
          c: '45.6',
          b: 'something'
        }
        patientCreator.insertIntoTable('fakeTable', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var paramArray = sqlStub.getCall(0).args[1]
          expect(paramArray).to.include(1).and.to.include(45.6)
          done()
        })
      })

      it('tranforms handles binary fields stored as strings into bytearray of the first 31 characters', function (done) {
        var fakeTableInfo = {
          fakeTable: {
            a: {
              position: 1,
              dataType: 'binary'
            }
          }
        }
        patientCreator.tables = fakeTableInfo
        var fakeJsonData = {
          a: 'dflghjdxlhböol ö oirrgyjlkghlkjfyghdflkjbh'
        }
        patientCreator.insertIntoTable('fakeTable', fakeJsonData, function (err) {
          expect(err).to.not.be.defined
          var paramArray = sqlStub.getCall(0).args[1]
          var first32Chars = Buffer.from(fakeJsonData['a'], 'hex')
          expect(paramArray).to.eql([first32Chars])
          done()
        })
      })
    })

    describe('addPatient', function () {
      var apfriStub
      var griStub
      var fakeRequestIterator = {
        get: function () {
          return []
        }
      }
      before(function () {
        griStub = sinon.stub(utils, 'getRequestIterator').returns(fakeRequestIterator)
      })

      beforeEach(function () {
        var fakeConfig = { a: 1 }
        var fakeClient = {
          connect: sinon.stub().callsArg(0),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        apfriStub = sinon.stub(patientCreator, 'addPatientFromRequestIterator').callsArgWith(2, null, 'fakeDWID')
        sinon.stub(patientCreator, 'insertIntoTable').callsArg(2)
      })

      it('delegates to addPatientFromRequestIterator(), constructing the requestIterator from the passed patient info', function () {
        var fakePatientJson = { b: 3 }
        patientCreator.addPatient(fakePatientJson, null, function (err) {
          expect(err).to.be.null
          expect(griStub).to.have.been.calledWith(fakePatientJson)
          expect(apfriStub).to.have.been.calledWith(fakeRequestIterator, null)
        })
      })
    })

    describe('addPatientFromRequestIterator()', function () {
      var guidStub
      var fakeDWID = 'fakeDWID'
      before(function () {
        guidStub = sinon.stub(utils, 'createDWID').returns(fakeDWID)
      })

      after(function () {
        guidStub.restore()
      })

      var ciStub
      var iitStub
      var eptfvStub
      beforeEach(function () {
        var fakeConfig = { a: 1 }
        var fakeClient = {
          connect: sinon.stub().callsArg(0),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        ciStub = sinon.stub(patientCreator, 'createInteraction').callsArg(4)
        iitStub = sinon.stub(patientCreator, 'insertIntoTable').callsArg(2)
        var fakeAttrInfo = {
          table: PatientCreator.insertPholderTableMap['@PATIENT'],
          field: 'fakeFieldName1',
          value: 'fakeValue1',
          pholder: '@PATIENT'
        }
        eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue').returns(fakeAttrInfo)
      })

      it('assigns a condition ID to the interactions if one is passed', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns3', 'fakeIns4']
                    },
                    requestValue: {},
                    requestPath: ''
                  }
                ]
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, 'fakeCondId', function (err, id) {
          var passCondId = ciStub.getCall(0).args[3]
          expect(passCondId).to.equal('fakeCondId')
          done()
        })
      })

      it('generates a condition ID to the interactions if none is passed', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns3', 'fakeIns4']
                    },
                    requestValue: {},
                    requestPath: ''
                  }
                ]
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          var passCondId = ciStub.getCall(0).args[3]
          expect(passCondId).to.equal(fakeDWID)
          done()
        })
      })

      it('generates a patient ID', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          expect(id).to.be.defined
          done()
        })
      })

      it('writes patient attributes that are observations to the observation table', function (done) {
        // We overwrite the a stub to return a fakes observation
        eptfvStub.restore()
        function getFakeObsAttrInfo(n) {
          return {
            table: PatientCreator.insertPholderTableMap['@OBS'],
            field: 'fakeFieldName' + n,
            value: 'fakeValue' + n,
            pholder: '@OBS'
          }
        }
        eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue')
        eptfvStub.onCall(0).returns(getFakeObsAttrInfo(0))
        eptfvStub.onCall(1).returns(getFakeObsAttrInfo(1))
        eptfvStub.onCall(2).returns(getFakeObsAttrInfo(2))
        eptfvStub.onCall(3).returns(getFakeObsAttrInfo(3))
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns1', 'fakeIns2']
                    }
                  }
                ]
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          var tableArg = iitStub.getCall(0).args[0]
          expect(tableArg).to.equal(PatientCreator.insertPholderTableMap['@OBS'][0])
          done()
        })
      })

      it('add an observation column entry for each default insert', function (done) {
        // We overwrite the a stub to return a fakes observation
        eptfvStub.restore()
        function getFakeObsAttrInfo(n) {
          return {
            table: PatientCreator.insertPholderTableMap['@OBS'],
            field: 'fakeFieldName' + n,
            value: 'fakeValue' + n,
            pholder: '@OBS'
          }
        }
        eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue')
        eptfvStub.onCall(0).returns(getFakeObsAttrInfo(0))
        eptfvStub.onCall(1).returns(getFakeObsAttrInfo(1))
        eptfvStub.onCall(2).returns(getFakeObsAttrInfo(2))
        eptfvStub.onCall(3).returns(getFakeObsAttrInfo(3))
        eptfvStub.onCall(4).returns(getFakeObsAttrInfo(4))
        eptfvStub.onCall(5).returns(getFakeObsAttrInfo(5))
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns1', 'fakeIns2', 'fakeIns3']
                    }
                  }
                ]
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          var tableArg = iitStub.getCall(0).args[1]
          var fieldsAdded = Object.keys(tableArg).filter(function (x) {
            return x.match(/fakeFieldName/)
          }).length
          expect(fieldsAdded).to.equal(3)
          done()
        })
      })

      it('writes normal (non-observation) patient attributes to the patient table', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns']
                    }
                  }
                ]
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          var tableArg = iitStub.getCall(0).args[0]
          expect(tableArg).to.equal(PatientCreator.insertPholderTableMap['@PATIENT'][0])
          done()
        })
      })

      it('creates all passed, valid condition interactions', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns1', 'fakeIns2']
                    },
                    requestValue: {},
                    requestPath: ''
                  },
                  {
                    configValue: {
                      defaultInserts: ['fakeIns3', 'fakeIns4']
                    },
                    requestValue: {},
                    requestPath: ''
                  }
                ]
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to handle path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          expect(ciStub).to.have.been.called.twice
          done()
        })
      })

      it('creates all passed, valid non-condition interactions', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = [
                  {
                    configValue: {
                      defaultInserts: ['fakeIns1', 'fakeIns2']
                    },
                    requestValue: {},
                    requestPath: ''
                  },
                  {
                    configValue: {
                      defaultInserts: ['fakeIns3', 'fakeIns4']
                    },
                    requestValue: {},
                    requestPath: ''
                  }
                ]
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          expect(ciStub).to.have.been.called.twice
          done()
        })
      })

      it('passes the generated patient ID to the callback', function (done) {
        var fakeRequestIterator = {
          get: function (path) {
            var result
            switch (path) {
              case 'patient.interactions.*.*':
                result = []
                break
              case 'patient.conditions.*.interactions.*.*':
                result = []
                break
              case 'patient.attributes.*':
                result = []
                break
              default:
                throw new Error('Not set up to hand path ' + path)
            }
            return result
          }
        }
        patientCreator.addPatientFromRequestIterator(fakeRequestIterator, null, function (err, id) {
          expect(err).to.be.null
          expect(id).to.equal(fakeDWID)
          done()
        })
      })
    })

    describe('addInteraction()', function () {
      var oldMap
      before(function () {
        PatientCreator.insertPholderTableMap = {
          '@PATIENT': ['fakePatientTable'],
          '@INTERACTION': ['fakeinteractionTable'],
          '@CODE': ['fakeCodeTable'],
          '@MEASURE': ['fakeMeasureTable'],
          '@OBS': ['fakeObsTable'],
          '@TEXT': ['fakeTextTable']
        }
      })

      after(function () {
        PatientCreator.insertPholderTableMap = oldMap
      })

      var iitStub
      var ciaStub
      var fakeInteraction
      var fakeRequestIterator
      beforeEach(function () {
        var fakeConfig = { a: 1 }
        var fakeClient = {
          connect: sinon.stub().callsArg(0),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        ciaStub = sinon.stub(patientCreator, 'createInteractionAttribute').callsArg(2)
        iitStub = sinon.stub(patientCreator, 'insertIntoTable').callsArg(2)
        var fakeAttrInfo1 = {
          table: 'fakeTable1',
          field: 'fakeFieldName1',
          value: 'fakeValue1',
          pholder: 'fakePholder1'
        }
        var fakeAttrInfo2 = {
          table: 'fakeTable2',
          field: 'fakeFieldName2',
          value: 'fakeValue2',
          pholder: 'fakePholder2'
        }
        var eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue')
        eptfvStub.onCall(0).returns(fakeAttrInfo1)
        eptfvStub.onCall(1).returns(fakeAttrInfo2)
        fakeInteraction = {
          configValue: {
            defaultInserts: ['fakeIns1', 'fakeIns2']
          },
          requestValue: {},
          requestPath: ''
        }
        fakeRequestIterator = {
          get: sinon.stub().returns([{ a: 1 }, { a: 2 }])
        }
      })

      it('adds an interaction ID', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr.DWID).not.to.be.null
          done()
        })
      })

      it('sets the condition ID if one is passed', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', 'fakeCondId', function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr.DWID_Condition).to.equal('fakeCondId')
          done()
        })
      })

      it('does not add a condition ID if none is passed', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr.DWID_Condition).not.to.be.defined
          done()
        })
      })

      it('adds a field for every default insert', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr).to.contain.keys('fakeFieldName1', 'fakeFieldName2')
          done()
        })
      })

      it('adds the field PeriodStart is a start value is given', function (done) {
        fakeInteraction.requestValue._start = 'fakeDate'
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr.PeriodStart).to.equal('fakeDate')
          done()
        })
      })

      it('adds the field PeriodEnd is a end value is given', function (done) {
        fakeInteraction.requestValue._end = 'fakeDate'
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var attr = iitStub.getCall(0).args[1]
          expect(attr.PeriodEnd).to.equal('fakeDate')
          done()
        })
      })

      it('inserts the interaction into the table given by the @INTERACTION placeholder', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          var table = iitStub.getCall(0).args[0]
          expect(table).to.equal('fakeinteractionTable')
          done()
        })
      })

      it('inserts each associated attribute', function (done) {
        patientCreator.createInteraction(fakeRequestIterator, fakeInteraction, '1', null, function (err) {
          expect(err).not.to.be.defined
          expect(ciaStub).to.have.been.called.twice
          expect(ciaStub).to.have.been.calledWith({ a: 1 })
          expect(ciaStub).to.have.been.calledWith({ a: 2 })
          done()
        })
      })
    })

    describe('addInteractionAttributes()', function () {
      var iitStub
      beforeEach(function () {
        var fakeConfig = { a: 1 }
        var fakeClient = {
          connect: sinon.stub().callsArg(0),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
        var fakeJsonData = {
          a: '1',
          c: '45.6',
          b: 'something'
        }
        iitStub = sinon.stub(patientCreator, 'insertIntoTable').callsArgWith(2, 'fakeTable', fakeJsonData)
      })

      it('does not insert everything if we do not find a table ', function (done) {
        var fakeAttrInfo = {
          field: 'fakeFieldName',
          value: 'fakeValue',
          pholder: 'fakePholder'
        }
        sinon.stub(patientCreator, 'extractPholderTableFieldValue').returns(fakeAttrInfo)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          expect(iitStub).not.to.have.been.called
          done()
        })
      })

      it('inserts data into the correct tables if a table is found', function (done) {
        var fakeAttrInfo = {
          table: 'fakeTable',
          field: 'fakeFieldName',
          value: 'fakeValue',
          pholder: 'fakePholder'
        }
        sinon.stub(patientCreator, 'extractPholderTableFieldValue').returns(fakeAttrInfo)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          expect(iitStub).to.have.been.calledWith('fakeTable')
          done()
        })
      })

      it('insert default values for the DW fields in the table', function (done) {
        var fakeAttrInfo = {
          table: 'fakeTable',
          field: 'fakeFieldName',
          value: 'fakeValue',
          pholder: 'fakePholder'
        }
        sinon.stub(patientCreator, 'extractPholderTableFieldValue').returns(fakeAttrInfo)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          var passedAttrData = iitStub.getCall(0).args[1]
          expect(passedAttrData).to.contain.all.keys('DWID', 'DWDateFrom', 'DWDateTo', 'DWAuditID')
          done()
        })
      })

      it('appends any default insert fields to the attribute JSON passed', function (done) {
        var fakeAttrInfo1 = {
          table: 'fakeTable1',
          field: 'fakeFieldName1',
          value: 'fakeValue1',
          pholder: 'fakePholder1'
        }
        var fakeAttrInfo2 = {
          table: 'fakeTable2',
          field: 'fakeFieldName2',
          value: 'fakeValue2',
          pholder: 'fakePholder2'
        }
        var eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue')
        eptfvStub.onCall(0).returns(fakeAttrInfo1)
        eptfvStub.onCall(1).returns(fakeAttrInfo2)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns1', 'fakeIns2']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          var passedAttrData = iitStub.getCall(0).args[1]
          expect(passedAttrData).to.contain.all.keys('fakeFieldName1', 'fakeFieldName2')
          done()
        })
      })

      it('sets the output table to the value found in the placeholder', function (done) {
        var fakeAttrInfo = {
          table: 'fakeTable',
          field: 'fakeFieldName',
          value: 'fakeValue',
          pholder: 'fakePholder'
        }
        var eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue').returns(fakeAttrInfo)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns1', 'fakeIns2']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          expect(eptfvStub).to.have.been.called.twice
          expect(eptfvStub).to.have.been.calledWith('fakeIns1')
          expect(eptfvStub).to.have.been.calledWith('fakeIns2')
          done()
        })
      })

      it('only writes to the last table found, if multiple are given', function (done) {
        var fakeAttrInfo1 = {
          table: 'fakeTable1',
          field: 'fakeFieldName1',
          value: 'fakeValue1',
          pholder: 'fakePholder1'
        }
        var fakeAttrInfo2 = {
          table: 'fakeTable2',
          field: 'fakeFieldName2',
          value: 'fakeValue2',
          pholder: 'fakePholder2'
        }
        var eptfvStub = sinon.stub(patientCreator, 'extractPholderTableFieldValue')
        eptfvStub.onCall(0).returns(fakeAttrInfo1)
        eptfvStub.onCall(1).returns(fakeAttrInfo2)
        var fakeDWID = 'fakeDWID'
        var fakeAttr = {
          configValue: {
            defaultInserts: ['fakeIns1', 'fakeIns2']
          }
        }
        patientCreator.createInteractionAttribute(fakeAttr, fakeDWID, function (err) {
          expect(err).not.to.be.defined
          expect(iitStub).to.have.been.calledWith('fakeTable2')
          expect(iitStub).not.to.have.been.calledWith('fakeTable1')
          done()
        })
      })
    })

    describe('executeSqlCommand()', function () {
      var fakeClient
      var fakeConfig = { a: 1 }
      var testRows = [{ a: 1 }, { 2: 1 }]

      beforeEach(function () {
        fakeClient = {
          connect: sinon.stub().callsArg(0),
          exec: sinon.stub().callsArgWith(1, null, testRows),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
      })

      it('execute the passed SQL via the client exec() function', function (done) {
        patientCreator.executeSqlCommand('FAKE SQL', function () {
          expect(fakeClient.exec).to.have.been.calledWith('FAKE SQL')
          done()
        })
      })

      it('passes the returned rows to the passed callback', function (done) {
        patientCreator.executeSqlCommand('FAKE SQL', function (err, rows) {
          expect(err).to.be.null
          expect(rows).to.eql(testRows)
          done()
        })
      })
    })

    describe('executeSqlStatement()', function () {
      var fakeClient
      var fakeConfig = { a: 1 }
      var testRows = [{ a: 1 }, { 2: 1 }]
      var fakeStmt = {
        exec: sinon.stub().callsArgWith(1, null, testRows)
      }
      beforeEach(function () {
        fakeClient = {
          connect: sinon.stub().callsArg(0),
          prepare: sinon.stub().callsArgWith(1, null, fakeStmt),
          end: sinon.stub()
        }
        patientCreator = new PatientCreator('fakeSchema', fakeClient, fakeConfig)
      })

      it('sets up a prepared statment with the passed SQL', function (done) {
        patientCreator.executeSqlStatement('FAKE SQL', {}, function () {
          expect(fakeClient.prepare).to.have.been.calledWith('FAKE SQL')
          done()
        })
      })

      it('passes the parameters to the prepared statement', function (done) {
        var fakeParams = ['a', 1]
        patientCreator.executeSqlStatement('FAKE SQL', fakeParams, function () {
          expect(fakeStmt.exec).to.have.been.calledWith(fakeParams)
          done()
        })
      })

      it('passes the returned rows to the passed callback', function (done) {
        patientCreator.executeSqlStatement('FAKE SQL', {}, function (err, rows) {
          expect(err).to.be.null
          expect(rows).to.eql(testRows)
          done()
        })
      })
    })
  })
})()
