/**
 * Test suite for the MRI result parser
 */
/* eslint-disable no-unused-expressions */

;(function () {
  'use strict'

  var chai = require('chai')
  var expect = chai.expect

  var parserFactory = require('../lib/mri_result_parser')

  describe('Factory functions:', function () {
    var fakeValidBody = {
      categories: [
        {
          axis: 1,
          id: 'cat1Id',
          name: 'x1',
          order: 'ASC',
          type: 'text',
          value: '{cat1Id}'
        },
        {
          axis: 2,
          id: 'cat2Id',
          name: 'x2',
          order: 'ASC',
          type: 'number',
          value: '{cat2Id}'
        }
      ],
      measures: [
        {
          group: 1,
          id: 'meas1Id',
          name: 'y1',
          type: 'num',
          value: '{meas1Id}'
        }
      ],
      data: [
        {
          cat1Id: 'A',
          cat2Id: 2,
          meas1Id: 1.45
        },
        {
          cat1Id: 'A',
          cat2Id: 1,
          meas1Id: 2.45
        },
        {
          cat1Id: 'B',
          cat2Id: 1,
          meas1Id: 3.5
        }
      ]
    }
    var fakeEmptyResultBody = {
      categories: [],
      measures: [],
      data: []
    }
    var fakeValidResponse = {
      statusCode: 200
    }

    describe('createNonValidatedMriResultParser', function () {
      it('returns an MriResultParser object', function () {
        var resParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeValidBody)
        expect(resParser.constructor.name).to.equal('MriResultParser')
      })

      it('works even if the result is empty', function () {
        var resParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeEmptyResultBody)
        expect(resParser.constructor.name).to.equal('MriResultParser')
      })
    })

    describe('createMriResultParser', function () {
      it('returns an MriResultParser object', function () {
        var resParser = parserFactory.createMriResultParser(fakeValidResponse, fakeValidBody)
        expect(resParser.constructor.name).to.equal('MriResultParser')
      })

      it('throws an error if the return code is not for the form "2XX"', function () {
        var fakeInvalidResponse = { statusCode: 123 }
        var testFunc = function () {
          parserFactory.createMriResultParser(fakeInvalidResponse, fakeValidBody)
        }
        expect(testFunc).to.throw(Error)
      })

      it('throws an error if the categories are empty', function () {
        var fakeEmptyCatBody = {
          categories: [],
          measures: [{ a: 1 }],
          data: [{ a: 1 }]
        }
        var testFunc = function () {
          parserFactory.createMriResultParser(fakeValidResponse, fakeEmptyCatBody)
        }
        expect(testFunc).to.throw(Error)
      })

      it('throws an error if the measures are empty', function () {
        var fakeEmptyCatBody = {
          categories: [{ a: 1 }],
          measures: [],
          data: [{ a: 1 }]
        }
        var testFunc = function () {
          parserFactory.createMriResultParser(fakeValidResponse, fakeEmptyCatBody)
        }
        expect(testFunc).to.throw(Error)
      })

      it('throws an error if a noDataReason fiels is set', function () {
        var fakeNoDataBody = JSON.parse(JSON.stringify(fakeValidBody))
        fakeNoDataBody.noDataReason = 'just because'
        var testFunc = function () {
          parserFactory.createMriResultParser(fakeValidResponse, fakeNoDataBody)
        }
        expect(testFunc).to.throw(Error)
      })
    })
  })

  describe('MriResultParser', function () {
    var fakeBodyWith2Categories = {
      categories: [
        {
          axis: 1,
          id: 'cat1Id',
          name: 'x1',
          order: 'ASC',
          type: 'text',
          value: '{cat1Id}'
        },
        {
          axis: 2,
          id: 'cat2Id',
          name: 'x2',
          order: 'ASC',
          type: 'number',
          value: '{cat2Id}'
        }
      ],
      measures: [
        {
          group: 1,
          id: 'meas1Id',
          name: 'y1',
          type: 'num',
          value: '{meas1Id}'
        }
      ],
      data: [
        {
          cat1Id: 'A',
          cat2Id: 2,
          meas1Id: 1.45
        },
        {
          cat1Id: 'A',
          cat2Id: 1,
          meas1Id: 2.45
        },
        {
          cat1Id: 'B',
          cat2Id: 1,
          meas1Id: 3.5
        }
      ]
    }

    describe('constructor', function () {
      it('will throw an error if the no. of measures in the data does not match what is in the data points', function () {
        var fakeBodyWithWrongMeasNo = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            },
            {
              axis: 2,
              id: 'cat2Id',
              name: 'x2',
              order: 'ASC',
              type: 'number',
              value: '{cat2Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            },
            {
              group: 2,
              id: 'meas12d',
              name: 'y2',
              type: 'num',
              value: '{meas12d}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              cat2Id: 1,
              meas1Id: 2.45
            },
            {
              cat1Id: 'A',
              cat2Id: 2,
              meas1Id: 1.45
            },
            {
              cat1Id: 'B',
              cat2Id: 1,
              meas1Id: 3.5
            }
          ]
        }
        expect(function () {
          parserFactory.createNonValidatedMriResultParser({}, fakeBodyWithWrongMeasNo)
        }).to.throw(Error)
      })

      it('will throw an error if multiple data points have the same values for all categories', function () {
        var fakeBodyWithDuplicateCategoryCombinations = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            },
            {
              axis: 2,
              id: 'cat2Id',
              name: 'x2',
              order: 'ASC',
              type: 'number',
              value: '{cat2Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              cat2Id: 1,
              meas1Id: 2.45
            },
            {
              cat1Id: 'A',
              cat2Id: 1,
              meas1Id: 5.45
            },
            {
              cat1Id: 'A',
              cat2Id: 2,
              meas1Id: 1.45
            },
            {
              cat1Id: 'B',
              cat2Id: 1,
              meas1Id: 3.5
            }
          ]
        }
        expect(function () {
          parserFactory.createNonValidatedMriResultParser({}, fakeBodyWithDuplicateCategoryCombinations)
        }).to.throw(Error)
      })

      it('can handle several category layers', function () {
        var threeLayerBody = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            },
            {
              axis: 2,
              id: 'cat2Id',
              name: 'x2',
              order: 'ASC',
              type: 'number',
              value: '{cat2Id}'
            },
            {
              axis: 3,
              id: 'cat3Id',
              name: 'x3',
              order: 'ASC',
              type: 'text',
              value: '{cat3Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              cat2Id: 1,
              cat3Id: 'x',
              meas1Id: 1
            },
            {
              cat1Id: 'A',
              cat2Id: 1,
              cat3Id: 'y',
              meas1Id: 2
            },
            {
              cat1Id: 'A',
              cat2Id: 2,
              cat3Id: 'x',
              meas1Id: 3
            },
            {
              cat1Id: 'A',
              cat2Id: 2,
              cat3Id: 'y',
              meas1Id: 4
            },
            {
              cat1Id: 'B',
              cat2Id: 1,
              cat3Id: 'x',
              meas1Id: 5
            },
            {
              cat1Id: 'B',
              cat2Id: 1,
              cat3Id: 'y',
              meas1Id: 6
            },
            {
              cat1Id: 'B',
              cat2Id: 2,
              cat3Id: 'x',
              meas1Id: 7
            },
            {
              cat1Id: 'B',
              cat2Id: 2,
              cat3Id: 'y',
              meas1Id: 8
            }
          ]
        }
        expect(function () {
          parserFactory.createNonValidatedMriResultParser({}, threeLayerBody)
        }).not.to.throw(Error)
      })

      it('be default does not remove zero entries', function () {
        var threeLayerBody = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              meas1Id: 0
            },
            {
              cat1Id: 'B',
              meas1Id: 1
            }
          ]
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, threeLayerBody)
        expect(resultParser.getCategoryValues().sort()).to.eql(['A', 'B'])
      })

      it('does not care if the categories are labeled starting from 1 and that there is no gaps in the numbering', function () {
        var fakeBodyWithStrangeCategoryNumbering = {
          categories: [
            {
              axis: -1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            },
            {
              axis: 3,
              id: 'cat2Id',
              name: 'x2',
              order: 'ASC',
              type: 'number',
              value: '{cat2Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              cat2Id: 1,
              meas1Id: 2.45
            },
            {
              cat1Id: 'A',
              cat2Id: 2,
              meas1Id: 1.45
            },
            {
              cat1Id: 'B',
              cat2Id: 1,
              meas1Id: 3.5
            }
          ]
        }
        expect(function () {
          parserFactory.createNonValidatedMriResultParser({}, fakeBodyWithStrangeCategoryNumbering)
        }).not.to.throw(Error)
      })
    })

    describe('isEmpty()', function () {
      it('returns false if there was data returned', function () {
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeBodyWith2Categories)
        expect(resultParser.isEmpty()).to.be.false
      })

      it('returns true if there was no data passed', function () {
        var fakeEmptyResultBody = {
          categories: [],
          measures: [],
          data: []
        }
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeEmptyResultBody)
        expect(resultParser.isEmpty()).to.be.true
      })
    })

    describe('hasNoMatchingPatients()', function () {
      it('returns true if the body field "noDataReason" is set to "MRI_PA_NO_MATCHING_PATIENTS" and there is no data returned', function () {
        var fakeNoDataBody = {
          categories: [],
          measures: [],
          data: [],
          noDataReason: 'MRI_PA_NO_MATCHING_PATIENTS'
        }
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeNoDataBody)
        expect(resultParser.hasNoMatchingPatients()).to.be.true
      })

      it('returns false if the body field "noDataReason" is set to "MRI_PA_NO_MATCHING_PATIENTS" but there is data returned', function () {
        var fakeNoDataBody = JSON.parse(JSON.stringify(fakeBodyWith2Categories))
        fakeNoDataBody.noDataReason = 'MRI_PA_NO_MATCHING_PATIENTS'
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeNoDataBody)
        expect(resultParser.hasNoMatchingPatients()).to.be.false
      })

      it('returns false if the body field "noDataReason" is absent', function () {
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeBodyWith2Categories)
        expect(resultParser.hasNoMatchingPatients()).to.be.false
      })

      it('returns true if the body field "noDataReason" is set to some DIFFERENT than "MRI_PA_NO_MATCHING_PATIENTS"', function () {
        var fakeNoDataBody = JSON.parse(JSON.stringify(fakeBodyWith2Categories))
        fakeNoDataBody.noDataReason = 'SOME_EXOTIC_REASON'
        var fakeValidResponse = {
          statusCode: 200
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeValidResponse, fakeNoDataBody)
        expect(resultParser.hasNoMatchingPatients()).to.be.false
      })
    })

    describe('isValid()', function () {
      it('returns false if the reponse status code was not of the form "2xx"', function () {
        var fakeReponse = {
          statusCode: 345
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeReponse, fakeBodyWith2Categories)
        expect(resultParser.isValid()).to.be.false
      })

      it('returns true if the reponse status code was of the form "2xx"', function () {
        var fakeReponse = {
          statusCode: 234
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser(fakeReponse, fakeBodyWith2Categories)
        expect(resultParser.isValid()).to.be.true
      })
    })

    describe('getCategoryCount()', function () {
      it('returns the number of categories', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(resultParser.getCategoryCount()).to.equal(2)
      })

      it('returns 0 when passed a parser with no data', function () {
        var fakeBodyWithNoData = {
          categories: [],
          measures: [],
          data: []
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWithNoData)
        expect(resultParser.getCategoryCount()).to.equal(0)
      })
    })

    describe('getDataPointCount()', function () {
      it('returns the total no. of data points', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(resultParser.getDataPointCount()).to.equal(fakeBodyWith2Categories.data.length)
      })

      it('returns 0 when passed a parser with no data', function () {
        var fakeBodyWithNoData = {
          categories: [],
          measures: [],
          data: []
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWithNoData)
        expect(resultParser.getDataPointCount()).to.equal(0)
      })
    })

    describe('getCategoryValues()', function () {
      it('throws an error if there are no categories left', function () {
        var fakeBodyWith0Categories = {
          categories: [],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              meas1Id: 2.45
            }
          ]
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith0Categories)
        expect(function () {
          resultParser.getCategoryValues()
        }).to.throw(Error)
      })

      it('returns all values for the first category)', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(resultParser.getCategoryValues().sort()).to.eql(['A', 'B'])
      })
    })

    describe('selectCategory()', function () {
      it('throws an error if we ask for a category when there are no categories left', function () {
        var fakeBodyWith0Categories = {
          categories: [],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            }
          ],
          data: [
            {
              meas1Id: 2.45
            }
          ]
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith0Categories)
        expect(function () {
          resultParser.selectCategory('C')
        }).to.throw(Error)
      })

      it('returns another instance of MriResultParser', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(resultParser.selectCategory('A').constructor.name).to.equal('MriResultParser')
      })

      it('returns a MriResultParser with no data if we ask for a category that does not exist', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(resultParser.selectCategory('C').getDataPointCount()).to.equal(0)
      })

      it('returns a MriResultParser containing the data corresponding to the passed value for the lowest category', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        var newParser = resultParser.selectCategory('A')
        expect(newParser.getDataPointCount()).to.equal(2)
        expect(newParser.getCategoryValues().sort()).to.eql(['1', '2'])
      })

      it('can be chained to navigate the category tree', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        var newParser = resultParser.selectCategory('A').selectCategory(1)
        expect(newParser.getDataPointCount()).to.equal(1)
      })
    })

    describe('getMeasureValues()', function () {
      it('throws an error if the parser still contains multiple data points', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(function () {
          resultParser.selectCategory('A').getMeasureValues()
        }).to.throw(Error)
      })

      it('returns an array with the single measure value if there is just one measure', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        var allCatsSpecifiedParser = resultParser.selectCategory('A').selectCategory(2)
        expect(allCatsSpecifiedParser.getMeasureValues()).to.eql([1.45])
      })

      it('returns an array with the measured in the correct order if there are multiple measures', function () {
        var fakeBodyWith3Measures = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            },
            {
              group: 2,
              id: 'meas2Id',
              name: 'y2',
              type: 'num',
              value: '{meas2Id}'
            },
            {
              group: 3,
              id: 'meas3Id',
              name: 'y3',
              type: 'num',
              value: '{meas3d}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              meas1Id: 2.45,
              meas3Id: 1.45,
              meas2Id: 3.45
            },
            {
              cat1Id: 'C',
              meas1Id: 7.45,
              meas3Id: 6.45,
              meas2Id: 8.45
            },
            {
              cat1Id: 'B',
              meas1Id: 10.45,
              meas3Id: 9.45,
              meas2Id: 11.45
            }
          ]
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith3Measures)
        var allCatsSpecifiedParser = resultParser.selectCategory('C')
        expect(allCatsSpecifiedParser.getMeasureValues()).to.eql([7.45, 8.45, 6.45])
      })
    })

    describe('getCategoryMeasurePairs()', function () {
      it('throws an error if the parser contains more than one category', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(function () {
          resultParser.getCategoryMeasurePairs()
        }).to.throw(Error)
      })

      it('throws an error if the parser does not contain any categories', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        expect(function () {
          resultParser.selectCategory('A').selectCategory(2).getCategoryMeasurePairs()
        }).to.throw(Error)
      })

      it('returns an array containing the categories and the associated array of measure values, ordered by category calue', function () {
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith2Categories)
        var oneCatSpecifiedParser = resultParser.selectCategory('A')
        expect(oneCatSpecifiedParser.getCategoryMeasurePairs()).to.eql([
          ['1', [2.45]],
          ['2', [1.45]]
        ])
      })

      it('returns an array with the measured in the correct order if there are multiple measures', function () {
        var fakeBodyWith3Measures = {
          categories: [
            {
              axis: 1,
              id: 'cat1Id',
              name: 'x1',
              order: 'ASC',
              type: 'text',
              value: '{cat1Id}'
            }
          ],
          measures: [
            {
              group: 1,
              id: 'meas1Id',
              name: 'y1',
              type: 'num',
              value: '{meas1Id}'
            },
            {
              group: 2,
              id: 'meas2Id',
              name: 'y2',
              type: 'num',
              value: '{meas2Id}'
            },
            {
              group: 3,
              id: 'meas3Id',
              name: 'y3',
              type: 'num',
              value: '{meas3d}'
            }
          ],
          data: [
            {
              cat1Id: 'A',
              meas1Id: 2.45,
              meas3Id: 1.45,
              meas2Id: 3.45
            },
            {
              cat1Id: 'C',
              meas1Id: 7.45,
              meas3Id: 6.45,
              meas2Id: 8.45
            },
            {
              cat1Id: 'B',
              meas1Id: 10.45,
              meas3Id: 9.45,
              meas2Id: 11.45
            }
          ]
        }
        var resultParser = parserFactory.createNonValidatedMriResultParser({}, fakeBodyWith3Measures)
        var allCatsSpecifiedParser = resultParser.selectCategory('C')
        expect(allCatsSpecifiedParser.getMeasureValues()).to.eql([7.45, 8.45, 6.45])
      })
    })
  })
})()
