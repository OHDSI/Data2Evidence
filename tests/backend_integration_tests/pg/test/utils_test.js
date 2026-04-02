/* eslint-env node */

/**
 * Test suite for the spec utils.
 */

;(function () {
  // Wrap in immediate function to indicate scope of "use strict"
  'use strict'

  var chai = require('chai')
  var expect = chai.expect
  var utils = require('../lib/utils')

  /*
   * Test suite for normalizeSql().
   */
  describe('SPEC UTILITIES TEST SUITE', function () {
    describe('merge() ', function () {
      it('replace is the original with the merge object if the former is a primitive', function () {
        var origJson1 = 1
        var origJson2 = 'hallo'
        var origJson3 = null
        var replJson = {
          a: 'z'
        }
        expect(utils.merge(origJson1, replJson)).to.eql(replJson)
        expect(utils.merge(origJson2, replJson)).to.eql(replJson)
        expect(utils.merge(origJson3, replJson)).to.eql(replJson)
      })

      it('replaces the original with the merge object if the former is an array', function () {
        var origJson1 = [1, 2, 3]
        var origJson2 = ['h', 'a', 'l', 'l', 'o']
        var replJson = {
          a: 'z'
        }
        expect(utils.merge(origJson1, replJson)).to.eql(replJson)
        expect(utils.merge(origJson2, replJson)).to.eql(replJson)
      })

      it('replaces the content of a path in the original object with that in the merge object', function () {
        var origJson = {
          a: 1
        }
        var replJson = {
          a: 'z'
        }
        var expecJson = {
          a: 'z'
        }
        expect(utils.merge(origJson, replJson)).to.eql(expecJson)
      })

      it('replaces recursively inside nested objects', function () {
        var origJson = {
          a: {
            b: 1
          }
        }
        var replJson = {
          a: {
            b: 'z'
          }
        }
        var expecJson = {
          a: {
            b: 'z'
          }
        }
        expect(utils.merge(origJson, replJson)).to.eql(expecJson)
      })

      it('only replaces the content of paths present in the replacement object', function () {
        var origJson = {
          a: {
            b: {
              c: 1
            },
            d: {
              e: 2
            }
          }
        }
        var replJson = {
          a: {
            b: {
              c: 't'
            }
          }
        }
        var expecJson = {
          a: {
            b: {
              c: 't'
            },
            d: {
              e: 2
            }
          }
        }
        expect(utils.merge(origJson, replJson)).to.eql(expecJson)
      })

      it('returns a clone of the original object if the merge object is empty', function () {
        var origJson = {
          a: {
            b: {
              c: 1
            },
            d: {
              e: 2
            }
          }
        }
        expect(utils.merge(origJson, {})).to.eql(origJson)
      })

      it('add paths in the merged object not in the original object', function () {
        var origJson = {
          a: {
            b: {
              c: 1
            },
            d: {
              e: 2
            }
          }
        }
        var replJson = {
          p: {
            q: 4
          }
        }
        var expectJson = {
          a: {
            b: {
              c: 1
            },
            d: {
              e: 2
            }
          },
          p: {
            q: 4
          }
        }
        expect(utils.merge(origJson, replJson)).to.eql(expectJson)
      })

      it('adds deeper parts present in the merged object (i.e. for which only parts of the path is present in the original)', function () {
        var origJson = {
          a: {
            b: {
              c: 1
            },
            d: {
              e: 2
            }
          }
        }
        var replJson = {
          a: {
            p: {
              q: 4
            }
          }
        }
        var expectJson = {
          a: {
            b: {
              c: 1
            },
            p: {
              q: 4
            },
            d: {
              e: 2
            }
          }
        }
        expect(utils.merge(origJson, replJson)).to.eql(expectJson)
      })
    })
  })
})()
