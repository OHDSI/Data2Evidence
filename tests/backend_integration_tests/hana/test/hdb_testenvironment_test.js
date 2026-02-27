/* eslint-env node */

/**
 * Test suite for the HDB test_environment.
 */
/* eslint-disable no-unused-expressions */

;(function () {
  'use strict'

  var chai = require('chai')
  var expect = chai.expect
  var sinon = require('sinon')
  var sinonChai = require('sinon-chai')
  chai.use(sinonChai)

  var TestEnvironment = require('../lib/hdb_testenvironment')

  /*
   * Test suite for normalizeSql().
   */
  var testEnv
  describe('TESTENVIRONMENT TEST SUITE', function () {
    describe('TestEnvironment', function () {
      describe('constructor', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
        })

        it('can be called', function () {
          expect(testEnv).to.exist
        })

        it('is created with empty tables and tableStructures', function () {
          expect(testEnv.tables).to.be.empty
          expect(testEnv.tableStructures).to.be.empty
        })

        it('sets the internal hdbClient to the passed argument', function () {
          testEnv = new TestEnvironment('fakeClient')
          expect(testEnv.hdbClient).to.equal('fakeClient')
        })

        it('sets the test schema name to the passed value if randomization is not explicitly switched on (off by default)', function () {
          var testEnv1 = new TestEnvironment('fakeClient', 'someName')
          var testEnv2 = new TestEnvironment('fakeClient', 'someName', false)
          expect(testEnv1.schema).to.equal('someName')
          expect(testEnv2.schema).to.equal('someName')
        })

        it('sets the schema to the first argument plus a number of the second argument is true', function () {
          var testName = 'someName'
          var testEnv = new TestEnvironment('fakeClient', testName, true)
          var regex = new RegExp(testName + '\\d+')
          expect(testEnv.schema).to.match(regex)
        })
      })

      describe('envSetup()', function () {
        var fakeClient
        var testRows = [{ a: 1 }, { 2: 1 }]
        beforeEach(function () {
          fakeClient = {
            connect: sinon.stub().callsArg(0),
            exec: sinon.stub().callsArgWith(1, null, testRows),
            end: sinon.stub()
          }
          testEnv = new TestEnvironment(fakeClient, 'mySchema')
          sinon.stub(testEnv, 'envTeardown').callsArg(0)
          sinon.stub(testEnv, 'dropSchema').callsArg(0)
          sinon.stub(testEnv, 'createSchema').callsArg(0)
        })

        it('tries to drop the test schema', function (done) {
          testEnv.envSetup(function () {
            expect(testEnv.dropSchema).to.have.been.called
            done()
          })
        })

        it('sets up the test schema', function (done) {
          testEnv.envSetup(function () {
            expect(testEnv.createSchema).to.have.been.called
            done()
          })
        })
      })

      describe('envTeardown()', function () {
        var fakeClient
        var testRows = [{ a: 1 }, { 2: 1 }]
        beforeEach(function () {
          fakeClient = {
            connect: sinon.stub().callsArg(0),
            exec: sinon.stub().callsArgWith(1, null, testRows),
            end: sinon.stub()
          }
          testEnv = new TestEnvironment(fakeClient)
          sinon.stub(testEnv, 'dropSchema').callsArg(0)
          sinon.stub(testEnv, 'createSchema').callsArg(0)
        })

        it('tries to drop the test schema', function (done) {
          testEnv.schema = 'mySchema'
          testEnv.envTeardown(function () {
            expect(testEnv.dropSchema).to.have.been.called
            done()
          })
        })

        it('shuts down the HDB client', function (done) {
          testEnv.envTeardown(function () {
            expect(fakeClient.end).to.have.been.called
            done()
          })
        })
      })

      describe('dropSchema()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
        })

        it('does not execute SQL if no schema is set', function (done) {
          var myStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.dropSchema(function () {
            expect(myStub).not.to.have.been.called
            done()
          })
        })

        it('execute a DROP SCHEMA SQL command for the set schema', function (done) {
          var myStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.schema = 'mySchema'
          testEnv.dropSchema(function () {
            expect(myStub).to.have.been.called
            var sqlString = myStub.getCall(0).args[0]
            expect(sqlString).to.match(/DROP\s+SCHEMA.+mySchema/i)
            done()
          })
        })
      })

      describe('truncateSchema()', function () {
        var ttStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          ttStub = sinon.stub(testEnv, 'truncateTable').callsArg(1)
        })

        it('call the callback with an error if there are no stored tables', function (done) {
          testEnv.tables = []
          testEnv.truncateSchema(function (err) {
            expect(err).to.be.an('error')
            done()
          })
        })

        it('calls truncateTable() for each table in the schema', function (done) {
          testEnv.tables = ['tableA', 'tableB']
          testEnv.truncateSchema(function () {
            expect(ttStub).to.have.been.calledTwice
            expect(ttStub).to.have.been.calledWith('tableA')
            expect(ttStub).to.have.been.calledWith('tableB')
            done()
          })
        })
      })

      describe('createSchema()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
        })

        it('execute a CREATE SCHEMA SQL command for the set schema', function (done) {
          var myStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.schema = 'mySchema'
          testEnv.createSchema(function () {
            expect(myStub).to.have.been.called
            var sqlString = myStub.getCall(0).args[0]
            expect(sqlString).to.match(/CREATE\s+SCHEMA.+mySchema/i)
            done()
          })
        })
      })

      describe('clearSchema()', function () {
        var ctStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA', 'tableB']
          ctStub = sinon.stub(testEnv, 'clearTable').callsArg(1)
        })
        it('calls clearTable() for each table in the schema', function (done) {
          testEnv.clearSchema(function () {
            expect(ctStub).to.have.been.calledTwice
            expect(ctStub).to.have.been.calledWith('tableA')
            expect(ctStub).to.have.been.calledWith('tableB')
            done()
          })
        })
      })

      describe('createTable', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
          sinon.stub(testEnv, 'getTableColumns').callsArgWith(2, null, 'fake table structure')
        })

        it('executes a CREATE TABLE SQl statement that copies the tables between the specified schema', function (done) {
          var myStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.schema = 'mySchema'
          testEnv.createTable('mySourceSchema', 'mySourceTable', 'myNewTable', function () {
            var sqlString = myStub.getCall(0).args[0]
            var regex = new RegExp('CREATE.+TABLE.+"mySchema"."myNewTable".+"mySourceSchema"."mySourceTable"', 'i')
            expect(sqlString).to.match(regex)
            done()
          })
        })

        it('stores the table name in tables', function (done) {
          sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.schema = 'mySchema'
          testEnv.createTable('mySourceSchema', 'mySourceTable', 'myNewTable', function () {
            expect(testEnv.tables).to.include('myNewTable')
            done()
          })
        })

        it('stores the table information in tableStructures', function (done) {
          sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          testEnv.schema = 'mySchema'
          testEnv.createTable('mySourceSchema', 'mySourceTable', 'myNewTable', function () {
            expect(testEnv.tablesStructure).to.include.keys('myNewTable')
            done()
          })
        })
      })

      describe('cloneSchemaTables', function () {
        var gtnsStub
        var ctStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          var fakeTableNameArray = ['tableA', 'tableB']
          gtnsStub = sinon.stub(testEnv, 'getTableNamesInSchema').callsArgWith(2, null, fakeTableNameArray)
          ctStub = sinon.stub(testEnv, 'createTable').callsArg(3)
        })

        it('calls getTableNamesInSchema with the source schema and the source table prefixes', function (done) {
          testEnv.cloneSchemaTables('mySchema', ['prefA', 'prefB'], function () {
            expect(gtnsStub).to.have.been.calledWith('mySchema', ['prefA', 'prefB'])
            done()
          })
        })

        it('calls createTable() with each of the tables returned by getTableNamesInSchema()', function (done) {
          testEnv.cloneSchemaTables('mySchema', ['table'], function () {
            expect(ctStub).to.have.been.calledTwice
            expect(ctStub).to.have.been.calledWith('mySchema', 'tableA')
            expect(ctStub).to.have.been.calledWith('mySchema', 'tableB')
            done()
          })
        })
      })

      describe('copyInTable()', function () {
        var ctStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          ctStub = sinon.stub(testEnv, 'createTable').callsArg(3)
        })

        it('simply defers to createTable()', function (done) {
          testEnv.copyInTable('mySourceSchema', 'mySouceTable', 'myNewTable', function () {
            expect(ctStub).to.have.been.calledWith('mySourceSchema', 'mySouceTable', 'myNewTable')
            done()
          })
        })
      })

      describe('registerTable()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          sinon.stub(testEnv, 'getTableColumns').callsArgWith(2, null, 'fakeStruct')
        })

        it('adds the passed table to the internal list of tables if not already there', function (done) {
          testEnv.tables = ['oldTable']
          testEnv.registerTable('mySouceTable1', function () {
            expect(testEnv.tables).to.eql(['oldTable', 'mySouceTable1'])
            done()
          })
        })

        it('does not add tables to the internal list of tables if they are already there', function (done) {
          testEnv.tables = ['oldTable']
          testEnv.registerTable('oldTable', function () {
            expect(testEnv.tables).to.eql(['oldTable'])
            done()
          })
        })

        it('adds the result of calling getTableColumns() to the tableStructures list if the table is not already there', function (done) {
          testEnv.tablesStructure = { oldTable: 'oldStruct' }
          testEnv.registerTable('myTable', function () {
            expect(testEnv.tablesStructure).to.eql({ oldTable: 'oldStruct', myTable: 'fakeStruct' })
            done()
          })
        })

        it('does not add the result of calling getTableColumns() to the tableStructures list the table is already there', function (done) {
          testEnv.tablesStructure = { myTable: 'otherFakeStruct' }
          testEnv.registerTable('myTable', function () {
            expect(testEnv.tablesStructure).to.eql({ myTable: 'otherFakeStruct' })
            done()
          })
        })
      })

      describe('deregisterTable()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['justInTable', 'oldTable', 'otherOldTable']
          testEnv.tablesStructure = { oldTable: 2, otherOldTable: 3 }
        })

        it('remove table if registered', function () {
          testEnv.deregisterTable('oldTable')
          expect(testEnv.tables).to.eql(['justInTable', 'otherOldTable'])
        })

        it('throws an error if the table is not known', function () {
          var testFunc = function () {
            testEnv.deregisterTable('unuknownTable')
          }
          expect(testFunc).to.throw(Error)
        })

        it('remove any entries in tableStrctures for the table to be deregistered', function () {
          testEnv.deregisterTable('oldTable')
          testEnv.deregisterTable('justInTable')
          expect(testEnv.tablesStructure).to.eql({ otherOldTable: 3 })
        })
      })

      describe('truncateTable()', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA', 'tableB']
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
        })

        it('executes a TRUNCATE TABLE SQL command on the passed table', function (done) {
          testEnv.truncateTable('tableB', function () {
            expect(sqlStub).to.have.been.calledOnce
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/TRUNCATE\s+TABLE\s+\"someSchema\"\.\"tableB\"/i)
            done()
          })
        })
      })

      describe('dropTable()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA', 'tableB']
        })

        it('executes a DROP TABLE SQL command on the passed table', function (done) {
          var sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          sinon.stub(testEnv, 'deregisterTable')
          testEnv.dropTable('tableB', function () {
            expect(sqlStub).to.have.been.calledOnce
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/DROP\s+TABLE\s+\"someSchema\"\.\"tableB\"/i)
            done()
          })
        })

        it('deregisters the passed table', function (done) {
          sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
          var drtStub = sinon.stub(testEnv, 'deregisterTable')
          testEnv.dropTable('tableB', function () {
            expect(drtStub).to.have.been.calledOnce
            expect(drtStub).to.have.been.calledWith('tableB')
            done()
          })
        })
      })

      describe('fillTableFromCsv', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA', 'tableB']
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
        })

        it('executes an SQL IMPORT FROM CSV command that fills the specified table form the specified file', function (done) {
          testEnv.fillTableFromCsv('tableA', 'some/fake/path', function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/IMPORT\s+FROM\s+CSV\s+FILE/)
            expect(sqlString).to.match(/'some\/fake\/path'\s+INTO\s+"someSchema"\."tableA"/i)
            done()
          })
        })
      })

      describe('insertIntoTable()', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          testEnv.tablesStructure = {
            tableA: {
              colA: {
                position: 0,
                dataType: 'num'
              },
              colB: {
                position: 1,
                dataType: 'text'
              },
              colC: {
                position: 2,
                dataType: 'time'
              },
              colD: {
                position: 3,
                dataType: 'text'
              }
            }
          }
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
        })

        it('causes an INSERT INTO SQL command to be fired', function (done) {
          var testJson = { colA: 3.4, colD: 'd-text', colB: 'some text', colC: '1234-12-31 23:59:59.9999999' }
          testEnv.insertIntoTable('tableA', testJson, function () {
            var sqlString = sqlStub.getCall(0).args[0]
            var regEx = new RegExp('INSERT\\s+INTO\\s+' + testEnv.schema + '."tableA"')
            expect(sqlString).to.match(regEx)
            done()
          })
        })

        it('puts the values in the correct order (order of columns)', function (done) {
          var testJson = { colA: 3.4, colD: 'd-text', colB: 'some text', colC: '1234-12-31 23:59:59.9999999' }
          testEnv.insertIntoTable('tableA', testJson, function () {
            var sqlString = sqlStub.getCall(0).args[0]
            var columnsString = sqlString.match(/INTO[^\(]+\(((?:\s*"\w+",)*(?:\s*"\w+"))\)/)[1]
            var columns = columnsString.split(/\s*,\s*/)
            var valuesString = sqlString.match(/VALUES\s+\(([^\)]+)\)/)[1]
            var values = valuesString.split(/\s*,\s*/)
            var outputJson = {}
            // Match column names and values based on the order in which they appeared in the SQl string
            columns.forEach(function (column, index) {
              var cleanColumnName = column.replace(/"/g, '')
              var cleanValue = values[index].replace(/'/g, '')
              if (/^\d+?(?:\.\d+$)/.test(cleanValue)) {
                cleanValue = parseFloat(cleanValue)
              }
              outputJson[cleanColumnName] = cleanValue
            })
            // Check if the key-value matching is correct
            expect(outputJson).to.eql(testJson)
            done()
          })
        })
      })

      describe('_getValuesToInsertString()', function () {
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          testEnv.tablesStructure = {
            tableA: {
              colA: {
                position: 0,
                dataType: 'num'
              },
              colB: {
                position: 1,
                dataType: 'text'
              },
              colC: {
                position: 2,
                dataType: 'time'
              },
              noSuchColumn: {
                position: 3,
                dataType: 'text'
              }
            }
          }
        })

        it('correctly formats numbers', function () {
          var generatedString = testEnv._getValuesToInsertString('tableA', ['colA'], { colA: 3.4 })
          expect(generatedString).to.match(/\(\s*3.4\s*\)/)
        })

        it('correctly formats text', function () {
          var generatedString = testEnv._getValuesToInsertString('tableA', ['colB'], { colB: 'Some text' })
          expect(generatedString).to.match(/\(\s*'Some text'\s*\)/)
        })

        it('correctly formats times', function () {
          var generatedString = testEnv._getValuesToInsertString('tableA', ['colC'], {
            colC: '1234-12-31 23:59:59.9999999'
          })
          expect(generatedString).to.match(/\(\s*'1234-12-31 23:59:59.9999999'\s*\)/)
        })

        it('correctly inserts multiple columns', function () {
          var generatedString = testEnv._getValuesToInsertString('tableA', ['colA', 'colC'], {
            colA: 3.4,
            colB: 'Some text',
            colC: '1234-12-31 23:59:59.9999999'
          })
          expect(generatedString).to.match(/\(\s*3.4,\s*'1234-12-31 23:59:59.9999999'\s*\)/)
        })

        it('throws an error if there is no passed value for the specified column name (even there is a dataType)', function () {
          var testFunc = function () {
            testEnv._getValuesToInsertString('tableA', ['noSuchColumn'], {
              colA: 3.4,
              colB: 'Some text',
              colC: '1234-12-31 23:59:59.9999999'
            })
          }
          expect(testFunc).to.throw(Error)
        })
      })

      describe('createView()', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'testSchema'
          testEnv.tables = ['tableA']
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArg(1)
        })

        it('fires a CREATE VIEW SQL statement', function (done) {
          testEnv.createView('mySchema', 'myView', 'someDef', function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/CREATE\s+VIEW\s+/)
            done()
          })
        })

        it('replaces the source schema name with the internal name in the view definition', function (done) {
          var testViewDef = 'SELECT * FROM "sourceSchema"."someTable"'
          testEnv.createView('sourceSchema', 'myView', testViewDef, function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/SELECT\s+\*\s+FROM\s+\"testSchema\".\"someTable\"/)
            done()
          })
        })
      })

      describe('createProcedure()', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'testSchema'
          testEnv.tables = ['tableA']
          sqlStub = sinon.stub(testEnv, 'callSqlProcedure').callsArg(2)
        })

        it('replaces the source schema name with in the procedure definition', function (done) {
          var testProcDef = 'SELECT * FROM "sourceSchema"."someTable"'
          testEnv.createProcedure('sourceSchema', 'myProc', testProcDef, ['a', 'b'], function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/SELECT\s+\*\s+FROM\s+\"testSchema\".\"someTable\"/)
            done()
          })
        })

        it('replaces the source schema name with in the procedure definition', function (done) {
          var testProcDef = 'SELECT * FROM "sourceSchema"."someTable"'
          testEnv.createProcedure('sourceSchema', 'myProc', testProcDef, ['a', 'b'], function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/SELECT\s+\*\s+FROM\s+\"testSchema\".\"someTable\"/)
            done()
          })
        })

        it("attaches 'test.'' to the original procedure name", function (done) {
          var testProcDef =
            'CREATE PROCEDURE ProcWithResultView(IN id INT, OUT o1 CUSTOMER)\nLANGUAGE SQLSCRIPT\nREADS SQL DATA WITH RESULT VIEW ProcView AS\nBEGIN\no1 = SELECT * FROM CUSTOMER WHERE CUST_ID = :id;\nEND;'
          testEnv.createProcedure('sourceSchema', 'ProcWithResultView', testProcDef, ['a', 'b'], function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/CREATE\s+PROCEDURE\stest\.ProcWithResultView/)
            done()
          })
        })

        it("attaches 'test.'' to all the procedures being called if they start with one of the passed prefixes ", function (done) {
          var testProcDef =
            'CREATE PROCEDURE ProcWithResultView(IN id INT, OUT o1 CUSTOMER)\nLANGUAGE SQLSCRIPT\nREADS SQL DATA WITH RESULT VIEW ProcView AS\nBEGIN\no1 = SELECT * FROM CUSTOMER WHERE CUST_ID = :id;\nCALL "sourceSchema"."aSomething";\nCALL "sourceSchema"."cSomething";\nEND;'
          testEnv.createProcedure('sourceSchema', 'ProcWithResultView', testProcDef, ['a', 'b'], function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/CALL\s+"[^\."]+"\."test\.aSomething/g)
            expect(sqlString).to.match(/CALL\s+"[^\."]+"\."cSomething/g)
            done()
          })
        })
      })

      describe('getTableNamesInSchema', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          var testRows = [
            { '(TABLE_NAME)': 'abcd' },
            { '(TABLE_NAME)': 'bcd' },
            { '(TABLE_NAME)': 'cd' },
            { '(TABLE_NAME)': 'd' }
          ]
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArgWith(1, null, testRows)
        })

        it('executes a SELECT DISTINCT SQL command on the TABLE_COLUMNS table', function (done) {
          testEnv.getTableNamesInSchema('mySchema', ['a'], function () {
            var sqlArg = sqlStub.getCall(0).args[0]
            expect(sqlArg).to.match(/SELECT\s+DISTINCT.*FROM\s+TABLE_COLUMNS/i)
            done()
          })
        })

        it('passes the retrieved tables names which match the passed prefixes to the callback', function (done) {
          testEnv.getTableNamesInSchema('mySchema', ['a', 'b'], function (err, tableNames) {
            expect(tableNames).to.eql(['abcd', 'bcd'])
            done()
          })
        })
      })

      describe('getTableColumns', function () {
        var sqlStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA', 'tableB']
          var fakeRows = [
            { COLUMN_NAME: 'firstColumn', POSITION: 1, DATA_TYPE_NAME: 'NVARCHAR' },
            { COLUMN_NAME: 'secondColumn', POSITION: 2, DATA_TYPE_NAME: 'TIMESTAMP' },
            { COLUMN_NAME: 'thirdColumn', POSITION: 3, DATA_TYPE_NAME: 'INTEGER' }
          ]
          sqlStub = sinon.stub(testEnv, 'executeSqlCommand').callsArgWith(1, null, fakeRows)
        })

        it('calls the callback with an object that stores the column info using the column names as keys', function (done) {
          testEnv.getTableColumns('fakeSchema', 'fakeTable', function (err, result) {
            expect(result).to.have.all.keys('firstColumn', 'secondColumn', 'thirdColumn')
            done()
          })
        })
        it('calls the callback with an object for which each value contains the right positions', function (done) {
          testEnv.getTableColumns('fakeSchema', 'fakeTable', function (err, result) {
            expect(result.firstColumn.position).to.equal(1)
            expect(result.secondColumn.position).to.equal(2)
            expect(result.thirdColumn.position).to.equal(3)
            done()
          })
        })

        it('calls the callback with an object for which each value contains the converted SQL datatype', function (done) {
          testEnv.getTableColumns('fakeSchema', 'fakeTable', function (err, result) {
            expect(result.firstColumn.dataType).to.equal('text')
            expect(result.secondColumn.dataType).to.equal('time')
            expect(result.thirdColumn.dataType).to.equal('num')
            done()
          })
        })

        it('fires a SELECT SQL statement on the TABLE_COLUMNS table', function (done) {
          testEnv.getTableColumns('fakeSchema', 'fakeTable', function () {
            var sqlString = sqlStub.getCall(0).args[0]
            expect(sqlString).to.match(/SELECT.*FROM\s+TABLE_COLUMNS/i)
            done()
          })
        })
      })

      describe('executeSqlCommand()', function () {
        var fakeClient
        var testRows = [{ a: 1 }, { 2: 1 }]

        beforeEach(function () {
          fakeClient = {
            connect: sinon.stub().callsArg(0),
            exec: sinon.stub().callsArgWith(1, null, testRows),
            end: sinon.stub()
          }
          testEnv = new TestEnvironment(fakeClient)
        })

        it('execute the passed SQL via the client exec() function', function (done) {
          testEnv.executeSqlCommand('FAKE SQL', function () {
            expect(fakeClient.exec).to.have.been.calledWith('FAKE SQL')
            done()
          })
        })

        it('passes the returned rows to the passed callback', function (done) {
          testEnv.executeSqlCommand('FAKE SQL', function (err, rows) {
            expect(err).to.be.null
            expect(rows).to.eql(testRows)
            done()
          })
        })
      })

      describe('callSqlProcedure()', function () {
        var testParams = { x: 1, y: 'something' }
        var testRes1 = [{ a: 1 }, { b: 'abc' }]
        var testRes2 = [{ c: 3 }, { d: 'def' }]
        var fakeStatement = {
          exec: sinon.stub().callsArgWith(1, null, testParams, testRes1, testRes2),
          drop: sinon.stub()
        }
        var fakeClient = {
          connect: sinon.stub().callsArg(0),
          prepare: sinon.stub().callsArgWith(1, null, fakeStatement),
          end: sinon.stub()
        }

        beforeEach(function () {
          testEnv = new TestEnvironment(fakeClient)
        })

        it('creates a prepared statement using the passed procedure SQL', function (done) {
          testEnv.callSqlProcedure('FAKE PROCEDURE SQL', {}, function () {
            expect(fakeClient.prepare).to.have.been.calledWith('FAKE PROCEDURE SQL')
            done()
          })
        })

        it('calls the exec() function on the prepared statement with the passed paramters', function (done) {
          var fakeParams = { someVar: 1 }
          testEnv.callSqlProcedure('FAKE PROCEDURE SQL', fakeParams, function () {
            expect(fakeStatement.exec).to.have.been.calledWith(fakeParams)
            done()
          })
        })

        it('calls the pased callback with the parameters and the result sets returned by the procedure', function (done) {
          testEnv.callSqlProcedure('FAKE SQL', {}, function (err, arg1, arg2, arg3) {
            expect([arg1, arg2, arg3]).to.eql([testParams, testRes1, testRes2])
            done()
          })
        })
      })

      describe('cloneSchemaViews()', function () {
        var gpvisStub
        var cvStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          var testViews1 = [
            {
              name: 'view1',
              definition: 'def1'
            },
            {
              name: 'view2',
              definition: 'def2'
            }
          ]
          var testViews2 = [
            {
              name: 'view3',
              definition: 'def3'
            },
            {
              name: 'view4',
              definition: 'def4'
            },
            {
              name: 'view5',
              definition: 'def5'
            }
          ]
          gpvisStub = sinon.stub(testEnv, '_getPrefixedViewsInSchema')
          gpvisStub.onFirstCall().callsArgWith(3, null, testViews1)
          gpvisStub.onSecondCall().callsArgWith(3, null, testViews2)
          gpvisStub.onThirdCall().callsArgWith(3, null, [])
          cvStub = sinon.stub(testEnv, 'createView').callsArgWith(3, null)
        })

        it('calls the callback with an error if the prefixes are not given as a non-empty array', function (done) {
          testEnv.cloneSchemaViews('sourceSchema', 'not an array', function (err) {
            expect(err).not.to.be.null
            done()
          })
        })

        it('calls _getPrefixedViewsInSchema for each prefix passed', function (done) {
          testEnv.cloneSchemaViews('sourceSchema', ['p1', 'p2', 'p3'], function () {
            expect(gpvisStub).to.have.been.calledThrice
            done()
          })
        })

        it('calls createView() on each view returned by _getPrefixedViewsInSchema', function (done) {
          testEnv.cloneSchemaViews('sourceSchema', ['p1', 'p2'], function () {
            expect(cvStub).to.have.callCount(5)
            done()
          })
        })
      })

      describe('_getPrefixedViewsInSchema()', function () {
        var testParams
        var testRes
        var callStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          testParams = {
            SCHEMANAME: 'sourceSchema',
            PREFIX: 'pf'
          }
        })

        it('calls the SQL procedure GET_VIEV_DEFINITION', function (done) {
          testRes = [
            {
              VIEWNAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              VIEWNAME: 'prefName2',
              DEFINITION: 'someDef2'
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
          testEnv._getPrefixedViewsInSchema('sourceSchema', 'pf', ['pref'], function () {
            var sqlString = callStub.getCall(0).args[0]
            expect(sqlString).to.match(/CALL.*GET_VIEW_DEFINITION/i)
            done()
          })
        })

        it('passes the parameters as SCHEMANAME and PREFIX to the procedure GET_VIEV_DEFINITION', function (done) {
          testRes = [
            {
              VIEWNAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              VIEWNAME: 'prefName2',
              DEFINITION: 'someDef2'
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
          testEnv._getPrefixedViewsInSchema('sourceSchema', 'pf', ['pref'], function () {
            var actualParams = callStub.getCall(0).args[1]
            expect(actualParams).to.eql(testParams)
            done()
          })
        })

        it('ignores returned views with a name prefix not in the passed array', function (done) {
          testRes = [
            {
              VIEWNAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              VIEWNAME: 'prefName2',
              DEFINITION: 'someDef2'
            },
            {
              VIEWNAME: 'prefName3',
              DEFINITION: null
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
          testEnv._getPrefixedViewsInSchema('sourceSchema', 'pf', ['pref'], function (err, views) {
            expect(views.length).to.equal(2)
            done()
          })
        })

        it('ignores returned views with no definition', function (done) {
          testRes = [
            {
              VIEWNAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              VIEWNAME: 'prefName2',
              DEFINITION: 'someDef2'
            },
            {
              VIEWNAME: 'prefName3',
              DEFINITION: null
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
          testEnv._getPrefixedViewsInSchema('sourceSchema', 'pf', ['pref'], function (err, views) {
            expect(views.length).to.equal(2)
            done()
          })
        })

        it('extracts the name, prefix, and definition of returned views into an array of objects', function (done) {
          testRes = [
            {
              VIEWNAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              VIEWNAME: 'prefName2',
              DEFINITION: 'someDef2'
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
          testEnv._getPrefixedViewsInSchema('sourceSchema', 'pf', ['pref'], function (err, views) {
            var expectedViews = [
              {
                name: 'prefName1',
                definition: 'someDef1'
              },
              {
                name: 'prefName2',
                definition: 'someDef2'
              }
            ]
            expect(views).to.eql(expectedViews)
            done()
          })
        })
      })

      describe('cloneSchemaProcedures()', function () {
        var gppisStub
        var cpStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          var testProcs1 = [
            {
              name: 'proc1',
              definition: 'def1'
            },
            {
              name: 'proc2',
              definition: 'def2'
            }
          ]
          var testProcs2 = [
            {
              name: 'proc3',
              definition: 'def3'
            },
            {
              name: 'proc4',
              definition: 'def4'
            },
            {
              name: 'proc5',
              definition: 'def5'
            }
          ]
          gppisStub = sinon.stub(testEnv, '_getPrefixedProceduresInSchema')
          gppisStub.onFirstCall().callsArgWith(2, null, testProcs1)
          gppisStub.onSecondCall().callsArgWith(2, null, testProcs2)
          gppisStub.onThirdCall().callsArgWith(2, null, [])
          cpStub = sinon.stub(testEnv, 'createProcedure').callsArgWith(4, null)
        })

        it('calls the callback with an error if the prefixes are not given as a non-empty array', function (done) {
          testEnv.cloneSchemaProcedures('sourceSchema', 'not an array', function (err) {
            expect(err).not.to.be.null
            done()
          })
        })

        it('calls _getPrefixedProceduresInSchema for each prefix passed', function (done) {
          testEnv.cloneSchemaProcedures('sourceSchema', ['p1', 'p2', 'p3'], function () {
            expect(gppisStub).to.have.been.calledThrice
            done()
          })
        })

        it('calls createProcedure() on each view returned by _getPrefixedViewsInSchema', function (done) {
          testEnv.cloneSchemaProcedures('sourceSchema', ['p1', 'p2'], function () {
            expect(cpStub).to.have.callCount(5)
            done()
          })
        })
      })

      describe('_getPrefixedProceduresInSchema()', function () {
        var testParams
        var testRes
        var callStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          testEnv.tables = ['tableA']
          testParams = {
            SCHEMANAME: 'sourceSchema',
            PREFIX: 'pref'
          }
          testRes = [
            {
              PROCEDURENAME: 'prefName1',
              DEFINITION: 'someDef1'
            },
            {
              PROCEDURENAME: 'prefName2',
              DEFINITION: 'someDef2'
            },
            {
              PROCEDURENAME: 'prefName3',
              DEFINITION: null
            }
          ]
          callStub = sinon.stub(testEnv, 'callSqlProcedure').callsArgWith(2, null, testParams, testRes)
        })

        it('calls the SQL procedure GET_PROCEDURE_DEFINITION', function (done) {
          testEnv._getPrefixedProceduresInSchema('sourceSchema', 'pf', function () {
            var sqlString = callStub.getCall(0).args[0]
            expect(sqlString).to.match(/CALL.*GET_PROCEDURE_DEFINITION/i)
            done()
          })
        })

        it('passes the parameters as SCHEMANAME and PREFIX to the procedure', function (done) {
          testEnv._getPrefixedProceduresInSchema('sourceSchema', 'pref', function () {
            var actualParams = callStub.getCall(0).args[1]
            expect(actualParams).to.eql(testParams)
            done()
          })
        })

        it('ignores returned procedures with no definition', function (done) {
          testEnv._getPrefixedProceduresInSchema('sourceSchema', 'pf', function (err, procs) {
            ;+expect(procs.length).to.equal(2)
            done()
          })
        })

        it('extracts the name, prefix, and definition of returned procedures into an array of objects', function (done) {
          testEnv._getPrefixedProceduresInSchema('sourceSchema', 'pref', function (err, procs) {
            var expectedProcs = [
              {
                name: 'prefName1',
                prefix: 'pref',
                definition: 'someDef1'
              },
              {
                name: 'prefName2',
                prefix: 'pref',
                definition: 'someDef2'
              }
            ]
            expect(procs).to.eql(expectedProcs)
            done()
          })
        })
      })

      describe('grantUserTestSchemaRights()', function () {
        var callStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          callStub = sinon.stub(testEnv, 'executeSqlCommand').callsArgWith(1, null)
        })

        it('fires SQL to grant the specified user SELECT access to the test schema', function (done) {
          testEnv.grantUserTestSchemaRights('NOTAREALUSER', function () {
            var sqlString = callStub.getCall(0).args[0]
            expect(sqlString).to.match(/GRANT\s+SELECT\s+ON\s+SCHEMA\s+"someSchema"\s+TO\s+NOTAREALUSER/i)
            done()
          })
        })

        it('fires SQL to grant the specified user DELETE access to the test schema', function (done) {
          testEnv.grantUserTestSchemaRights('NOTAREALUSER', function () {
            var sqlString = callStub.getCall(0).args[0]
            expect(sqlString).to.match(/GRANT\s+SELECT\s+ON\s+SCHEMA\s+"someSchema"\s+TO\s+NOTAREALUSER/i)
            done()
          })
        })
      })

      describe('revokeUserTestSchemaRights()', function () {
        var callStub
        beforeEach(function () {
          testEnv = new TestEnvironment()
          testEnv.schema = 'someSchema'
          callStub = sinon.stub(testEnv, 'executeSqlCommand').callsArgWith(1, null)
        })

        it('fires SQL to revoke SELECT right of the specified to the test schema', function (done) {
          testEnv.revokeUserTestSchemaRights('NOTAREALUSER', function () {
            var sqlString = callStub.getCall(0).args[0]
            expect(sqlString).to.match(/REVOKE\s+SELECT\s+ON\s+SCHEMA\s+"someSchema"\s+FROM\s+NOTAREALUSER/i)
            done()
          })
        })
      })
    })
  })
})()
