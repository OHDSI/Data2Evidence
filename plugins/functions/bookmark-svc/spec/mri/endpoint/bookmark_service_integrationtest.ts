import { TestEnvironment } from '../../testutils/testenvironment'
import * as testUtils from '../../testutils/testutils'
import { DBConnectionUtil as dbConnectionUtil, Constants, EnvVarUtils } from '@alp/alp-base-utils'
import * as async from 'async'
import * as bookmarkServiceLib from '../../../src/bookmark/bookmark.service'
import { testsLogger } from '../../testutils/logger'
import { DisableLogger } from '../../../src/utils/Logger'
import MockRequest from '../../utils/MockRequest'
import MockResponse from '../../utils/MockResponse'
import { IMRIRequest } from '../../../src/types'

Constants.getInstance().setEnvVar('bookmarks_table', 'bookmark')
DisableLogger()
const testSchemaName = process.env.TESTSCHEMA
let testEnvironment
let client
let connection
const bookmarksTable = EnvVarUtils.getBookmarksTable()
const credentials = {
  host: process.env.HANASERVER,
  port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
  user: process.env.HDIUSER ? process.env.HDIUSER : 'SYSTEM',
  password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : 'Toor1234',
  dialect: 'hana',
}
const testBookmarkData = [
  {
    id: 'AFF147E4-5BB1-448E-B55D-0A834ADE3124',
    userId: 'userId1',
    paConfigId: 'paConfig1',
    user: 'user1',
    name: 'bookmark1',
    bookmark: '{stuff: smt1}',
  },
  {
    id: '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA',
    userId: 'userId2',
    paConfigId: 'paConfig2',
    user: 'user2',
    name: 'bookmark2',
    bookmark: '{stuff: smt2}',
  },
  {
    id: '775147E4-3AA1-4AAA-7D5D-12834ADE31AB',
    userId: 'userId2',
    paConfigId: 'paConfig2',
    user: 'user3',
    name: 'bookmark3',
    bookmark: '{stuff: smt3}',
  },
]

// --------------- UTILITY FUNCTIONS ------------
const initConnectionAndSettings = callback => {
  dbConnectionUtil.DBConnectionUtil.getConnection(credentials.dialect, client, testSchemaName, (err, data) => {
    if (err) {
      testsLogger('Error in seting default schema!' + err)
    }

    connection = data
    testsLogger('Set default schema to ' + testSchemaName)
    callback(null)
  })
}

const convertBuffersToString = bookmarks => {
  bookmarks.forEach(bookmark => {
    bookmark.BOOKMARK = bookmark.BOOKMARK.toString()
  })
  return bookmarks
}

const initTestEnvironment = callback => {
  testEnvironment = new TestEnvironment(credentials.dialect, client, testSchemaName, false, true, (err, results) => {
    if (err) {
      testsLogger('Error in initializing TestEnvironment!')
    }
    callback(null)
  })
}

function addBookmarks(bookmarkList, callback) {
  const tasks = []
  bookmarkList.forEach(bm => {
    const result = (bm => {
      tasks.push(callback => {
        addBookmark(
          {
            ID: bm.id,
            USER_ID: bm.userId,
            PA_CONFIG_ID: bm.paConfigId,
            BOOKMARK_NAME: bm.name,
            BOOKMARK: bm.bookmark,
          },
          callback
        )
      })
    })(bm)
  })

  async.series(tasks, (err, data) => {
    if (err) {
      throw err
    }
    callback(null, null)
  })
}

function addBookmark(bookmark, callback) {
  testEnvironment.insertIntoTable(testEnvironment.removeQuotes(bookmarksTable), bookmark, callback)
}

/**
 * Fill standard test data into test table.
 * @param {Array}    testBookmarkData List of Bookmark objects
 * @param {function} callback         Callback function
 */
function fillInTestData(testBookmarkData, callback) {
  addBookmarks(testBookmarkData, callback)
}

/**
 * Set up spies for all the sub-query functions.
 */
function spyOnAllQueryFuncs() {
  spyOn(bookmarkServiceLib, '_loadAllBookmarks')
  spyOn(bookmarkServiceLib, 'loadSingleBookmark')
  spyOn(bookmarkServiceLib, '_insertBookmark')
  spyOn(bookmarkServiceLib, '_deleteBookmark')
  spyOn(bookmarkServiceLib, '_updateBookmark')
  spyOn(bookmarkServiceLib, '_renameBookmark')
}

/**
 * Check that calls were made to the sub-query functions given
 * in passed array, and that no calls were made to the remaining
 * functions.
 * @param {Array} shouldHaveBeenCalled array of functions that should have been called
 */
function verifyQueryCalls(shouldHaveBeenCalled) {
  const allFuncs = [
    bookmarkServiceLib._loadAllBookmarks,
    bookmarkServiceLib.loadSingleBookmark,
    bookmarkServiceLib._insertBookmark,
    bookmarkServiceLib._deleteBookmark,
    bookmarkServiceLib._updateBookmark,
    bookmarkServiceLib._renameBookmark,
  ]
  let i
  for (i = 0; i < allFuncs.length; i++) {
    if (shouldHaveBeenCalled.indexOf(allFuncs[i]) > -1) {
      expect(allFuncs[i]).toHaveBeenCalled()
    } else {
      expect(allFuncs[i]).not.toHaveBeenCalled()
    }
  }
}

describe('TEST SUITE TO DEFINE THE BEHAVIOR OF THE BOOKMARK ENDPOINT', () => {
  beforeAll(done => {
    testsLogger(
      '\n\n-----------------------------Test class:bookmark_service_integrationtest.ts -----------------------------\n'
    )
    testsLogger('testSchemaName:' + testSchemaName)

    /*
        A local temp table is needed when using $.hdb.connection
        A Global temp table (default behaviour) is needed when using $.db.connection (KM is currently using this)
        */

    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        throw err
      }
      client = c

      if (!client) {
        testsLogger('client undefined')
      }

      const tasks = [initConnectionAndSettings, initTestEnvironment]

      async.series(tasks, (err, data) => {
        if (err) {
          throw err
        }

        done()
      })
    })
  }, 600000)

  afterEach(done => {
    testEnvironment.clearTable(testEnvironment.removeQuotes(bookmarksTable), (err, results) => {
      if (err) {
        testsLogger('Error in clearing schema tables!')
      }
      done()
    })
  })

  describe('queryBookmarks()...', () => {
    it("does not return null if the cmd property is 'loadAll'", done => {
      const requestParametersStub = {
        cmd: 'loadAll',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {
        expect(data).not.toBeNull()
        done()
      })
    })

    it("does not return null if the cmd property is 'insert'", done => {
      const requestParametersStub = {
        cmd: 'insert',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {
        expect(data).toBeNull()
        done()
      })
    })

    it("does not return null if the cmd property is 'delete'", done => {
      const requestParametersStub = {
        cmd: 'delete',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {
        expect(data).not.toBeNull()
        done()
      })
    })

    it("does not return null if the cmd property is 'update'", done => {
      const requestParametersStub = {
        cmd: 'update',
        bmkId: 'bmkId',
        bookmark: 'bookmark',
        paConfigId: 'paConfigId',
        cdmConfigId: 'cdmConfigId',
        cdmConfigVersion: '1',
        shareBookmark: 0,
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {
        expect(data).not.toBeNull()
        done()
      })
    })

    it("does not return null if the cmd property is 'rename'", done => {
      const requestParametersStub = {
        cmd: 'rename',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {
        expect(data).not.toBeNull()
        done()
      })
    })

    xit("if cmd is 'loadAll', _loadAllBookmarks() is called", done => {
      spyOnAllQueryFuncs()
      const requestParametersStub = {
        cmd: 'loadAll',
        paConfigId: 'paConfigId',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {})
      verifyQueryCalls([bookmarkServiceLib._loadAllBookmarks])
      done()
    })

    xit("if cmd is 'insert', _insertBookmark() and _loadAllBookmarks() is called", done => {
      spyOnAllQueryFuncs()
      const requestParametersStub = {
        cmd: 'insert',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {})
      verifyQueryCalls([bookmarkServiceLib._insertBookmark])
      done()
    })

    xit("if cmd is 'delete', _deleteBookmark() and _loadAllBookmarks() is called", done => {
      spyOnAllQueryFuncs()
      const requestParametersStub = {
        cmd: 'delete',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {})
      verifyQueryCalls([bookmarkServiceLib._deleteBookmark])
      done()
    })

    xit("if cmd is 'update', _updateBookmark() and _loadAllBookmarks() is called", done => {
      spyOnAllQueryFuncs()
      const requestParametersStub = {
        cmd: 'update',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {})
      verifyQueryCalls([bookmarkServiceLib._updateBookmark])
      done()
    })

    xit("if cmd is 'rename', renameBookmark() and loadAllBookmarks() is called", done => {
      spyOnAllQueryFuncs()
      const requestParametersStub = {
        cmd: 'rename',
      }
      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, data) => {})
      verifyQueryCalls([bookmarkServiceLib._renameBookmark])
      done()
    })

    xit('throws an error if the cmd is not one of [loadAll, loadSingle, insert, update, delete, rename]', done => {
      const requestParametersStub = {
        cmd: 'random',
      }

      bookmarkServiceLib.queryBookmarks(requestParametersStub, 'userId1', bookmarksTable, connection, (err, result) => {
        expect(err).toBeDefined()
        done()
      })
    })
  })

  describe('loadSingleBookmark()...', () => {
    it('retrieves just one bookmark with the specified bookmark id and user id only', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib.loadSingleBookmark(
          'AFF147E4-5BB1-448E-B55D-0A834ADE3124',
          'userId1',
          bookmarksTable,
          connection,
          (err, returnedResult1) => {
            const expectedBookmarkData1 = [
              {
                bmkId: 'AFF147E4-5BB1-448E-B55D-0A834ADE3124',
                bookmarkname: 'bookmark1',
                bookmark: '{stuff: smt1}',
                userId: 'userId1',
                modified: 'NoValue',
                version: 'NoValue',
              },
            ]
            delete returnedResult1.bookmarks[0][`viewname`]
            expect(testUtils.toContainSameObjectsAsImpl(returnedResult1.bookmarks, expectedBookmarkData1)).toBeTruthy()
            bookmarkServiceLib.loadSingleBookmark(
              'WRONG-ID-PROVIDED-INTENTIONALLY-XXXX',
              'user1',
              bookmarksTable,
              connection,
              (err, returnedResult2) => {
                const expectedBookmarkData2 = []
                expect(
                  testUtils.toContainSameObjectsAsImpl(returnedResult2.bookmarks, expectedBookmarkData2)
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })
  })

  describe('loadAllBookmarks()...', () => {
    it('retrieves all bookmarks for the specified user only', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._loadAllBookmarks(
          'userId1',
          'paConfig1',
          bookmarksTable,
          connection,
          (err, returnedResult1) => {
            const expectedBookmarkData1 = [
              {
                USER_ID: 'userId1',
                BOOKMARKNAME: 'bookmark1',
                BOOKMARK: '{stuff: smt1}',
                bmkId: 'AFF147E4-5BB1-448E-B55D-0A834ADE3124',
                VIEWNAME: 'NoValue',
                MODIFIED: 'NoValue',
                SHARED: 'NoValue',
                VERSION: 'NoValue',
              },
            ]
            delete returnedResult1.bookmarks[0][`viewname`]
            expect(
              testUtils.toContainSameObjectsAsImpl(
                convertBuffersToString(returnedResult1.bookmarks),
                expectedBookmarkData1
              )
            ).toBeTruthy()
            bookmarkServiceLib._loadAllBookmarks(
              'userId2',
              'paConfig2',
              bookmarksTable,
              connection,
              (err, returnedResult2) => {
                const expectedBookmarkData2 = [
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark2',
                    BOOKMARK: '{stuff: smt2}',
                    bmkId: '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA',
                    VIEWNAME: 'NoValue',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark3',
                    BOOKMARK: '{stuff: smt3}',
                    bmkId: '775147E4-3AA1-4AAA-7D5D-12834ADE31AB',
                    VIEWNAME: 'NoValue',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                ]
                delete returnedResult2.bookmarks[0][`viewname`]
                delete returnedResult2.bookmarks[1][`viewname`]
                expect(
                  testUtils.toContainSameObjectsAsImpl(
                    convertBuffersToString(returnedResult2.bookmarks),
                    expectedBookmarkData2
                  )
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })

    it('returns no bookmarks for a user with no stored bookmarks', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._loadAllBookmarks(
          'userId3',
          'paConfig3',
          bookmarksTable,
          connection,
          (err, returnedResult) => {
            expect(returnedResult.bookmarks).toEqual([])
            done()
          }
        )
      })
    })
  })

  describe('_insertBookmark()...', () => {
    it('inserts a single bookmark with the given data', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._insertBookmark(
          'bookmark4',
          '{smt: 1}',
          'userId3',
          'paConfigId',
          'cdmConfigId',
          '1',
          0,
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib._loadAllBookmarks(
              'userId3',
              'paConfigId',
              bookmarksTable,
              connection,
              (err, resultSet) => {
                const expectedResult = [
                  {
                    USER_ID: 'userId3',
                    BOOKMARKNAME: 'bookmark4',
                    BOOKMARK: '{smt: 1}',
                    SHARED: 0,
                    VERSION: 'NoValue',
                  },
                ]
                delete resultSet.bookmarks[0][`VIEWNAME`]
                delete resultSet.bookmarks[0][`MODIFIED`]
                delete resultSet.bookmarks[0][`bmkId`]

                expect(
                  testUtils.toContainSameObjectsAsImpl(convertBuffersToString(resultSet.bookmarks), expectedResult)
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })

    it('throws an error if a user tries to insert another bookmark with the same name', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._insertBookmark(
          'bookmark4',
          '{smt: 1}',
          'userId3',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          0,
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib._insertBookmark(
              'bookmark4',
              '{smt: 1}',
              'userId3',
              'paConfigId',
              'cdmConfigId',
              'cdmConfigVersion1',
              true,
              bookmarksTable,
              connection,
              (err, data2) => {
                expect(err).toBeDefined()
                done()
              }
            )
          }
        )
      })
    })

    it('rejects an empty bookmark name', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._insertBookmark(
          '',
          '{smt: 1}',
          'userId3',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          0,
          bookmarksTable,
          connection,
          (err, data) => {
            if (!err) return done.fail('Expected an error when inserting empty bookmark name')
            expect(err).toBeDefined()
            done()
          }
        )
      })
    })
  })

  describe('deleteBookmark()...', () => {
    it('does not change the list of bookmarks if the bookmark ID is not present', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._loadAllBookmarks(
          'userId1',
          'paConfig1',
          bookmarksTable,
          connection,
          (err, bookmarksBefore) => {
            bookmarkServiceLib._deleteBookmark(
              'nonExistingId',
              'userId1',
              'paConfig1',
              bookmarksTable,
              connection,
              (err, data) => {
                bookmarkServiceLib._loadAllBookmarks(
                  'userId1',
                  'paConfig1',
                  bookmarksTable,
                  connection,
                  (err, bookmarksAfter) => {
                    bookmarksBefore.bookmarks[0].BOOKMARK = bookmarksBefore.bookmarks[0].BOOKMARK.toString()
                    bookmarksAfter.bookmarks[0].BOOKMARK = bookmarksAfter.bookmarks[0].BOOKMARK.toString()
                    expect(
                      testUtils.toContainSameObjectsAsImpl(bookmarksBefore.bookmarks, bookmarksAfter.bookmarks)
                    ).toBeTruthy()
                    done()
                  }
                )
              }
            )
          }
        )
      })
    })

    it('deletes the bookmark with the specified ID', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._deleteBookmark(
          '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA',
          'userId2',
          'paConfig2',
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib._loadAllBookmarks(
              'userId2',
              'paConfig2',
              bookmarksTable,
              connection,
              (err, returnedBookmarks) => {
                const expectedBookmarks = [
                  {
                    bmkId: '775147E4-3AA1-4AAA-7D5D-12834ADE31AB',
                    BOOKMARKNAME: 'bookmark3',
                    BOOKMARK: '{stuff: smt3}',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    USER_ID: 'userId2',
                    VERSION: 'NoValue',
                    VIEWNAME: 'NoValue',
                  },
                ]
                delete returnedBookmarks.bookmarks[0][`viewname`]
                expect(
                  testUtils.toContainSameObjectsAsImpl(
                    convertBuffersToString(returnedBookmarks.bookmarks),
                    expectedBookmarks
                  )
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })
  })

  describe('updateBookmark()...', () => {
    it('changes the data of the bookmark with the given ID', done => {
      const id = '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA'
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._updateBookmark(
          id,
          '{stuff: newSmt}',
          'userId2',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          0,
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib.loadSingleBookmark(id, 'userId2', bookmarksTable, connection, (err, resultSet) => {
              expect(resultSet.bookmarks[0].bookmark).toBe('{stuff: newSmt}')
              done()
            })
          }
        )
      })
    })

    it('leaves the bookmark list unchanged if the given ID is not there', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._updateBookmark(
          'this-id-is-not-there',
          'new bookmark2',
          'userId2',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          0,
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib._loadAllBookmarks(
              'userId2',
              'paConfig2',
              bookmarksTable,
              connection,
              (err, returnedBookmarks) => {
                const expectedBookmarkData = [
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark2',
                    BOOKMARK: '{stuff: smt2}',
                    bmkId: '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark3',
                    BOOKMARK: '{stuff: smt3}',
                    bmkId: '775147E4-3AA1-4AAA-7D5D-12834ADE31AB',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                ]
                delete returnedBookmarks.bookmarks[0][`VIEWNAME`]
                delete returnedBookmarks.bookmarks[1][`VIEWNAME`]
                expect(
                  testUtils.toContainSameObjectsAsImpl(
                    convertBuffersToString(returnedBookmarks.bookmarks),
                    expectedBookmarkData
                  )
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })
  })

  describe('_renameBookmark()...', () => {
    it('changes the name of the bookmark with the given ID', done => {
      const id = '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA'
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._renameBookmark(
          id,
          'new bookmark2',
          'userId2',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib.loadSingleBookmark(id, 'userId2', bookmarksTable, connection, (err, resultSet) => {
              expect(resultSet.bookmarks[0].bookmarkname).toBe('new bookmark2')
              done()
            })
          }
        )
      })
    })

    it('leaves the bookmark list unchanged if the given ID is not there', done => {
      fillInTestData(testBookmarkData, (err, numLines) => {
        bookmarkServiceLib._renameBookmark(
          'this-id-is-not-there',
          'new bookmark2',
          'userId2',
          'paConfigId',
          'cdmConfigId',
          'cdmConfigVersion1',
          bookmarksTable,
          connection,
          (err, data) => {
            bookmarkServiceLib._loadAllBookmarks(
              'userId2',
              'paConfig2',
              bookmarksTable,
              connection,
              (err, returnedBookmarks) => {
                const expectedBookmarkData = [
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark2',
                    BOOKMARK: '{stuff: smt2}',
                    bmkId: '655147E4-DAA1-4EEE-8D5D-2A834ADE31AA',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                  {
                    USER_ID: 'userId2',
                    BOOKMARKNAME: 'bookmark3',
                    BOOKMARK: '{stuff: smt3}',
                    bmkId: '775147E4-3AA1-4AAA-7D5D-12834ADE31AB',
                    MODIFIED: 'NoValue',
                    SHARED: 'NoValue',
                    VERSION: 'NoValue',
                  },
                ]
                delete returnedBookmarks.bookmarks[0][`VIEWNAME`]
                delete returnedBookmarks.bookmarks[1][`VIEWNAME`]

                expect(
                  testUtils.toContainSameObjectsAsImpl(
                    convertBuffersToString(returnedBookmarks.bookmarks),
                    expectedBookmarkData
                  )
                ).toBeTruthy()
                done()
              }
            )
          }
        )
      })
    })
  })
})
