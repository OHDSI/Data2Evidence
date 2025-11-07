/**
 * Module with utility functions of XSUnit testing.
 *
 * @module testenvironment
 */
import { DBConnectionUtil as dbConnectionUtil } from '@alp/alp-base-utils'
import async = require('async')
import IfAsync = require('if-async')
import fs = require('fs-extra')
import * as path from 'path'

function log(msg: any) {
  // console.log(msg)
}

/*
 *
 * @param schema
 * @param tableName
 * @returns {object} An object containing the columns of the table and the type of the columnsssss
 */
export function getTableColumns(connection, schema, tableName, callback) {
  let sql = [
    'SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION',
    "FROM TABLE_COLUMNS WHERE SCHEMA_NAME='" + schema + "'",
    "AND TABLE_NAME='" + tableName + "'",
    'GROUP BY TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION',
    'ORDER BY POSITION',
  ].join(' ')

  connection.executeQuery(sql, [], (err, rows) => {
    if (err) {
      callback(err, null)
    }
    let dataTypeMap = {
      NVARCHAR: 'text',
      VARCHAR: 'text',
      TEXT: 'text',
      SHORTTEXT: 'text',
      DATE: 'time',
      TIMESTAMP: 'time',
      DECIMAL: 'num',
      INTEGER: 'num',
    }

    let result = {}
    let columnName
    let dataType
    let position
    for (let i in rows) {
      columnName = rows[i].COLUMN_NAME
      dataType = rows[i].DATA_TYPE_NAME
      position = rows[i].POSITION

      result[columnName] = {
        position,
        dataType: dataTypeMap[dataType],
      }
    }
    callback(null, result)
  })
}

/**
 * Test-environment object.
 *
 * The optional flag can be used to randommize the schema names to avoid
 * conflicts when multiple test environment tests are run in parallel.
 * @param {string}  sSchemaName           Name of the test schema to be created
 * @param {boolean} [randomizeSchemaName] Flag deciding if the passed schema name should be supplemented with a
 *                                        random string (default: false)
 * @param {boolean} [isSchemaCreated]     Indicates whether the schema is already created (true) or not (false)
 **/
export class TestEnvironment {
  sTestSchemaName = null
  schema = null
  tables = []
  tablesStructure = {}
  dbConnection = null
  dbSchemaCreated = false

  constructor(public dialect, public xconnection, sSchemaName, randomizeSchemaName, isSchemaCreated, callback) {
    log('Loading schema details...')
    dbConnectionUtil.DBConnectionUtil.getConnection(dialect, xconnection, sSchemaName, (err, conn) => {
      this.dbConnection = conn
      this.sTestSchemaName = sSchemaName
      if (randomizeSchemaName) {
        this.sTestSchemaName += Math.floor(Math.random() * 1000000)
      }
      this.setup(this.sTestSchemaName, isSchemaCreated, callback)
    })
  }

  /**
   * Set up test environment.
   *
   * @param {string}
   *            sTestSchemaName Name of the test schema to be created
   */
  setup(sTestSchemaName, isSchemaCreated = false, callback) {
    // maybe teardown was forgotten after last setup
    this.setSchema(sTestSchemaName)

    if (isSchemaCreated) {
      // set the table list
      let that = this

      let sql =
        "SELECT DISTINCT(TABLE_NAME) FROM TABLES WHERE SCHEMA_NAME='" +
        sTestSchemaName +
        "' AND IS_USER_DEFINED_TYPE='FALSE'"
      this.dbConnection.executeQuery(sql, [], (err, rows) => {
        if (err) {
          throw err
        }
        let tasks = []

        for (let i in rows) {
          let table = rows[i]['(TABLE_NAME)']

          that.tables.push(table)
          let result = (table => {
            tasks.push(callback => {
              getTableColumns(that.dbConnection, sTestSchemaName, table, (err, rows) => {
                if (err) {
                  callback(err, null)
                } else {
                  that.tablesStructure[table] = rows
                  callback(null)
                }
              })
            })
          })(table)
        }

        async.series(tasks, (err, data) => {
          if (err) {
            throw err
          }

          callback(null, that)
        })
      })
    } else {
      callback(null, this)
    }
  }

  /**
   * Clean up and remove test environment.
   */
  teardown(callback) {
    if (typeof this.schema !== 'undefined') {
      try {
        this.dropSchema(callback)
      } catch (e) {} // eslint-disable-line no-empty
    }
  }

  /*
   * Carry out and commit an SQL command.
   *
   * @param {string}
   *            sqlCmd SQL command.
   */
  executeSqlCommand(sqlCmd, callback) {
    this.dbConnection.executeUpdate(sqlCmd, [], callback)
  }

  /*
   * Throw a TypeError if no schema is set.
   */
  throwIfNoSchema() {
    if (!this.schema) {
      throw new TypeError('No test schema set!')
    }
  }

  /*
   * Throw a TypeError if a given table is missing.
   */
  throwIfNoTable(table) {
    if (this.tables.indexOf(table) < 0) {
      throw new TypeError('Unknown table ' + table + '!')
    }
  }

  removeQuotes(table) {
    return table.indexOf(`"`) === -1 ? table : table.substr(1, table.length - 2)
  }

  /*
   * Throw a TypeError if a given column is missing from a given table
   */
  throwIfNoColumn(table, column) {
    if (!this.tablesStructure[table][column]) {
      throw new TypeError('Unknown column ' + column + ' in table ' + table + '!')
    }
  }

  /*
   * Choose the given schema as test schema.
   *
   * @param {string}
   *            schema Schema name
   */
  setSchema(schema) {
    this.schema = schema
  }

  /*
   * Set up a new test schema.
   *
   * @param {string}
   *            schema Schema name
   */
  createSchema(callback) {
    let sqlCmd = 'CREATE SCHEMA "' + this.schema + '"'
    this.executeSqlCommand(sqlCmd, callback)
  }

  /*
   * Create a table by cloning the structure of an existing table.
   *
   * @param {string}
   *            sourceSchema Name of the schema holding the table to be cloned.
   * @param {string}
   *            sourceTable Name of table to be cloned
   * @param {string}
   *            newTable Name to be given to the cloned table in the test schema.
   */
  createTable(sourceSchema, sourceTable, newTable, callback) {
    this.throwIfNoSchema()
    let self = this
    let originTable = '"' + sourceSchema + '"."' + sourceTable + '"'
    let testTable = '"' + this.schema + '"."' + newTable + '"'
    let sqlCmd = 'CREATE COLUMN TABLE ' + testTable + ' LIKE ' + originTable + ' WITH NO DATA'
    let that = this
    this.executeSqlCommand(sqlCmd, (err, rows) => {
      if (err) {
        callback(err)
      } else {
        self.tables.push(newTable)

        // keep an internal representation of the table structure
        getTableColumns(that.dbConnection, sourceSchema, newTable, (err, rows) => {
          if (err) {
            callback(err)
          }
          self.tablesStructure[newTable] = rows

          callback()
        })
      }
    })
  }

  /*
   * Create a view by cloning the structure of an existing view.
   *
   * @param {string}
   *            sourceSchema Name of the schema holding the view to be cloned.
   * @param {string}
   *            viewName to be given to the cloned view in the test schema.
   * @param {string}
   *            viewDefinition to be given to the cloned view in the test schema.
   */
  createView(sourceSchema, viewName, viewDefinition, callback) {
    this.throwIfNoSchema()

    viewDefinition = viewDefinition.toString('utf8').replace(new RegExp(sourceSchema, 'g'), this.schema)

    let testView = '"' + this.schema + '"."' + viewName + '"'
    let sqlCmd = 'CREATE VIEW ' + testView + ' AS ' + viewDefinition
    try {
      this.executeSqlCommand(sqlCmd, (err, data) => {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      })
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Create a procedure by cloning the structure of an existing procedure.
   * @param {string} sourceSchema Name of the schema holding the procedure to be cloned.
   * @param {string} procedureDefinition to be created in the new schema.
   */
  createProcedure(sourceSchema, procedureName, procedureDefinition, procedurePrefixes, callback) {
    this.throwIfNoSchema()
    let that = this
    let regex
    let procedureDefinitionStr = procedureDefinition.toString('utf8')
    procedurePrefixes.forEach(prefix => {
      regex = new RegExp('CALL "' + sourceSchema + '"."' + prefix)
      procedureDefinitionStr = procedureDefinitionStr.replace(regex, 'CALL "' + that.schema + '"."test.' + prefix)
    })
    procedureDefinitionStr = procedureDefinitionStr.replace(new RegExp(procedureName, 'g'), 'test.' + procedureName)
    procedureDefinitionStr = procedureDefinitionStr.replace(new RegExp(sourceSchema, 'g'), this.schema)

    try {
      this.executeSqlCommand(procedureDefinitionStr, (err, data) => {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      })
    } catch (err) {
      console.error(err)
    }
  }

  removeDuplicates(originalArray: string[]): string[] {
    let uniqueArray: string[] = []
    uniqueArray = originalArray.filter((elem, pos) => {
      return originalArray.indexOf(elem) === pos
    })
    return uniqueArray
  }

  removeDuplicateObjects(originalRows: any[], objectKeyName: string): any[] {
    let uniqueRows = []
    let objNames: string[] = []
    let uniqueObjNames: string[] = []
    for (let i in originalRows) {
      objNames.push(originalRows[i][objectKeyName])
    }

    uniqueObjNames = this.removeDuplicates(objNames)

    for (let i in uniqueObjNames) {
      for (let j in originalRows) {
        if (uniqueObjNames[i] === originalRows[j][objectKeyName]) {
          uniqueRows.push(originalRows[j])
          break
        }
      }
    }
    log(objectKeyName + ' rows:' + originalRows.length)
    log(objectKeyName + ' rows after removing duplicates:' + uniqueRows.length)
    return uniqueRows
  }

  /**
   * Create a table by cloning the structure of an existing table.
   * @param {string} sourceSchema        Name of the schema holding the table to be cloned.
   * @param {array}  sourceTablePrefixes array of prefix strings used to filter which tables to clone, pass [""] for all prefixes
   */

  cloneSchemaTables(sourceSchema, sourceTablePrefixes, callback) {
    let that = this
    this.throwIfNoSchema()

    // use passed or default table prefixes (to filter on tables to be cloned)
    let tablePrefixes
    if (sourceTablePrefixes && sourceTablePrefixes instanceof Array && sourceTablePrefixes.length > 0) {
      tablePrefixes = sourceTablePrefixes // prefixes passed to function
    } else {
      throw new Error('No default prefix defined!')
    }

    // get list of all tables within schema
    let sql = "SELECT DISTINCT(TABLE_NAME) FROM TABLES WHERE SCHEMA_NAME='" + sourceSchema + "'"

    this.dbConnection.executeQuery(sql, [], (err, rows) => {
      if (err) {
        callback(err)
      }
      // mark these tables for cloning (filtering based on prefixes)

      let tableNames = []
      for (let row in rows) {
        let tableName = rows[row]['(TABLE_NAME)']
        // filter out tables that are not matched by one of the table prefixes
        if (
          tablePrefixes.some(element => {
            return tableName.indexOf(element) === 0
          })
        ) {
          tableNames.push(tableName)
        }
      }

      let uniqueTableNames = that.removeDuplicates(tableNames)
      log('Total tables to be created: ' + uniqueTableNames.length)
      let tasks = []

      // clone tables previously marked
      uniqueTableNames.forEach(tableName => {
        tasks.push(callback => {
          that.createTable(sourceSchema, tableName, tableName, callback)
        })
      })
      async.parallel(tasks, err => {
        if (err) {
          callback(err)
        } else {
          log('Total tables created: ' + uniqueTableNames.length)
          callback()
        }
      })
    })
  }

  /**
   * Create a view by cloning the structure of an existing view.
   * @param {string} sourceSchema     Name of the schema holding the view to be cloned.
   * @param {array}  sourceViewPrefixes   array of prefix strings used to filter which views to clone, pass [""] for all prefixes
   */
  cloneSchemaViews(sourceSchema, sourceViewPrefixes, callback) {
    let that = this
    this.throwIfNoSchema()

    let viewCreationtasks = []

    // use passed or default prefixes (to filter on tables / views to be cloned)
    let viewPrefixes
    if (sourceViewPrefixes && sourceViewPrefixes instanceof Array && sourceViewPrefixes.length > 0) {
      viewPrefixes = sourceViewPrefixes // prefixes passed to function
    }
    // log("viewPrefixes:" + viewPrefixes);
    let allRows = []
    let tasks = []
    sourceViewPrefixes.forEach(prefix => {
      tasks.push(callback => {
        let sql = '_SYS_BIC."legacy.tests.db/GET_VIEW_DEFINITION"(?,?,?)'
        let params = { SCHEMANAME: sourceSchema, PREFIX: prefix }

        that.dbConnection.executeProc(sql, [params.SCHEMANAME, params.PREFIX], (err, rs) => {
          if (err) {
            callback(err)
            throw err
          }
          // log("#err: " + err);
          // log("#rows: " + rs.hdbResultSet.length);
          // log("JSON.stringify(rows):\n " + JSON.stringify(rs));
          log(rs)
          rs.forEach(row => allRows.push(row))
          // log("# of views[" + prefix + "]:" + rs.length);
          callback(err)
        })
      })
    })

    tasks.push(callback => {
      // mark these views for cloning (filtering based on prefixes)
      let viewNames = []

      let uniqueRows = that.removeDuplicateObjects(allRows, 'VIEWNAME')
      if (uniqueRows) {
        for (let i in uniqueRows) {
          let viewName = uniqueRows[i].VIEWNAME
          let viewDefinition = uniqueRows[i].DEFINITION // rs.getNClob(2);
          // log("viewName: " + viewName);
          //log("viewDefinition: " + viewDefinition);
          // filter out views that are not matched by one of the view prefixes
          if (
            viewPrefixes.some(element => {
              return viewName.indexOf(element) === 0
            })
          ) {
            if (!viewDefinition) {
              continue
            }
            viewNames.push({
              name: viewName,
              definition: viewDefinition,
            })
          }
        }
        log('Total views to be created:' + uniqueRows.length)

        // clone view previously marked
        viewNames.forEach(view => {
          viewCreationtasks.push(callback => {
            that.createView(sourceSchema, view.name, view.definition, callback)
          })
        })
        async.series(viewCreationtasks, callback)
      }
    })

    async.series(tasks, err => {
      if (err) {
        callback(err)
      } else {
        callback()
      }
    })
  }

  /**
   * Create a procedure by cloning the structure of an existing procedure.
   * @param {string} sourceSchema     Name of the schema holding the procedure to be cloned.
   * @param {array}  sourceProcedurePrefixes   array of prefix strings used to filter which procedures to clone, pass [""] for all prefixes
   */
  cloneSchemaProcedures(sourceSchema, sourceProcedurePrefixes, callback) {
    let that = this
    this.throwIfNoSchema()
    let procedureCreationtasks = []

    // use passed or default prefixes
    let procedurePrefixes = []
    if (sourceProcedurePrefixes && sourceProcedurePrefixes instanceof Array && sourceProcedurePrefixes.length > 0) {
      procedurePrefixes = sourceProcedurePrefixes // prefixes passed to function
    }
    // log("procedurePrefixes:" + procedurePrefixes);
    let tasks = []
    let allRows = []
    let procNames = []
    procedurePrefixes.forEach(prefix => {
      tasks.push(callback => {
        // sql = "CALL \"_SYS_BIC\".\"legacy.tests.db/GET_PROCEDURE_DEFINITION\"( " + sourceSchema + ", " + prefix + ", ?)";
        let sql = '_SYS_BIC."legacy.tests.db/GET_PROCEDURE_DEFINITION"(?,?,?)'
        let params = { SCHEMANAME: sourceSchema, PREFIX: prefix }

        that.dbConnection.executeProc(sql, [params.SCHEMANAME, params.PREFIX], (err, rs) => {
          // log("#err: " + err);
          // log("#rows: " + rs.hdbResultSet[0].length);
          // log("JSON.stringify(rows):\n " + JSON.stringify(rs));
          if (err) {
            callback(err, null)
            throw err
          }
          log(rs)
          rs.forEach(row => allRows.push(row))
          // log("# of procedures[" + params["PREFIX"] + "]:" + rs.hdbResultSet[0].length);
          callback(err, rs)
        })
      })
    })

    tasks.push(callback => {
      // mark these procedures for cloning (filtering based on prefixes)
      let procNames = []
      let uniqueRows = that.removeDuplicateObjects(allRows, 'PROCEDURENAME')
      if (allRows) {
        for (let i in uniqueRows) {
          let procName = uniqueRows[i].PROCEDURENAME
          let procDefinition = uniqueRows[i].DEFINITION
          // log("procName: " + procName);
          // log("procDefinition: " + procDefinition);
          // filter out procedures that are not matched by one of the prefixes
          if (
            procedurePrefixes.some(element => {
              return procName.indexOf(element) === 0
            })
          ) {
            if (!procDefinition) {
              continue
            }
            procNames.push({
              name: procName,
              definition: procDefinition,
            })
          }
        }
        log('Total procedures to be created:' + uniqueRows.length)

        // clone procedure previously marked
        procNames.forEach(proc => {
          procedureCreationtasks.push(callback => {
            that.createProcedure(sourceSchema, proc.name, proc.definition, procedurePrefixes, callback)
          })
        })
        async.series(procedureCreationtasks, callback)
      }
    })
    // log("tasks:" + tasks.length);

    async.series(tasks, err => {
      if (err) {
        callback(err)
      } else {
        callback()
      }
    })
  }

  /**
   * Add a new test table modeled on an existing table.
   * @param {string} sourceSchema Name of the schema holding the table to be cloned.
   * @param {string} sourceTable  Name of table to be cloned
   * @param {string} newTable     Name to be given to the cloned table in the test schema.
   */
  copyInTable(sourceSchema, sourceTable, newTable, callback) {
    this.throwIfNoSchema()
    this.createTable(sourceSchema, sourceTable, newTable, (err, results) => {
      if (err) {
        callback(err, null)
      }
    })
  }

  /**
   * Register a pre-existing table in the set schema.
   *
   * @param {String} table name of the table to be registered
   */
  registerTable(table, callback) {
    let self = this
    this.throwIfNoSchema()
    if (this.tables.indexOf(table) < 0) {
      this.tables.push(table)
    }

    if (!this.tablesStructure[table]) {
      // keep an internal representation of the table structure
      getTableColumns(this.dbConnection, this.schema, table, (err, rows) => {
        if (err) {
          throw err
        }
        self.tablesStructure[table] = rows
        callback(null, null)
      })
    }
  }

  /**
   * Deregister a table in the set schema from the test environment.
   *
   * @param {String} table name of the table to be deregistered
   */
  deregisterTable(table) {
    this.throwIfNoSchema()
    this.throwIfNoTable(table)

    let index = this.tables.indexOf(table)
    if (index > -1) {
      this.tables.splice(index, 1)
    }

    if (this.tablesStructure[table]) {
      delete this.tablesStructure[table]
    }
  }

  /**
   * Clear a test table.
   * @param {string} table Name of test table to be cleared.
   */
  clearTable(table, callback) {
    this.throwIfNoSchema()
    this.throwIfNoTable(table)
    let testTable = '"' + table + '"'
    let testSchema = '"' + this.sTestSchemaName + '"'
    let sqlCmd = 'TRUNCATE TABLE ' + testSchema + '.' + testTable
    this.executeSqlCommand(sqlCmd, (err, data) => {
      if (err) {
        console.error(err)
        throw err
      } else {
        callback(null, null)
      }
    })
  }

  /**
   * Clear a test table.
   * @param {string} table Name of test table to be cleared.
   */
  clearTables(tables, callback) {
    let that = this
    let tasks = []
    for (let i in tables) {
      let table = tables[i]
      let result = (table => {
        tasks.push(callback => {
          that.clearTable(table, callback)
        })
      })(table)
    }

    async.series(tasks, (err, data) => {
      if (err) {
        throw err
      }
      callback(null, null)
    })
  }

  /**
   * Clear all the tables from the schema
   */
  clearSchema(callback) {
    this.throwIfNoSchema()
    this.clearTables(this.tables, callback)
  }

  /**
   * Truncate a test table.
   * @param {string} table Name of test table to be truncated.
   */
  truncateTable(table) {
    this.throwIfNoSchema()
    this.throwIfNoTable(table)
    let testTable = '"' + table + '"'
    let sqlCmd = 'TRUNCATE TABLE ' + testTable

    this.executeSqlCommand(sqlCmd, () => {})
  }

  /**
   * Drop a test table.
   * @param {string} table Name of test table to be dropped.
   */
  dropTable(table, callback) {
    this.throwIfNoSchema()
    this.throwIfNoTable(table)
    let self = this
    let testTable = '"' + table + '"'
    let sqlCmd = 'DROP TABLE ' + testTable
    this.executeSqlCommand(sqlCmd, (err, data) => {
      if (err) {
        throw err
      }
      self.deregisterTable(table)
      callback(null, null)
    })
  }

  /*
   * Truncate all the tables from the schema
   *
   * @param {string}
   *            table Name of test table to be truncated.
   */
  truncateSchema() {
    this.throwIfNoSchema()

    let that = this

    this.tables.forEach(table => {
      that.truncateTable(table)
    })
  }

  /*
   * Fill a test table from a CSV file.
   *
   * @param {string}
   *            table Table name
   * @param csvPath
   */
  fillTableFromCsv(table, csvPath) {
    this.throwIfNoSchema()
    this.throwIfNoTable(table)
    let testTable = '"' + table + '"'
    let sqlCmd = "IMPORT FROM CSV FILE '" + csvPath + "' INTO " + testTable
    this.executeSqlCommand(sqlCmd, () => {})
  }

  /*
   * Insert some values into a table from the schema
   */
  insertIntoTable(tableName, jsonData, callback) {
    this.throwIfNoSchema()
    this.throwIfNoTable(tableName)
    for (let column in jsonData) {
      if ({}.hasOwnProperty.call(jsonData, column)) {
        this.throwIfNoColumn(tableName, column)
      }
    }

    if (Object.keys(jsonData).length === 0) {
      return
    }

    let tableColumns = this.tablesStructure[tableName]

    let fieldNames = Object.keys(jsonData)

    let joinedKeys = fieldNames
      .map(fieldName => {
        return "'" + jsonData[fieldName] + "'"
      })
      .join(', ')
    let joinedPlaceholders = []

    let allParameters = '(' + joinedKeys + ')'

    let escapedFieldNames = fieldNames.map(fieldName => {
      switch (fieldName) {
        case 'END':
          return '"END"'
        case 'START':
          return '"START"'
        default:
          return '"' + fieldName + '"'
      }
    })

    let sql = ['INSERT INTO ', '"' + tableName + '"', '(' + escapedFieldNames.join(', ') + ')', 'VALUES '].join(' ')

    let queryObj = sql + allParameters

    this.executeSqlCommand(queryObj, callback)
  }

  /*
   * Drop test schema
   */
  dropSchema(callback) {
    this.throwIfNoSchema()
    let sqlCmd = 'DROP SCHEMA "' + this.schema + '" CASCADE'
    this.executeSqlCommand(sqlCmd, callback)
  }
}

export function runPreTestTasks(testSchema, callback) {
  log('************** Running Pre-Test Tasks **************')
  let dbDetails = null
  let client = null
  let testEnvironment = null

  log('TestSchema: ' + testSchema)
  log('RootPath: ' + process.env.ROOTPATH)
  log('DB instance: ' + process.env.HANASERVER)

  let loadDBDetails = callback => {
    let filePath = path.join(process.env.ROOTPATH, 'spec/db-prefix-list.json')
    log('filePath: ' + filePath)
    fs.readJSON(filePath, (err, data) => {
      if (err) {
        console.error(err)
        callback(null)
      } else {
        dbDetails = data
        log('dbDetails:' + JSON.stringify(dbDetails))
        callback(null)
      }
    })
  }

  // defining the predicate for schema creation
  let isDBPrefixDetailsAvailable = callback => {
    if (
      dbDetails &&
      (dbDetails.tablePrefixes.length > 0 ||
        dbDetails.viewPrefixes.length > 0 ||
        dbDetails.procedurePrefixes.length > 0)
    ) {
      callback(null, true)
    } else {
      log('DB details file is not available/ prefixes are not defined, hence skipping the DB schema creation...')
      callback(null, false)
    }
  }

  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : 'SYSTEM',
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : 'Toor1234',
    dialect: 'hana',
  }

  let createDBConnection = callback => {
    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        callback(err)
      } else {
        log('Connection created...')
        client = c
        callback(null)
      }
    })
  }
  let initTestEnvironment = callback => {
    testEnvironment = new TestEnvironment(credentials.dialect, client, testSchema, false, false, (err, results) => {
      if (err) {
        callback(err)
      } else {
        log('Initialized TestEnvironment...')
        testEnvironment = results
        callback(null)
      }
    })
  }
  let createSchema = callback => {
    testEnvironment.createSchema((err, data) => {
      if (err) {
        console.error('Error in cloning schema tables!' + err)
        callback(err)
      } else {
        testEnvironment.dbSchemaCreated = true
        log('Test schema created[' + testSchema + '] ...')
        callback(null)
      }
    })
  }
  let cloneSchemaTables = callback => {
    if (!dbDetails.tablePrefixes || dbDetails.tablePrefixes.length === 0) {
      log('No prefix defined, no tables created...')
      callback(null)
    } else {
      testEnvironment.cloneSchemaTables('CDMDEFAULT', dbDetails.tablePrefixes, err => {
        if (err) {
          console.error('Error in cloning schema tables!' + err)
          callback(err)
        } else {
          log('Cloned SchemaTables...')
          callback()
        }
      })
    }
  }

  let cloneSchemaViews = callback => {
    if (!dbDetails.viewPrefixes || dbDetails.viewPrefixes.length === 0) {
      log('No prefix defined, no views created...')
      callback(null)
    } else {
      testEnvironment.cloneSchemaViews('CDMDEFAULT', dbDetails.viewPrefixes, err => {
        if (err) {
          console.error('Error in cloning schema views!' + err)
          callback(err)
        } else {
          log('Cloned SchemaViews...')
          callback()
        }
      })
    }
  }

  let cloneSchemaProcedures = callback => {
    if (!dbDetails.procedurePrefixes || dbDetails.procedurePrefixes.length === 0) {
      log('No prefix defined, no procedures created...')
      callback(null)
    } else {
      testEnvironment.cloneSchemaProcedures('CDMDEFAULT', dbDetails.procedurePrefixes, (err, results) => {
        if (err) {
          console.error('Error in cloning schema procedures!' + err)
          callback(err)
        } else {
          log('Cloned SchemaProcedures...')
          callback(null)
        }
      })
    }
  }

  // combine all DB creation tasks
  let createTestSchema = callback => {
    async.series(
      [
        createDBConnection,
        initTestEnvironment,
        createSchema,
        cloneSchemaTables,
        cloneSchemaViews,
        cloneSchemaProcedures,
      ],
      (err, data) => {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      }
    )
  }

  async.series([loadDBDetails, new IfAsync(isDBPrefixDetailsAvailable).then(createTestSchema)], (err, data) => {
    if (err) {
      console.error('Exception thrown during DB creation, hence triggering the cleanup tasks!\n' + err)
      runPostTestTasks(testEnvironment, (err, data) => {
        if (err) {
          console.error('Exception thrown while cleaning up the DB!')
          console.error(err.stack)
        } else {
          callback(null, null, null)
        }
      })
    } else {
      log('Pre-tasks completed...')
      callback(null, null, testEnvironment)
    }
  })
}

export function runPostTestTasks(testEnvironment, callback) {
  log('************** Running Post-Test Tasks **************')
  if (testEnvironment && testEnvironment.dbSchemaCreated) {
    testEnvironment.teardown((err, data) => {
      if (err) {
        callback(err, null)
      } else {
        log('Dropped test schema [' + testEnvironment.schema + ']...')
        callback(null, null)
      }
    })
  } else {
    log('No schema created, hence cleanup not required')
    callback(null, null)
  }
}

export function dropTestSchem(testSchema, callback) {
  log('************** Dropping test schema **************')
  let client = null
  let testEnvironment = null

  log('TestSchema: ' + testSchema)
  log('DB instance: ' + process.env.HANASERVER)

  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : 'SYSTEM',
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : 'Toor1234',
    dialect: 'hana',
  }

  let createDBConnection = callback => {
    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        callback(err)
      } else {
        log('Connection created...')
        client = c
        callback(null)
      }
    })
  }
  let initTestEnvironment = callback => {
    testEnvironment = new TestEnvironment(credentials.dialect, client, testSchema, false, false, (err, results) => {
      if (err) {
        callback(err)
      } else {
        log('Initialized TestEnvironment...')
        testEnvironment = results
        callback(null)
      }
    })
  }
  let dropSchema = callback => {
    testEnvironment.dropSchema((err, data) => {
      if (err) {
        callback(err)
      } else {
        log('Dropped schema[' + testSchema + '] ...')
        callback(null)
      }
    })
  }

  async.series([createDBConnection, initTestEnvironment, dropSchema], (err, data) => {
    if (err) {
      callback(err, null, null)
    } else {
      log('Completed dropping the test schema...')
      callback(null, null, testEnvironment)
    }
  })
}

export function truncateTestSchema(testSchema, callback) {
  log('************** truncating test schema **************')
  let client = null
  let testEnvironment = null

  log('TestSchema: ' + testSchema)
  log('DB instance: ' + process.env.HANASERVER)

  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : 'SYSTEM',
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : 'Toor1234',
    dialect: 'hana',
  }

  let createDBConnection = callback => {
    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        callback(err)
      } else {
        log('Connection created...')
        client = c
        callback(null)
      }
    })
  }
  let initTestEnvironment = callback => {
    testEnvironment = new TestEnvironment(credentials.dialect, client, testSchema, false, false, (err, results) => {
      if (err) {
        callback(err)
      } else {
        log('Initialized TestEnvironment...')
        testEnvironment = results
        callback(null)
      }
    })
  }
  let truncateSchema = callback => {
    testEnvironment.clearSchema((err, data) => {
      if (err) {
        callback(err)
      } else {
        log('Truncated schema[' + testSchema + '] ...')
        callback(null)
      }
    })
  }

  async.series([createDBConnection, initTestEnvironment, truncateSchema], (err, data) => {
    if (err) {
      callback(err, null, null)
    } else {
      log('Completed truncating the test schema...')
      callback(null, null, testEnvironment)
    }
  })
}
