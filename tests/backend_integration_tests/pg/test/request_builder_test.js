/* eslint-env node */

/**
 * Test suite for the request builder
 */
/* eslint-disable no-unused-expressions */

;(function () {
  'use strict'

  var fs = require('fs')
  var chai = require('chai')
  var expect = chai.expect
  var sinon = require('sinon')
  var sinonChai = require('sinon-chai')
  chai.use(sinonChai)

  var RequestBuilder = require('../lib/request_builder')

  describe('RequestBuilder', function () {
    var requestBuilder
    var fakeConfigMetaData
    var fakeMriConfig = JSON.parse(fs.readFileSync(__dirname + '/test_mri_config.json'))
    beforeEach(function () {
      // Reset stubs before each test
      fakeConfigMetaData = {
        configId: 'ABCDEF123456',
        configVersion: 'A'
      }
    })

    it('includes the passed config metadata in the generated request', function () {
      requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
      var jsonResult = requestBuilder.request().buildJson()
      expect(jsonResult[0].configData).to.eql(fakeConfigMetaData)
    })

    it('correctly handles even very complex filters', function () {
      requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
      requestBuilder
        .request()
        .matchall()
        .basicdata()
        .attribute('lastName', { op: '=', value: 'Doe' })
        .attribute('pcount')
        .filtercard('patient_interaction_1')
        .attribute('char_attr', { op: '=', value: 'A' })
        .filtercard('cond_a_interaction_1', 'CaI1')
        .filtercard('cond_a_interaction_2', 'CaI2')
        .absolutetime({
          and: [
            { op: '>=', value: '20100101', type: 'abstime' },
            { op: '<=', value: '20101231', type: 'abstime' }
          ]
        })
        .filtercard('cond_a_interaction_2')
        .exclude()
        .attribute('char_attr', { op: '=', value: 'B' })
        .relativetime('isSucceededBy', 'CaI1', 'CaI2', {
          and: [
            { op: '>=', value: 10 },
            { op: '<', value: 100 }
          ]
        })
        .matchany()
        .filtercard('cond_a_interaction_2')
        .attribute('num_attr', { op: '=', value: 10 })
        .filtercard('cond_b_interaction_1')
        .attribute('char_attr', { op: '=', value: 'C' })
        .chart()
        .xaxis('CaI1', 'char_attr', 1)
        .yaxis('basicdata', 'pcount', 1)

      var expectedJson = [
        {
          patient: {
            isFiltercard: true,
            attributes: {
              lastName: [
                {
                  filter: [
                    {
                      op: '=',
                      value: 'Doe'
                    }
                  ]
                }
              ],
              pcount: [
                {
                  yaxis: 1
                }
              ]
            },
            conditions: {
              condition_a: {
                interactions: {
                  cond_a_interaction_1: {
                    1: {
                      isFiltercard: true,
                      attributes: {
                        char_attr: [
                          {
                            xaxis: 1
                          }
                        ],
                        _succ: [
                          {
                            value: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1',
                            filter: [
                              {
                                and: [
                                  {
                                    op: '>=',
                                    value: 10
                                  },
                                  {
                                    op: '<',
                                    value: 100
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  cond_a_interaction_2: {
                    1: {
                      isFiltercard: true,
                      attributes: {
                        _absTime: [
                          {
                            filter: [
                              {
                                and: [
                                  {
                                    op: '>=',
                                    value: '20100101',
                                    type: 'abstime'
                                  },
                                  {
                                    op: '<=',
                                    value: '20101231',
                                    type: 'abstime'
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    },
                    2: {
                      isFiltercard: true,
                      attributes: {
                        char_attr: [
                          {
                            filter: [
                              {
                                op: '=',
                                value: 'B'
                              }
                            ]
                          }
                        ]
                      },
                      exclude: true
                    },
                    3: {
                      isFiltercard: true,
                      attributes: {
                        num_attr: [
                          {
                            filter: [
                              {
                                op: '=',
                                value: 10
                              }
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            interactions: {
              patient_interaction_1: {
                1: {
                  isFiltercard: true,
                  attributes: {
                    char_attr: [
                      {
                        filter: [
                          {
                            op: '=',
                            value: 'A'
                          }
                        ]
                      }
                    ]
                  }
                }
              }
            }
          },
          configData: fakeConfigMetaData
        },
        {
          patient: {
            isFiltercard: true,
            attributes: {
              lastName: [
                {
                  filter: [
                    {
                      op: '=',
                      value: 'Doe'
                    }
                  ]
                }
              ],
              pcount: [
                {
                  yaxis: 1
                }
              ]
            },
            conditions: {
              condition_b: {
                interactions: {
                  cond_b_interaction_1: {
                    1: {
                      isFiltercard: true,
                      attributes: {
                        char_attr: [
                          {
                            filter: [
                              {
                                op: '=',
                                value: 'C'
                              }
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              },
              condition_a: {
                interactions: {
                  cond_a_interaction_1: {
                    1: {
                      isFiltercard: true,
                      attributes: {
                        char_attr: [
                          {
                            xaxis: 1
                          }
                        ],
                        _succ: [
                          {
                            value: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1',
                            filter: [
                              {
                                and: [
                                  {
                                    op: '>=',
                                    value: 10
                                  },
                                  {
                                    op: '<',
                                    value: 100
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  cond_a_interaction_2: {
                    1: {
                      isFiltercard: true,
                      attributes: {
                        _absTime: [
                          {
                            filter: [
                              {
                                and: [
                                  {
                                    op: '>=',
                                    value: '20100101',
                                    type: 'abstime'
                                  },
                                  {
                                    op: '<=',
                                    value: '20101231',
                                    type: 'abstime'
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    },
                    2: {
                      isFiltercard: true,
                      attributes: {
                        char_attr: [
                          {
                            filter: [
                              {
                                op: '=',
                                value: 'B'
                              }
                            ]
                          }
                        ]
                      },
                      exclude: true
                    }
                  }
                }
              }
            },
            interactions: {
              patient_interaction_1: {
                1: {
                  isFiltercard: true,
                  attributes: {
                    char_attr: [
                      {
                        filter: [
                          {
                            op: '=',
                            value: 'A'
                          }
                        ]
                      }
                    ]
                  }
                }
              }
            }
          },
          configData: fakeConfigMetaData
        }
      ]
      var jsonResult = requestBuilder.buildJson()
      expect(jsonResult).to.eql(expectedJson)
    })

    it('correctly handles even very complex filters - IFR', function () {
      requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
      requestBuilder
        .request()
        .matchall()
        .basicdata()
        .attribute('lastName', { op: '=', value: 'Doe' })
        .attribute('pcount')
        .filtercard('patient_interaction_1')
        .attribute('char_attr', { op: '=', value: 'A' })
        .filtercard('cond_a_interaction_1', 'CaI1')
        .filtercard('cond_a_interaction_2', 'CaI2')
        .absolutetime({
          and: [
            { op: '>=', value: '20100101', type: 'abstime' },
            { op: '<=', value: '20101231', type: 'abstime' }
          ]
        })
        .filtercard('cond_a_interaction_2')
        .exclude()
        .attribute('char_attr', { op: '=', value: 'B' })
        .relativetime('isSucceededBy', 'CaI1', 'CaI2', {
          and: [
            { op: '>=', value: 10 },
            { op: '<', value: 100 }
          ]
        })
        .matchany()
        .filtercard('cond_a_interaction_2')
        .attribute('num_attr', { op: '=', value: 10 })
        .filtercard('cond_b_interaction_1')
        .attribute('char_attr', { op: '=', value: 'C' })
        .chart()
        .xaxis('CaI1', 'char_attr', 1)
        .yaxis('basicdata', 'pcount', 1)

      var expectedJson = {
        configData: {
          configId: 'ABCDEF123456',
          configVersion: 'A'
        },
        axes: [
          {
            instanceID: 'patient',
            configPath: 'patient',
            id: 'patient.attributes.pcount',
            axis: 'y',
            seq: 1
          },
          {
            instanceID: 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1',
            configPath: 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1',
            id: 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.char_attr',
            axis: 'x',
            seq: 1
          }
        ],
        cards: {
          content: [
            {
              content: [
                {
                  _configPath: 'patient',
                  _instanceNumber: 0,
                  _instanceID: 'patient',
                  _attributes: {
                    content: [
                      {
                        _configPath: 'patient.attributes.lastName',
                        _instanceID: 'patient.attributes.lastName',
                        _constraints: {
                          content: [
                            {
                              _operator: '=',
                              _value: 'Doe'
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  _configPath: 'patient.conditions.condition_a.interactions.cond_a_interaction_1',
                  _instanceNumber: 1,
                  _instanceID: 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1',
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.char_attr',
                        _instanceID:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.char_attr',
                        _constraints: {
                          content: []
                        }
                      }
                    ]
                  },
                  _successor: {
                    id: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1',
                    minDaysBetween: 10,
                    maxDaysBetween: 100
                  }
                },
                {
                  _configPath: 'patient.conditions.condition_a.interactions.cond_a_interaction_2',
                  _instanceNumber: 1,
                  _instanceID: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1',
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_2.1.attributes._absTime',
                        _instanceID:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_2.1.attributes._absTime',
                        _constraints: {
                          content: [
                            {
                              content: [
                                {
                                  _operator: '>=',
                                  _value: '20100101'
                                },
                                {
                                  _operator: '<=',
                                  _value: '20101231'
                                }
                              ]
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  content: [
                    {
                      _configPath: 'patient.conditions.condition_a.interactions.cond_a_interaction_2',
                      _instanceNumber: 2,
                      _instanceID: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.2',
                      _attributes: {
                        content: [
                          {
                            _configPath:
                              'patient.conditions.condition_a.interactions.cond_a_interaction_2.2.attributes.char_attr',
                            _instanceID:
                              'patient.conditions.condition_a.interactions.cond_a_interaction_2.2.attributes.char_attr',
                            _constraints: {
                              content: [
                                {
                                  _operator: '=',
                                  _value: 'B'
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            },
            {
              content: [
                {
                  _configPath: 'patient.conditions.condition_a.interactions.cond_a_interaction_2',
                  _instanceNumber: 3,
                  _instanceID: 'patient.conditions.condition_a.interactions.cond_a_interaction_2.3',
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_2.3.attributes.num_attr',
                        _instanceID:
                          'patient.conditions.condition_a.interactions.cond_a_interaction_2.3.attributes.num_attr',
                        _constraints: {
                          content: [
                            {
                              _operator: '=',
                              _value: 10
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  _configPath: 'patient.interactions.patient_interaction_1',
                  _instanceNumber: 1,
                  _instanceID: 'patient.interactions.patient_interaction_1.1',
                  _attributes: {
                    content: [
                      {
                        _configPath: 'patient.interactions.patient_interaction_1.1.attributes.char_attr',
                        _instanceID: 'patient.interactions.patient_interaction_1.1.attributes.char_attr',
                        _constraints: {
                          content: [
                            {
                              _operator: '=',
                              _value: 'A'
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  _configPath: 'patient.conditions.condition_b.interactions.cond_b_interaction_1',
                  _instanceNumber: 1,
                  _instanceID: 'patient.conditions.condition_b.interactions.cond_b_interaction_1.1',
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          'patient.conditions.condition_b.interactions.cond_b_interaction_1.1.attributes.char_attr',
                        _instanceID:
                          'patient.conditions.condition_b.interactions.cond_b_interaction_1.1.attributes.char_attr',
                        _constraints: {
                          content: [
                            {
                              _operator: '=',
                              _value: 'C'
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  _configPath: 'patient.interactions.patient_interaction_1',
                  _instanceNumber: 1,
                  _instanceID: 'patient.interactions.patient_interaction_1.1',
                  _attributes: {
                    content: [
                      {
                        _configPath: 'patient.interactions.patient_interaction_1.1.attributes.char_attr',
                        _instanceID: 'patient.interactions.patient_interaction_1.1.attributes.char_attr',
                        _constraints: {
                          content: [
                            {
                              _operator: '=',
                              _value: 'A'
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }

      var jsonResult = requestBuilder.buildIFR()
      expect(jsonResult).to.eql(expectedJson)
    })

    describe('constructor', function () {
      it('throws an error if no MRI configuration is given', function () {
        var testFunc = function () {
          new RequestBuilder(fakeConfigMetaData)
        }
        expect(testFunc).to.throw(Error)
      })
    })

    describe('request()', function () {
      it('starts a new request with isFiltercard = true', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request()
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].patient).to.exist
        expect(jsonResult[0].patient.isFiltercard).to.be.true
      })

      it('starts a new request with property cards - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request()
        var jsonResult = requestBuilder.buildIFR()
        expect(jsonResult.cards.content).to.exist
        expect(jsonResult.cards.content.length).to.equal(2)
      })

      it('resets the filtercard counters', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1')
        requestBuilder.request().filtercard('patient_interaction_1')
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
        expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).not.to.exist
      })

      it('resets the filtercard counters - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1')
        requestBuilder.request().filtercard('patient_interaction_1')
        var jsonResult = requestBuilder.buildIFR()
        expect(jsonResult.cards.content[0].content.length).to.equal(1)
        expect(jsonResult.cards.content[0].content[0]._instanceID).to.equal(
          'patient.interactions.patient_interaction_1.1'
        )
      })
    })

    describe('guarded()', function () {
      it('set the guarded property to true', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().guarded()
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].guarded).to.be.true
      })
    })

    describe('guarded()', function () {
      it('set the guarded property to true', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().guarded()
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].guarded).to.be.true
      })

      it('set the guarded property to true - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().guarded()
        var jsonResult = requestBuilder.buildIFR()
        expect(jsonResult.guarded).to.be.true
      })
    })

    describe('kmstart()', function () {
      it('throws an error if passed an invalid filtercard tag', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var testFunc = function () {
          requestBuilder.request().filtercard('patient_interaction_1', 'int1').kmstart('notatag')
        }
        expect(testFunc).to.throw(Error)
      })

      it('sets the Kaplan Meier start event to the event represented by the passed filtercard tag', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1', 'int1').kmstart('int1')
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].kmEventIdentifier).to.equal('patient.interactions.patient_interaction_1.1')
      })

      it('sets the Kaplan Meier start event to the event represented by the passed filtercard tag - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1', 'int1').kmstart('int1')
        var jsonResult = requestBuilder.buildIFR()
        expect(jsonResult.kmEventIdentifier).to.equal('patient.interactions.patient_interaction_1.1')
      })
    })

    describe('basicdata()', function () {
      describe('called after request()', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request()
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request()
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after basicdata()', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata()
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().basicdata().basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata()
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().basicdata().basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after attribute() at the basic data level', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('lastName', {})
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().basicdata().attribute('lastName', {}).basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('lastName', {})
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().basicdata().attribute('lastName', {}).basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after filtercard() with a patient interaction (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1')
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().filtercard('patient_interaction_1').basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1')
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().filtercard('patient_interaction_1').basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after filtercard() with a condition interaction', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1')
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().filtercard('cond_a_interaction_1').basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1')
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().filtercard('cond_a_interaction_1').basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after attribute() at the (patient interaction) filtercard level (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('called after attribute() at the (condition interaction) filtercard level', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).basicdata()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).basicdata()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })
    })

    describe('filtercard()', function () {
      it('does not accept "basicdata as a valid tag', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var failFunc = function () {
          requestBuilder.request().filtercard('patient_interaction_1', 'basicdata')
        }
        expect(failFunc).to.throw(Error)
      })

      describe('for a patient interaction (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        describe('called after request()', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            expect(jsonResult.cards.content[0].content[0]._instanceID).to.equal(
              'patient.interactions.patient_interaction_1.1'
            )
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(3)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after basicdata()', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            expect(jsonResult.cards.content[0].content[0]._instanceID).to.equal(
              'patient.interactions.patient_interaction_1.1'
            )
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .filtercard('patient_interaction_1')
              .basicdata()
              .filtercard('patient_interaction_1')
              .basicdata()
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .filtercard('patient_interaction_1')
              .basicdata()
              .filtercard('patient_interaction_1')
              .basicdata()
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(3)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the basic data level', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().attribute('char_attr', {}).filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().attribute('char_attr', {}).filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.interactions.patient_interaction_1.1'
            })

            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .basicdata()
              .attribute('num_attr', {})
              .filtercard('patient_interaction_1')
              .basicdata()
              .attribute('freetext_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .basicdata()
              .attribute('num_attr', {})
              .filtercard('patient_interaction_1')
              .basicdata()
              .attribute('freetext_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(4)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after filtercard() with a patient interaction (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('patient_interaction_1').filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_2['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('patient_interaction_1').filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content

            expect(filtercards.length).to.equal(2)
            var fc2 = filtercards.filter(function (e) {
              return e._instanceID === 'patient.interactions.patient_interaction_2.1'
            })
            expect(fc2.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_2['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_2['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_2['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_2.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after filtercard() with a condition interaction', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1').filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1').filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.interactions.patient_interaction_1.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the (patient interaction) filtercard level (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_2['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.interactions.patient_interaction_2.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_2['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_2['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_2['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_2.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the (condition interaction) filtercard level', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.interactions.patient_interaction_1.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.interactions.patient_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.interactions.patient_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('patient_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.interactions.patient_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })
      })

      describe('for a condition interaction', function () {
        describe('called after request()', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            expect(jsonResult.cards.content[0].content[0]._instanceID).to.equal(
              'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
            )
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(3)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after basicdata()', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            expect(jsonResult.cards.content[0].content[0]._instanceID).to.equal(
              'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
            )
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(3)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the basic data level', function () {
          it('adds a new filtercard (no. 1) of the specified type when called for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().attribute('char_attr', {}).filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().basicdata().attribute('char_attr', {}).filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .attribute('num_attr', {})
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .attribute('freetext_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .basicdata()
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .attribute('num_attr', {})
              .filtercard('cond_a_interaction_1')
              .basicdata()
              .attribute('freetext_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(4)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after filtercard() with a patient interaction (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder.request().filtercard('patient_interaction_1').filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder.request().filtercard('patient_interaction_1').filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after filtercard() with a condition interaction', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1').filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder.request().filtercard('cond_a_interaction_1').filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_2.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the (patient interaction) filtercard level (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
            requestBuilder
              .request()
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
              .filtercard('patient_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_1')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_1.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })

        describe('called after attribute() at the (condition interaction) filtercard level', function () {
          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request()', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['1']).to.exist
          })

          it('adds a new filtercard (no. 1) of the specified type when called, for the first time, after request() - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(2)

            var fc = filtercards.filter(function (e) {
              return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_2.1'
            })
            expect(fc.length).to.equal(1)
          })

          it('numbers repeated instances of the same filtercard type by order of addition', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildJson()
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['1']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['2']).to.exist
            expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_2['3']).to.exist
          })

          it('numbers repeated instances of the same filtercard type by order of addition - IFR', function () {
            requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
              .filtercard('cond_a_interaction_1')
              .attribute('char_attr', {})
              .filtercard('cond_a_interaction_2')
            var jsonResult = requestBuilder.buildIFR()
            var filtercards = jsonResult.cards.content[0].content
            expect(filtercards.length).to.equal(6)

            for (var i = 0; i < 3; i++) {
              var id = 'patient.conditions.condition_a.interactions.cond_a_interaction_2.' + (i + 1)
              var filtercard = filtercards.filter(function (e) {
                return e._instanceID === id
              })
              expect(filtercard.length).to.equal(1)
            }
          })
        })
      })
    })

    describe('attribute()', function () {
      describe('called after request()', function () {
        it('throws an error', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var testFunc = function () {
            requestBuilder.request().attribute('char_attr', {})
          }
          expect(testFunc).to.throw(Error)
        })
      })

      describe('called after basicdata()', function () {
        it('adds a new basic data attribute constraint of the specified type', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0]).to.exist
        })

        it('adds a new basic data attribute constraint of the specified type - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.char_attr'
          })

          expect(attr.length).to.equal(1)
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0]).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr')
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.char_attr'
          })

          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.basicdata().attribute('char_attr')
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('does nothing if no constraint is given and the path already exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildIFR()
          requestBuilder.basicdata().attribute('char_attr')
          var jsonResultAfter = requestBuilder.buildIFR()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'A' }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0]).to.eql({ filter: [filterObj] })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'A' }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.char_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 'A' })
        })

        it('can be chained to add constraints to multiple attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 1 }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj1).attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          var expectJson = {
            configData: fakeConfigMetaData,
            patient: {
              isFiltercard: true,
              attributes: {
                char_attr: [{ filter: [filterObj1] }],
                num_attr: [{ filter: [filterObj2] }]
              }
            }
          }
          expect(jsonResult[0]).to.eql(expectJson)
        })

        it('can be chained to add constraints to multiple attributes - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 1 }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj1).attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var expectJson = {
            configData: {
              configId: 'ABCDEF123456',
              configVersion: 'A'
            },
            axes: [],
            cards: {
              content: [
                {
                  content: [
                    {
                      _configPath: 'patient',
                      _instanceNumber: 0,
                      _instanceID: 'patient',
                      _attributes: {
                        content: [
                          {
                            _configPath: 'patient.attributes.char_attr',
                            _instanceID: 'patient.attributes.char_attr',
                            _constraints: {
                              content: [
                                {
                                  _operator: '=',
                                  _value: 'A'
                                }
                              ]
                            }
                          },
                          {
                            _configPath: 'patient.attributes.num_attr',
                            _instanceID: 'patient.attributes.num_attr',
                            _constraints: {
                              content: [
                                {
                                  _operator: '=',
                                  _value: 1
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                {
                  content: []
                }
              ]
            }
          }
          expect(jsonResult).to.eql(expectJson)
        })
      })

      describe('called after attribute() at the basic data level', function () {
        it('adds a new basic data attribute constraint of the specified type', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0]).to.exist
        })

        it('adds a new basic data attribute constraint of the specified type - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.num_attr'
          })

          expect(attr.length).to.equal(1)
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0]).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.num_attr'
          })

          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.basicdata().attribute('char_attr', {}).attribute('num_attr')
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'A' }
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0]).to.eql({ filter: [filterObj] })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'A' }
          requestBuilder.request().basicdata().attribute('char_attr', {}).attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.num_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 'A' })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 'B' }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj1).attribute('char_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0]).to.eql({ filter: [filterObj1, filterObj2] })
        })

        it('concatenates constraints if called multiple times for the same attributes - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 'B' }
          requestBuilder.request().basicdata().attribute('char_attr', filterObj1).attribute('char_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.attributes.char_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 'A' })
          expect(attr[0]._constraints.content[1]).to.eql({ _operator: '=', _value: 'B' })
        })
      })

      describe('called after filtercard() with a patient interaction (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        it('adds a new data attribute constraint of the specified type to the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.exist
        })

        it('adds a new data attribute constraint of the specified type to the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('num_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr.length).to.equal(1)
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.char_attr[0]).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr')
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.char_attr'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('does nothing if no constraint is given and the path already exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.eql({
            filter: [filterObj]
          })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.eql({
            filter: [filterObj1, filterObj2]
          })
        })

        it('concatenates constraints if called multiple times for the same attributes - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 'A' }
          var filterObj2 = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 'A' })
          expect(attr[0]._constraints.content[1]).to.eql({ _operator: '=', _value: 1 })
        })
      })

      describe('called after filtercard() with a condition interaction', function () {
        it('uses the default condition name is no other name is given', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.exist
        })

        it('uses the default condition name is no other name is given - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('num_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr.length).to.equal(1)
        })

        it('adds a new data attribute constraint of the specified type to the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.exist
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.char_attr[0]
          ).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr')
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID ===
              'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.char_attr'
            )
          })
          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.filtercard('cond_a_interaction_1').attribute('char_attr', {})
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.eql({ filter: [filterObj] })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.eql({ filter: [filterObj1, filterObj2] })
        })

        it('concatenates constraints if called multiple times for the same attributes - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
          expect(attr[0]._constraints.content[1]).to.eql({ _operator: '=', _value: 2 })
        })
      })

      describe('called after attribute() at the (patient interaction) filtercard level (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        it('adds a new data attribute constraint of the specified type to the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.exist
        })

        it('adds a new data attribute constraint of the specified type to the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr.length).to.equal(1)
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.eql({
            filter: [filterObj]
          })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          var filterObj = { op: '=', value: 1 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes.num_attr[0]).to.eql({
            filter: [filterObj1, filterObj2]
          })
        })

        it('concatenates constraints if called multiple times for the same attributes - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig, 'condition_a')
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes.num_attr'
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
          expect(attr[0]._constraints.content[1]).to.eql({ _operator: '=', _value: 2 })
        })
      })

      describe('called after attribute() at the (condition interaction) filtercard level', function () {
        it('adds a new data attribute constraint of the specified type to the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', {})
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.exist
        })

        it('adds a new data attribute constraint of the specified type to the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', {})
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr.length).to.equal(1)
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.eql({})
        })

        it('adds an array with an empty object if no constraint is given and the path does not exist - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).attribute('num_attr')
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content.length).to.equal(0)
        })

        it('does nothing if no constraint is given and the path already exist', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', { a: 1 })
          var jsonResultBefore = requestBuilder.buildJson()
          requestBuilder.filtercard('patient_interaction_1').attribute('char_attr', {})
          var jsonResultAfter = requestBuilder.buildJson()
          expect(jsonResultAfter).to.eql(jsonResultBefore)
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint)', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'no' }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.eql({ filter: [filterObj] })
        })

        it('sets the attribute constraint to an array containing the specified value (if first constraint) - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj = { op: '=', value: 'no' }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 'no' })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.num_attr[0]
          ).to.eql({ filter: [filterObj1, filterObj2] })
        })

        it('concatenates constraints if called multiple times for the same attributes', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var filterObj1 = { op: '=', value: 1 }
          var filterObj2 = { op: '=', value: 2 }
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj1)
            .attribute('char_attr', {})
            .attribute('num_attr', filterObj2)
          var jsonResult = requestBuilder.buildIFR()
          var basicData = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(basicData.length).to.equal(1)

          var attr = basicData[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.num_attr'
            )
          })

          expect(attr[0]._constraints.content[0]).to.eql({ _operator: '=', _value: 1 })
          expect(attr[0]._constraints.content[1]).to.eql({ _operator: '=', _value: 2 })
        })
      })
    })

    describe('exclude()', function () {
      it('throws an error if called after request()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        expect(function () {
          requestBuilder.request().exclude()
        }).to.throw(Error)
      })

      it('throws an error if called right after basicdata()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        expect(function () {
          requestBuilder.request().basicdata().exclude()
        }).to.throw(Error)
      })

      it('throws an error if called right after attribute()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        expect(function () {
          requestBuilder.request().basicdata().attribute('char_attr').exclude()
        }).to.throw(Error)
        expect(function () {
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr').exclude()
        }).to.throw(Error)
      })

      it('sets the preceding patient interaction filtercard to be excluded (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1').exclude()
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].exclude).to.be.true
      })

      it('sets the preceding patient interaction filtercard to be excluded (i.e. interaction is in list passed to RequestBuilder constructor) - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('patient_interaction_1').exclude()
        var jsonResult = requestBuilder.buildIFR()
        var fc = jsonResult.cards.content[0].content.filter(function (e) {
          return e.content && e.content[0]._instanceID === 'patient.interactions.patient_interaction_1.1'
        })
        expect(fc.length).to.equal(1)
      })

      it('sets the preceding condition interaction filtercard to be excluded', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('cond_a_interaction_1').exclude()
        var jsonResult = requestBuilder.buildJson()
        expect(jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].exclude).to.be.true
      })

      it('sets the preceding condition interaction filtercard to be excluded - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request().filtercard('cond_a_interaction_1').exclude()
        var jsonResult = requestBuilder.buildIFR()
        var fc = jsonResult.cards.content[0].content.filter(function (e) {
          return (
            e.content &&
            e.content[0]._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          )
        })
        expect(fc.length).to.equal(1)
      })
    })

    describe('absolutetime()', function () {
      describe('called after request()', function () {
        it('throws an error', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var failFunc = function () {
            requestBuilder.request().absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
          }
          expect(failFunc).to.throw(Error)
        })
      })

      describe('called after basicdata()', function () {
        it('throws an error', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var failFunc = function () {
            requestBuilder.request().basicdata().absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
          }
          expect(failFunc).to.throw(Error)
        })
      })

      describe('called after attribute() at the basic data level', function () {
        it('throws an error', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          var failFunc = function () {
            requestBuilder.request().basicdata().attribute('char_attr').absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
          }
          expect(failFunc).to.throw(Error)
        })
      })

      describe('called after filtercard() with a patient interaction', function () {
        it('adds an absolute time constraint on the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime).to.exist
        })

        it('adds an absolute time constraint on the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({ a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime[0].filter).to.eql([
            { a: 1 }
          ])
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({ a: 1 }).absolutetime({ b: 2 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime[0].filter).to.eql([
            { a: 1 },
            { b: 2 }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
            .absolutetime({
              op: '>=',
              value: '20010110',
              type: 'abstime'
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            },
            {
              _operator: '>=',
              _value: '20010110'
            }
          ])
        })
      })

      describe('called after filtercard() with a condition interaction', function () {
        it('adds an absolute time constraint on the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime
          ).to.exist
        })

        it('adds an absolute time constraint on the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').absolutetime({ a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime[0]
              .filter
          ).to.eql([{ a: 1 }])
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').absolutetime({ a: 1 }).absolutetime({ b: 2 })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime[0]
              .filter
          ).to.eql([{ a: 1 }, { b: 2 }])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
            .absolutetime({
              op: '>=',
              value: '20010110',
              type: 'abstime'
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            },
            {
              _operator: '>=',
              _value: '20010110'
            }
          ])
        })
      })

      describe('called after attribute() at the (patient interaction) filtercard level (i.e. interaction is in list passed to RequestBuilder constructor)', function () {
        it('adds an absolute time constraint on the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime).to.exist
        })

        it('adds an absolute time constraint on the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').attribute('char_attr', {}).absolutetime({ a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime[0].filter).to.eql([
            { a: 1 }
          ])
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('patient_interaction_1').absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', { c: 1 })
            .absolutetime({ a: 1 })
            .attribute('char_attr', { d: 1 })
            .absolutetime({ b: 2 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._absTime[0].filter).to.eql([
            { a: 1 },
            { b: 2 }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1')
            .attribute('char_attr', { c: 1 })
            .absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
            .attribute('char_attr', { d: 1 })
            .absolutetime({
              op: '>=',
              value: '20010110',
              type: 'abstime'
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1.attributes._absTime'
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            },
            {
              _operator: '>=',
              _value: '20010110'
            }
          ])
        })
      })

      describe('called after attribute() at the (condition interaction) filtercard level', function () {
        it('adds an absolute time constraint on the preceding interaction', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime
          ).to.exist
        })

        it('adds an absolute time constraint on the preceding interaction - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).absolutetime({ a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime[0]
              .filter
          ).to.eql([{ a: 1 }])
        })

        it('inserts the passed constraint as the absolute time constraints on the preceding interaction, if called for the first time - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1').attribute('char_attr', {}).absolutetime({
            op: '>=',
            value: '20000110',
            type: 'abstime'
          })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            }
          ])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { c: 1 })
            .absolutetime({ a: 1 })
            .attribute('char_attr', { d: 1 })
            .absolutetime({ b: 2 })
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes._absTime[0]
              .filter
          ).to.eql([{ a: 1 }, { b: 2 }])
        })

        it('adds the passed constraint to the absolute time constraints on the preceding interaction, if it was called before - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { c: 1 })
            .absolutetime({
              op: '>=',
              value: '20000110',
              type: 'abstime'
            })
            .attribute('char_attr', { d: 1 })
            .absolutetime({
              op: '>=',
              value: '20010110',
              type: 'abstime'
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1'
          })

          expect(fc.length).to.equal(1)

          var attr = fc[0]._attributes.content.filter(function (e) {
            return (
              e._instanceID === 'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes._absTime'
            )
          })

          expect(attr.length).to.equal(1)
          expect(attr[0]._constraints.content).to.eql([
            {
              _operator: '>=',
              _value: '20000110'
            },
            {
              _operator: '>=',
              _value: '20010110'
            }
          ])
        })
      })
    })

    describe('relativetime', function () {
      describe('with a "isSucceededBy" constraint', function () {
        it('throws an error if called after request()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder.request().relativetime('isSucceededBy', 'a', 'b')
          }).to.throw(Error)
        })

        it('throws an error if called after basicdata()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder.request().basicdata().relativetime('isSucceededBy', 'a', 'b')
          }).to.throw(Error)
        })

        it('throws an error if the first tag (defined in the call to filtercard()) is undefined', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder
              .filtercard('patient_interaction_1', 'c')
              .filtercard('patient_interaction_1', 'b')
              .relativetime('isSucceededBy', 'a', 'b')
          }).to.throw(Error)
        })

        it('throws an error if the second tag (defined in the call to filtercard()) is undefined', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder
              .filtercard('patient_interaction_1', 'a')
              .filtercard('patient_interaction_1', 'c')
              .relativetime('isSucceededBy', 'a', 'b')
          }).to.throw(Error)
        })

        it('throws an error if no constraint is given', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder
              .filtercard('patient_interaction_1', 'a')
              .filtercard('patient_interaction_1', 'b')
              .relativetime('isSucceededBy', 'a', 'b')
          }).to.throw(Error)
        })

        it('adds an successor constraint on the interaction referred to by the first tag', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', { a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._succ).to.exist
        })

        it('adds an successor constraint on the interaction referred to by the first tag - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', {
              and: [
                {
                  op: '>=',
                  value: 1
                }
              ]
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)
          expect(fc[0]._successor).to.exist
        })

        it('sets the succeeding interaction to be the one referred to by the first tag', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', { a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._succ[0].value).to.equal(
            'patient.interactions.patient_interaction_1.2'
          )
        })

        it('sets the succeeding interaction to be the one referred to by the first tag - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', {
              and: [
                {
                  op: '>=',
                  value: 1
                }
              ]
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)
          expect(fc[0]._successor).to.exist
          expect(fc[0]._successor.id).to.equal('patient.interactions.patient_interaction_1.2')
        })

        it('sets the succeeding interaction constraint to be the passed one', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', { a: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.interactions.patient_interaction_1['1'].attributes._succ[0].filter).to.eql([
            { a: 1 }
          ])
        })

        it('sets the succeeding interaction constraint to be the passed one - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('patient_interaction_1', 'a')
            .filtercard('patient_interaction_1', 'b')
            .relativetime('isSucceededBy', 'a', 'b', {
              and: [
                {
                  op: '>=',
                  value: 1
                },
                {
                  op: '<',
                  value: 100
                }
              ]
            })
          var jsonResult = requestBuilder.buildIFR()
          var fc = jsonResult.cards.content[0].content.filter(function (e) {
            return e._instanceID === 'patient.interactions.patient_interaction_1.1'
          })

          expect(fc.length).to.equal(1)
          expect(fc[0]._successor).to.exist
          expect(fc[0]._successor.minDaysBetween).to.equal(1)
          expect(fc[0]._successor.maxDaysBetween).to.equal(100)
        })
      })
    })

    describe('matchall()', function () {
      it('does not alter a request without other calls to all() or any()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder
          .request()
          .basicdata()
          .attribute('somePatientAttribute', { a: 1 })
          .filtercard('patient_interaction_1', 'b')
          .attribute('char_attr', { a: 1 })
        var jsonResult1 = requestBuilder.buildJson()
        requestBuilder
          .request()
          .matchall()
          .basicdata()
          .attribute('somePatientAttribute', { a: 1 })
          .filtercard('patient_interaction_1', 'b')
          .attribute('char_attr', { a: 1 })
        var jsonResult2 = requestBuilder.buildJson()
        expect(jsonResult1).to.eql(jsonResult2)
      })

      it('does not alter a request without other calls to all() or any() - IFR', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder
          .request()
          .basicdata()
          .attribute('somePatientAttribute', { a: 1 })
          .filtercard('patient_interaction_1', 'b')
          .attribute('char_attr', { a: 1 })
        var jsonResult1 = requestBuilder.buildIFR()
        requestBuilder
          .request()
          .matchall()
          .basicdata()
          .attribute('somePatientAttribute', { a: 1 })
          .filtercard('patient_interaction_1', 'b')
          .attribute('char_attr', { a: 1 })
        var jsonResult2 = requestBuilder.buildIFR()
        expect(jsonResult1).to.eql(jsonResult2)
      })

      it('cannot be called more than once', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var failFunc = function () {
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .filtercard('patient_interaction_1', 'b')
            .attribute('char_attr', { a: 1 })
            .matchall()
        }
        expect(failFunc).to.throw(Error)
      })

      it('cannot be called after matchany()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var failFunc = function () {
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .filtercard('patient_interaction_1', 'b')
            .attribute('char_attr', { a: 1 })
            .matchall()
        }
        expect(failFunc).to.throw(Error)
      })
    })

    describe('matchany()', function () {
      it('cannot be called before matchall()', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var failFunc = function () {
          requestBuilder
            .request()
            .matchany()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .filtercard('patient_interaction_1')
            .attribute('char_attr', { a: 1 })
        }
        expect(failFunc).to.throw(Error)
      })

      it('cannot be called more than once', function () {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        var failFunc = function () {
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_2')
            .attribute('someOtherAttribute', { a: 1 })
        }
        expect(failFunc).to.throw(Error)
      })

      describe('followed by a single filtercard', function () {
        it('gives the same result as adding that card to the matchall() section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_2')
            .attribute('someOtherAttribute', { b: 2 })
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.request()
          requestBuilder
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('someOtherAttribute', { b: 2 })
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('gives the same result as adding that card to the matchall() section - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_2')
            .attribute('someOtherAttribute', { b: 2 })
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.request()
          requestBuilder
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('someOtherAttribute', { b: 2 })
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('followed by multiple filtercards', function () {
        it('generates a request array with as many entries as there are interaction in the matchany() section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { b: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { b: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { c: 1 })
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult.length).to.equal(3)
        })

        it('generates a request array with as many entries as there are interaction in the matchany() section - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('somePatientAttribute', { a: 1 })
            .matchany()
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { b: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { b: 1 })
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { c: 1 })
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.cards.content[0].content.length).to.equal(1)
          expect(jsonResult.cards.content[1].content.length).to.equal(3)
        })

        it('results in request array elements that ALL have the filtercards from the matchall() section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('lastName', { a: 1 })
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { b: 1 })
            .matchany()
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { c: 1 })
            .filtercard('cond_b_interaction_1')
            .attribute('freetext_attr', { d: 1 })
            .filtercard('cond_n_interaction_2')
            .attribute('char_attr', { e: 1 })
          var jsonResult = requestBuilder.buildJson()
          var req1 = jsonResult[0]
          var req2 = jsonResult[1]
          var req3 = jsonResult[2]
          var patientAttJson = {
            lastName: [
              {
                filter: [{ a: 1 }]
              }
            ]
          }
          var interactionJson = {
            1: {
              isFiltercard: true,
              attributes: {
                char_attr: [
                  {
                    filter: [{ b: 1 }]
                  }
                ]
              }
            }
          }
          expect(req1.patient.attributes).to.eql(patientAttJson)
          expect(req2.patient.attributes).to.eql(patientAttJson)
          expect(req3.patient.attributes).to.eql(patientAttJson)
          expect(req1.patient.conditions.condition_a.interactions.cond_a_interaction_1).to.eql(interactionJson)
          expect(req2.patient.conditions.condition_a.interactions.cond_a_interaction_1).to.eql(interactionJson)
          expect(req3.patient.conditions.condition_a.interactions.cond_a_interaction_1).to.eql(interactionJson)
        })

        it('results in request array elements that EACH have exactly one of the filtercards from the matchany() section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('lastName', { a: 1 })
            .filtercard('cond_a_interaction_1')
            .attribute('char_attr', { b: 1 })
            .matchany()
            .filtercard('cond_a_interaction_2')
            .attribute('num_attr', { c: 1 })
            .filtercard('cond_b_interaction_1')
            .attribute('freetext_attr', { d: 1 })
            .filtercard('cond_b_interaction_2')
            .attribute('char_attr', { e: 1 })
          var jsonResult = requestBuilder.buildJson()
          var req1 = jsonResult[0]
          var req2 = jsonResult[1]
          var req3 = jsonResult[2]
          expect(req1.patient.conditions.condition_a.interactions.cond_a_interaction_2).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                num_attr: [
                  {
                    filter: [{ c: 1 }]
                  }
                ]
              }
            }
          })
          expect(req2.patient.conditions.condition_b.interactions.cond_b_interaction_1).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                freetext_attr: [
                  {
                    filter: [{ d: 1 }]
                  }
                ]
              }
            }
          })
          expect(req3.patient.conditions.condition_b.interactions.cond_b_interaction_2).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                char_attr: [
                  {
                    filter: [{ e: 1 }]
                  }
                ]
              }
            }
          })
        })

        it('can also handle patient interactions', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .matchall()
            .basicdata()
            .attribute('lastName', { a: 1 })
            .filtercard('patient_interaction_1')
            .attribute('char_attr', { b: 1 })
            .matchany()
            .filtercard('patient_interaction_2')
            .attribute('num_attr', { c: 1 })
            .filtercard('patient_interaction_2')
            .attribute('freetext_attr', { d: 1 })
            .filtercard('patient_interaction_2')
            .attribute('char_attr', { e: 1 })
          var jsonResult = requestBuilder.buildJson()
          var req1 = jsonResult[0]
          var req2 = jsonResult[1]
          var req3 = jsonResult[2]
          expect(req1.patient.interactions.patient_interaction_2).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                num_attr: [
                  {
                    filter: [{ c: 1 }]
                  }
                ]
              }
            }
          })
          expect(req2.patient.interactions.patient_interaction_2).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                freetext_attr: [
                  {
                    filter: [{ d: 1 }]
                  }
                ]
              }
            }
          })
          expect(req3.patient.interactions.patient_interaction_2).to.eql({
            1: {
              isFiltercard: true,
              attributes: {
                char_attr: [
                  {
                    filter: [{ e: 1 }]
                  }
                ]
              }
            }
          })
        })
      })
    })

    describe('Chart settings', function () {
      describe('chart()', function () {
        it('does not itself alter the request object', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata()
          var jsonResult1 = requestBuilder.buildJson()
          requestBuilder.chart()
          var jsonResult2 = requestBuilder.buildJson()
          expect(jsonResult1).to.eql(jsonResult2)
        })

        it('does not itself alter the request object - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata()
          var jsonResult1 = requestBuilder.buildIFR()
          requestBuilder.chart()
          var jsonResult2 = requestBuilder.buildIFR()
          expect(jsonResult1).to.eql(jsonResult2)
        })
      })

      describe('xaxis()', function () {
        it('throws an error if not called after chart()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1', 'CaI1')
              .attribute('char_attr')
              .xaxis('CaI1', 'char_attr')
          }).to.throw(Error)
        })

        it('recognizes "basicdata" as the tag for the basic data filtercard', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).chart().xaxis('basicdata', 'char_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].xaxis).to.equal(2)
        })

        it('recognizes "basicdata" as the tag for the basic data filtercard - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).chart().xaxis('basicdata', 'char_attr', 2)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.char_attr')
          expect(jsonResult.axes[0].axis).to.equal('x')
          expect(jsonResult.axes[0].seq).to.equal(2)
        })

        it('allows adding basic data attributes even if there was no call to basicdata()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().chart().xaxis('basicdata', 'char_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].xaxis).to.equal(2)
        })

        it('allows adding basic data attributes even if there was no call to basicdata() - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().chart().xaxis('basicdata', 'char_attr', 2)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.char_attr')
          expect(jsonResult.axes[0].axis).to.equal('x')
          expect(jsonResult.axes[0].seq).to.equal(2)
        })

        it('assigns the attribute specified by the filtercard tag and the attribute name to the x-axis', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1', 'priDiag1')
            .attribute('char_attr')
            .chart()
            .xaxis('CaI1', 'char_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.char_attr[0]
              .xaxis
          ).to.equal(2)
        })

        it('assigns the attribute specified by the filtercard tag and the attribute name to the x-axis - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1', 'priDiag1')
            .attribute('char_attr')
            .chart()
            .xaxis('CaI1', 'char_attr', 2)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal(
            'patient.conditions.condition_a.interactions.cond_a_interaction_1.1.attributes.char_attr'
          )
          expect(jsonResult.axes[0].axis).to.equal('x')
          expect(jsonResult.axes[0].seq).to.equal(2)
        })

        it('does not require the attribute to have been referred to in the filter section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1', 'CaI1').chart().xaxis('CaI1', 'char_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(
            jsonResult[0].patient.conditions.condition_a.interactions.cond_a_interaction_1['1'].attributes.char_attr[0]
              .xaxis
          ).to.equal(2)
        })

        it('sets the axis no. to 1 if no other number is given', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).chart().xaxis('basicdata', 'char_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].xaxis).to.equal(1)
        })

        it('sets the axis no. to 1 if null is passed as axis number', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('char_attr', {}).chart().xaxis('basicdata', 'char_attr', null)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].xaxis).to.equal(1)
        })

        it('overrides existing assignments if applied multiple time to the same attribute', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('char_attr', {})
            .chart()
            .xaxis('basicdata', 'char_attr', 2)
            .xaxis('basicdata', 'char_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].xaxis).to.equal(1)
        })

        it('sets the binsize to the fourth argument, if present', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('char_attr', {})
            .chart()
            .xaxis('basicdata', 'char_attr', null, 10)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.char_attr[0].binsize).to.equal(10)
        })

        it('sets the binsize to the fourth argument, if present - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('char_attr', {})
            .chart()
            .xaxis('basicdata', 'char_attr', null, 10)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.char_attr')
          expect(jsonResult.axes[0].binsize).to.equal(10)
        })
      })

      describe('yaxis()', function () {
        it('throws an error if not called after chart()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          expect(function () {
            requestBuilder
              .request()
              .filtercard('cond_a_interaction_1', 'CaI1')
              .attribute('num_attr')
              .yaxis('CaI1', 'num_attr')
          }).to.throw(Error)
        })

        it('recognizes "basicdata" as the tag for the basic data filtercard', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('num_attr', {}).chart().yaxis('basicdata', 'num_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(2)
        })

        it('recognizes "basicdata" as the tag for the basic data filtercard - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('num_attr', {}).chart().yaxis('basicdata', 'num_attr', 2)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.num_attr')
          expect(jsonResult.axes[0].axis).to.equal('y')
          expect(jsonResult.axes[0].seq).to.equal(2)
        })

        it('allows adding basic data attributes even if there was no call to basicdata()', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().chart().yaxis('basicdata', 'num_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(2)
        })

        it('assigns the attribute specified by the filtercard tag and the attribute name to the x-axis', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .filtercard('cond_a_interaction_1', 'CaI1')
            .attribute('num_attr')
            .chart()
            .yaxis('basicdata', 'num_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(2)
        })

        it('does not require the attribute to have been referred to in the filter section', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().filtercard('cond_a_interaction_1', 'CaI1').chart().yaxis('basicdata', 'num_attr', 2)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(2)
        })

        it('sets the axis no. to 1 if null is passed as axis number', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('num_attr', {}).chart().yaxis('basicdata', 'num_attr', null)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(1)
        })

        it('overrides existing assignments if applied multiple time to the same attribute', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('num_attr', {})
            .chart()
            .yaxis('basicdata', 'num_attr', 2)
            .yaxis('basicdata', 'num_attr')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].yaxis).to.equal(1)
        })

        it('does not specify an aggregation type if none is given', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('num_attr', {}).chart().yaxis('basicdata', 'num_attr', 1)
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].aggregation).to.be.undefined
        })

        it('does not specify an aggregation type if none is given - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder.request().basicdata().attribute('num_attr', {}).chart().yaxis('basicdata', 'num_attr', 1)
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.num_attr')
          expect(jsonResult.axes[0].aggregation).to.be.undefined
        })

        it('allows you to specify an aggregation type', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('num_attr', {})
            .chart()
            .yaxis('basicdata', 'num_attr', 1, 'sum')
          var jsonResult = requestBuilder.buildJson()
          expect(jsonResult[0].patient.attributes.num_attr[0].aggregation).to.equal('sum')
        })

        it('allows you to specify an aggregation type - IFR', function () {
          requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
          requestBuilder
            .request()
            .basicdata()
            .attribute('num_attr', {})
            .chart()
            .yaxis('basicdata', 'num_attr', 1, 'sum')
          var jsonResult = requestBuilder.buildIFR()
          expect(jsonResult.axes.length).to.equal(1)
          expect(jsonResult.axes[0].id).to.equal('patient.attributes.num_attr')
          expect(jsonResult.axes[0].aggregation).to.equal('sum')
        })
      })
    })

    describe('submit()', function () {
      it('makes a request with the given parameters using the stored HanaRequest object', function (done) {
        requestBuilder = new RequestBuilder(fakeConfigMetaData, fakeMriConfig)
        requestBuilder.request()
        var filterObj1 = { op: '=', value: 'A' }
        var filterObj2 = { op: '=', value: 1 }
        requestBuilder
          .request()
          .basicdata()
          .attribute('char_attr', filterObj1)
          .attribute('num_attr', filterObj2)
          .chart()
          .xaxis('basicdata', 'char_attr')
          .yaxis('basicdata', 'num_attr')
        var fakeHanaRequest = {
          request: sinon.stub()
        }
        var fakeResponse = { statusCode: 200 }
        fakeHanaRequest.request.onCall(0).callsArgWith(1, null, fakeResponse)
        var fakeUrlPath = '/analytics-svc/pa/services/analytics.xsjs'
        var fakeParameters = { a: 1 }
        var reqBody = requestBuilder.buildIFR()
        requestBuilder.submit(fakeHanaRequest, fakeUrlPath, fakeParameters, function () {
          var firstCallArg = fakeHanaRequest.request.getCall(0).args[0]
          expect(firstCallArg.parameters).to.eql(fakeParameters)
          expect(JSON.parse(firstCallArg.body)).to.eql(reqBody)
          done()
        })
      })
    })
  })
})()
