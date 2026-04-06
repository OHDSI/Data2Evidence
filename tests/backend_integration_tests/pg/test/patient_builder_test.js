/* eslint-env node */

/**
 * Test suite for the patient builder
 */
/* eslint-disable no-unused-expressions */

;(function () {
  'use strict'

  var chai = require('chai')
  var expect = chai.expect
  var sinon = require('sinon')
  var sinonChai = require('sinon-chai')
  chai.use(sinonChai)

  var PatientBuilder = require('../lib/patient_builder')

  describe('PatientBuilder', function () {
    var patientBuilder
    beforeEach(function () {
      patientBuilder = new PatientBuilder()
    })

    describe('patient()', function () {
      it('starts a new patient', function () {
        patientBuilder.patient()
        var jsonResult = patientBuilder.buildJson()
        expect(jsonResult.patient).to.exist
      })

      it('resets the interaction counters', function () {
        patientBuilder.patient().interaction('someInteraction').attribute('someAttribute')
        patientBuilder.patient().interaction('someInteraction').attribute('someAttribute')
        var jsonResult = patientBuilder.buildJson()
        expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
        expect(jsonResult.patient.interactions.someInteraction['2']).not.to.exist
      })
    })

    describe('attribute()', function () {
      describe('called after patient()', function () {
        it('adds a new attribute of the specified type', function () {
          patientBuilder.patient().attribute('someAttribute')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.attributes.someAttribute).to.exist
        })

        it('sets the attribute value to the specified value', function () {
          patientBuilder.patient().attribute('someAttribute', 'someValue')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.attributes.someAttribute).to.equal('someValue')
        })
      })

      describe('called after attribute() at the patient level', function () {
        it('adds a new attribute of the specified type, if type is new', function () {
          patientBuilder.patient().attribute('someAttribute1', 'value1').attribute('someAttribute2', 'value2')
          var jsonResult = patientBuilder.buildJson()
          var expectJson = {
            patient: {
              attributes: {
                someAttribute1: 'value1',
                someAttribute2: 'value2'
              }
            }
          }
          expect(jsonResult).to.eql(expectJson)
        })

        it('overwrites existing values if the attribute has already been used', function () {
          patientBuilder.patient().attribute('someAttribute', 'someValue1').attribute('someAttribute', 'someValue2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.attributes.someAttribute).to.equal('someValue2')
        })
      })

      describe('called after interaction() at the patient level', function () {
        it('adds a new attribute of the specified type to the preceding interaction', function () {
          patientBuilder.patient().interaction('someInteraction').attribute('someAttribute')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1'].attributes.someAttribute).to.exist
        })

        it('sets the attribute value to the specified value', function () {
          patientBuilder.patient().interaction('someInteraction').attribute('someAttribute', 'someValue')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1'].attributes.someAttribute).to.equal('someValue')
        })
      })

      describe('called after attribute() at the patient interaction level', function () {
        it('adds a new attribute of the specified type to the preceding interaction, if new', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .attribute('someAttribute1', 'value1')
            .attribute('someAttribute2', 'value2')
          var jsonResult = patientBuilder.buildJson()
          var expectJson = {
            patient: {
              interactions: {
                someInteraction: {
                  1: {
                    attributes: {
                      someAttribute1: 'value1',
                      someAttribute2: 'value2'
                    }
                  }
                }
              }
            }
          }
          expect(jsonResult).to.eql(expectJson)
        })

        it('overwrites existing values if called for an attribute type that was already called', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .attribute('someAttribute', 'someValue1')
            .attribute('someAttribute', 'someValue2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1'].attributes.someAttribute).to.equal('someValue2')
        })
      })

      describe('called after condition()', function () {
        it('throws an error', function () {
          var testFunc = function () {
            patientBuilder.patient().condition('someCondition').attribute('someAttribute', 'someValue1')
          }
          expect(testFunc).to.throw(Error)
        })
      })

      describe('called after interaction() at the condition level', function () {
        it('adds a new attribute of the specified type to the preceding condition interaction', function () {
          patientBuilder.patient().condition('someCondition').interaction('someInteraction').attribute('someAttribute')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1'].attributes.someAttribute)
            .to.exist
        })

        it('sets the attribute value to the specified value', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute', 'someValue')
          var jsonResult = patientBuilder.buildJson()
          expect(
            jsonResult.patient.conditions.someCondition.interactions.someInteraction['1'].attributes.someAttribute
          ).to.equal('someValue')
        })
      })

      describe('called after attribute() at the condition interaction level', function () {
        it('adds a new attribute of the specified type to the preceding interaction, if new', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute1', 'value1')
            .attribute('someAttribute2', 'value2')
          var jsonResult = patientBuilder.buildJson()
          var expectJson = {
            patient: {
              conditions: {
                someCondition: {
                  interactions: {
                    someInteraction: {
                      1: {
                        attributes: {
                          someAttribute1: 'value1',
                          someAttribute2: 'value2'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          expect(jsonResult).to.eql(expectJson)
        })

        it('overwrites existing values if called for an attribute type that was already called', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute', 'someValue1')
            .attribute('someAttribute', 'someValue2')
          var jsonResult = patientBuilder.buildJson()
          expect(
            jsonResult.patient.conditions.someCondition.interactions.someInteraction['1'].attributes.someAttribute
          ).to.equal('someValue2')
        })
      })
    })

    describe('interaction()', function () {
      it('requires neither a start nor an end time', function () {
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction')
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('accepts a start time in the ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)', function () {
        var dateString = '2000-06-20T08:03:10.087Z'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('does not accept a start time that is a non-UTC timestamp format', function () {
        var dateString = '2000-07-20T08:03:10.087+02:00'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString)
        }
        expect(testFunc).to.throw(Error)
      })

      it('forwards a start time in the ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ) to the backend unchanged', function () {
        var dateString = '2000-06-20T08:03:10.087Z'
        patientBuilder.patient().interaction('someInteraction', dateString)
        var jsonResult = patientBuilder.buildJson()
        expect(jsonResult.patient.interactions.someInteraction['1']._start).to.equal(dateString)
      })

      it('accepts a start time in the ISO date format YYYY-MM-DD', function () {
        var dateString = '2000-06-20'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('forwards a start time in the format YYYY-MM-DD to the backend as the first possible UTC timestamp on that date', function () {
        var dateString = '2000-06-20'
        patientBuilder.patient().interaction('someInteraction', dateString)
        var jsonResult = patientBuilder.buildJson()
        var expectedDateString = '2000-06-20T00:00:00.000Z'
        expect(jsonResult.patient.interactions.someInteraction['1']._start).to.equal(expectedDateString)
      })

      it('accepts an end time in the ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)', function () {
        var dateString1 = '2000-06-20T08:03:10.087Z'
        var dateString2 = '2000-07-20T08:03:10.087Z'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('does not accept an end time that is a non-UTC timestamp format', function () {
        var dateString1 = '2000-06-20T08:03:10.087Z'
        var dateString2 = '2000-07-20T08:03:10.087+02:00'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        }
        expect(testFunc).to.throw(Error)
      })

      it('forwards an end time in the ISO 8601 UTC timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ) to the backend unchanged', function () {
        var dateString1 = '2000-06-20T08:03:10.087Z'
        var dateString2 = '2000-07-20T08:03:10.087Z'
        patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        var jsonResult = patientBuilder.buildJson()
        expect(jsonResult.patient.interactions.someInteraction['1']._end).to.equal(dateString2)
      })

      it('accepts an end time in the format YYYY-MM-DD', function () {
        var dateString1 = '2000-06-20T08:03:10.087Z'
        var dateString2 = '2000-07-20'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('forwards a start time in the format YYYY-MM-DD to the backend as the first possible UTC timestamp on that date', function () {
        var dateString1 = '2000-06-20T08:03:10.087Z'
        var dateString2 = '2000-07-20'
        patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        var jsonResult = patientBuilder.buildJson()
        var expectedDateString = '2000-07-20T00:00:00.000Z'
        expect(jsonResult.patient.interactions.someInteraction['1']._end).to.equal(expectedDateString)
      })

      it('allows an end time even if the start time is undefined ', function () {
        var dateString = '2000-06-20T08:03:10.087Z'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', undefined, dateString)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('allows an end time even if the start time is null ', function () {
        var dateString = '2000-06-20T08:03:10.087Z'
        var testFunc = function () {
          patientBuilder.patient().interaction('someInteraction', null, dateString)
        }
        expect(testFunc).not.to.throw(Error)
      })

      it('throws an error if the start time is after the end time', function () {
        var dateString1 = '2000-07-20T08:03:10.087Z'
        var dateString2 = '2000-06-20T08:03:10.087Z'
        var failFunc = function () {
          patientBuilder.patient().interaction('someInteraction', dateString1, dateString2)
        }
        expect(failFunc).to.throw(Error)
      })

      describe('called after patient()', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder.patient().interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
        })
      })

      describe('called after attribute() at the patient level', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder.patient().attribute('someAttribute', 'someValue1').interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
        })
      })

      describe('called after attribute() at the patient interaction level', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction1')
            .attribute('someAttribute', 'someValue1')
            .interaction('someInteraction2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction2['1']).to.exist
        })

        it('numbers repeated instances of the same interaction type by order of addition', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .attribute('someAttribute', 'someValue1')
            .interaction('someInteraction')
            .attribute('someAttribute', 'someValue1')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.interactions.someInteraction['2']).to.exist
          expect(jsonResult.patient.interactions.someInteraction['3']).to.exist
        })
      })

      describe('called after interaction() at the patient level', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder.patient().interaction('someInteraction1').interaction('someInteraction2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction2['1']).to.exist
        })

        it('numbers repeated instances of the same interaction type by order of addition', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .interaction('someInteraction')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.interactions.someInteraction['2']).to.exist
          expect(jsonResult.patient.interactions.someInteraction['3']).to.exist
        })
      })

      describe('called after condition()', function () {
        it('adds a new condition interaction (no. 1) of the specified type', function () {
          patientBuilder.patient().condition('someCondition').interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1']).to.exist
        })

        it('numbers repeated instances of the same interaction type by order of addition', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .interaction('someInteraction')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['2']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['3']).to.exist
        })
      })

      describe('called after interaction() at the condition level', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction1')
            .interaction('someInteraction2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction2['1']).to.exist
        })

        it('numbers repeated instances of the same interaction type by order of addition', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .interaction('someInteraction')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['2']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['3']).to.exist
        })

        it('independently numbers patient and condition interactions with identical names', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .condition('someCondition')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1']).to.exist
        })
      })

      describe('called after attribute() at the condition interaction level', function () {
        it('adds a new interaction (no. 1) of the specified type', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction1')
            .attribute('someAttribute', 'someValue')
            .interaction('someInteraction2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction2['1']).to.exist
        })

        it('numbers repeated instances of the same interaction type by order of addition', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute1', 'someValue1')
            .interaction('someInteraction')
            .attribute('someAttribute2', 'someValue2')
            .interaction('someInteraction')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['1']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['2']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction['3']).to.exist
        })

        it('independently numbers patient and condition interactions with identical names', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction1')
            .condition('someCondition')
            .interaction('someInteraction2')
            .attribute('someAttribute', 'someValue')
            .interaction('someInteraction1')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.interactions.someInteraction1['1']).to.exist
          expect(jsonResult.patient.conditions.someCondition.interactions.someInteraction1['1']).to.exist
        })
      })
    })

    describe('condition()', function () {
      describe('called after patient()', function () {
        it('adds a new condition of the specified type', function () {
          patientBuilder.patient().condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.exist
        })
      })

      describe('called after attribute() at the patient level', function () {
        it('adds a new condition of the specified type', function () {
          patientBuilder.patient().attribute('someAttribute', { a: 1 }).condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.exist
        })
      })

      describe('called after interaction() at the patient level', function () {
        it('adds a new condition of the specified type', function () {
          patientBuilder.patient().interaction('someInteraction').condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.exist
        })
      })

      describe('called after attribute() at the patient interaction level', function () {
        it('adds a new condition of the specified type', function () {
          patientBuilder
            .patient()
            .interaction('someInteraction')
            .attribute('someAttribute', { a: 1 })
            .condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.exist
        })
      })

      describe('called after condition()', function () {
        it('adds a new condition of the specified type, if new', function () {
          patientBuilder.patient().condition('someCondition1').condition('someCondition2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition2).to.exist
        })

        it('overwrites the existing condition with a new, empty one if the condition type has been added before', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute', { a: 1 })
            .condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.eql({})
        })
      })

      describe('called after interaction() at the condition level', function () {
        it('adds a new condition of the specified type, if new', function () {
          patientBuilder
            .patient()
            .condition('someCondition1')
            .interaction('someInteraction')
            .condition('someCondition2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition2).to.exist
        })
      })

      describe('called after attribute() at the condition interaction level', function () {
        it('adds a new condition of the specified type, if new', function () {
          patientBuilder
            .patient()
            .condition('someCondition1')
            .interaction('someInteraction')
            .attribute('someAttribute', { a: 1 })
            .condition('someCondition2')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition2).to.exist
        })

        it('overwrites the existing condition with a new, empty one if the condition type has been added before', function () {
          patientBuilder
            .patient()
            .condition('someCondition')
            .interaction('someInteraction')
            .attribute('someAttribute', { a: 1 })
            .condition('someCondition')
          var jsonResult = patientBuilder.buildJson()
          expect(jsonResult.patient.conditions.someCondition).to.eql({})
        })
      })
    })

    describe('add()', function () {
      it('adds the current patient to the current patients set', function () {
        patientBuilder.patient().attribute('someAttribute', 'someValue1').add()
        patientBuilder.patient().attribute('someAttribute', 'someValue2').add()
        var jsonResultArray = patientBuilder.buildJsonArray()
        expect(jsonResultArray.length).to.equal(2)
      })

      it('clears the current patient', function () {
        patientBuilder.patient().attribute('someAttribute', 'someValue1').add()
        var jsonResult = patientBuilder.patient().buildJson()
        expect(jsonResult).to.eql({ patient: {} })
      })
    })

    describe('persistAll()', function () {
      it('calls the patient creator addPatient-method for each patient', function (done) {
        var patientCreatorStub = {
          addPatient: sinon.stub().callsArgWith(2, null)
        }
        patientBuilder.patient().attribute('someAttribute', 'someValue1').add()
        patientBuilder.patient().attribute('someAttribute', 'someValue2').add()
        patientBuilder.patient().attribute('someAttribute', 'someValue3').add()
        patientBuilder.persistAll(patientCreatorStub, function (err) {
          var patientJsonsPassed = [0, 1, 2].map(function (i) {
            return patientCreatorStub.addPatient.getCall(i).args[0]
          })
          patientJsonsPassed.sort(function (a, b) {
            a.patient.attributes.someAttribute.localeCompare(b.patient.attributes.someAttribute)
          })
          var expectedArr = [0, 1, 2].map(function (i) {
            return {
              patient: {
                attributes: {
                  someAttribute: 'someValue' + (i + 1)
                }
              }
            }
          })
          expect(patientJsonsPassed).to.eql(expectedArr)
          done()
        })
      })
    })
  })
})()
