/* eslint-env node */

/**
 * Module with utilities for setting up test schemas etc.
 *
 * @module testenvironment
 */
'use strict'

function logToConsole(msg) {
  // console.log('In hdb_environment: ' + msg);
}

var async = require('async')

/**
* Test-environment object.
*
* The optional flag can be used to randommize the schema names to avoid
* conflicts when multiple test environment tests are run in parallel.
*
* @constructor
* @param {HDB} hdbClient - HDB client for connecting to HANA
* @param {string}
*            schemaName Name of the test schema to be created
* @param {boolean}
*            randomizeSchemaName Flag deciding if the passed schema name should be supplemented with a random string
(default: false)
*/
function TestEnvironment(hdbClient, schemaName, randomizeSchemaName) {
  var testSchemaName = schemaName || ''
  if (randomizeSchemaName) {
    testSchemaName += Math.floor(Math.random() * 1000000)
  }
  this.schema = testSchemaName
  this.tables = []
  this.tablesStructure = {}
  this.previousGlobalSettings = null
  this.hdbClient = hdbClient
}

/**
 * Test-environment initialization.
 *
 * Connects the HDB client then sets up the specified test schema.
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.envSetup = function (cb) {
  var that = this
  this.hdbClient.connect(function (err) {
    if (err) {
      process.nextTick(cb, err)
      return
    }
    that.dropSchema(function () {
      // Ignore error - just means the schema wasn't there already
      that.createSchema(cb)
    })
  })
}

/**
 * Clean up and remove test environment.
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.envTeardown = function (cb) {
  var that = this
  this.dropSchema(function (err) {
    console.log(`err on dropping schema: ${err}`)
    that.hdbClient.end()
    cb(err)
  })
}

/**
 * Set up a new test schema with the already specified name
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.createSchema = function (cb) {
  var sqlCmd = 'CREATE SCHEMA "' + this.schema + '"'
  this.executeSqlCommand(sqlCmd, cb)
}

/**
 * Truncate all the tables from the test schema
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.truncateSchema = function (cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema to truncate!'))
    return
  }
  if (this.tableListEmpty()) {
    process.nextTick(cb, new Error('No stored tables to truncate!'))
    return
  }
  var that = this
  async.each(
    that.tables,
    function (tableName, errCallback) {
      that.truncateTable(tableName, errCallback)
    },
    function (err) {
      cb(err)
    }
  )
}

/**
 * Clone a set of tables to the test schema.
 *
 * @param {string} sourceSchema        Name of the schema holding the table to be cloned.
 * @param {array}  sourceTablePrefixes array of prefix strings used to filter which tables to clone, pass [""] for all prefixes
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.cloneSchemaTables = function (sourceSchema, sourceTablePrefixes, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  // use passed or default table prefixes (to filter on tables to be cloned)
  var tablePrefixes
  var validTablePrefixesPassed =
    sourceTablePrefixes && sourceTablePrefixes instanceof Array && sourceTablePrefixes.length > 0
  if (!validTablePrefixesPassed) {
    process.nextTick(cb, new Error('No table prefixes given'))
    return
  }
  tablePrefixes = sourceTablePrefixes // prefixes passed to function
  // clone tables previously marked
  var that = this
  var tableNamesCb = function (err, tableNames) {
    if (err) {
      return cb(err)
    }
    async.each(
      tableNames,
      function (tableName, errCallback) {
        that.createTable(sourceSchema, tableName, tableName, errCallback)
      },
      function (err) {
        cb(err)
      }
    )
  }
  this.getTableNamesInSchema(sourceSchema, tablePrefixes, tableNamesCb)
}

/**
 * Clear all the tables from the schema
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.clearSchema = function (cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var that = this
  async.each(
    that.tables,
    function (tableName, errCallback) {
      that.clearTable(tableName, errCallback)
    },
    function (err) {
      cb(err)
    }
  )
}

/**
 * Drop test schema
 *
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.dropSchema = function (cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var sqlCmd = 'DROP SCHEMA "' + this.schema + '" CASCADE'
  this.executeSqlCommand(sqlCmd, cb)
}

/**
 * Create a table by cloning the structure of an existing table.
 *
 * @param {string}
 *            sourceSchema Name of the schema holding the table to be cloned.
 * @param {string}
 *            sourceTable Name of table to be cloned
 * @param {string}
 *            newTable Name to be given to the cloned table in the test schema.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.createTable = function (sourceSchema, sourceTable, newTable, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var originTable = '"' + sourceSchema + '"."' + sourceTable + '"'
  var testTable = '"' + this.schema + '"."' + newTable + '"'
  var sqlCmd = 'CREATE COLUMN TABLE ' + testTable + ' LIKE ' + originTable + ' WITH NO DATA'
  var that = this
  var sqlCb = function (err) {
    if (err) {
      return cb(err)
    }
    that.tables.push(newTable)
    // keep an internal representation of the table structure
    var tableColumnsCb = function (err, result) {
      if (err) {
        return cb(err)
      }
      that.tablesStructure[newTable] = result
      cb()
    }
    that.getTableColumns(sourceSchema, newTable, tableColumnsCb)
  }
  this.executeSqlCommand(sqlCmd, sqlCb)
}

/**
 * Add a new test table modeled on an existing table.
 *
 * @param {string}
 *            sourceSchema Name of the schema holding the table to be cloned.
 * @param {string}
 *            sourceTable Name of table to be cloned
 * @param {string}
 *            newTable Name to be given to the cloned table in the test schema.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.copyInTable = function (sourceSchema, sourceTable, newTable, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  this.createTable(sourceSchema, sourceTable, newTable, cb)
}

/**
 * Register a pre-existing table in the set schema.
 *
 * @param {String} table name of the table to be registered
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.registerTable = function (table, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (this.tables.indexOf(table) < 0) {
    this.tables.push(table)
  }
  var that = this
  if (!this.tablesStructure[table]) {
    // keep an internal representation of the table structure
    this.getTableColumns(this.schema, table, function (err, tablesStructure) {
      if (err) {
        return cb(err)
      }
      that.tablesStructure[table] = tablesStructure
      cb()
    })
  } else {
    // Call the callback but make sure we stay asynchronous
    process.nextTick(cb)
    return
  }
}

/**
 * Deregister a table in the set schema from the test environment.
 *
 * @param {String} table - name of the table to be deregistered
 */
TestEnvironment.prototype.deregisterTable = function (table) {
  this.throwIfNoSchema()
  this.throwIfNoTable(table)
  var index = this.tables.indexOf(table)
  this.tables.splice(index, 1)
  if (this.tablesStructure[table]) {
    delete this.tablesStructure[table]
  }
}

/**
 * Fill a test table from a CSV file.
 *
 * @param {String}
 *            table  - Table name
 * @param {String} csvPath - path to file on the HANA DB machine
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.fillTableFromCsv = function (table, csvPath, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (this.noTable(table)) {
    process.nextTick(cb, new Error('No table ' + table + 'in cloned schema'))
    return
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = "IMPORT FROM CSV FILE '" + csvPath + "' INTO " + testTable
  this.executeSqlCommand(sqlCmd, cb)
}

/**
 * Insert some values into a table from the schema
 *
 * @param {string} tableName - name of table into which the data should be puts
 * @param {Object} jsonData - JSON object with each key-value pair corresponding to the column name and the value to be inserted
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.insertIntoTable = function (tableName, jsonData, cb) {
  // Checks
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (this.noTable(tableName)) {
    process.nextTick(cb, new Error('No table ' + tableName + ' in cloned schema ' + this.schema))
    return
  }
  // Return early if if no data was passed
  if (Object.keys(jsonData).length === 0) {
    process.nextTick(cb)
    return
  }
  for (var column in jsonData) {
    if ({}.hasOwnProperty.call(jsonData, column)) {
      if (this.noColumn(tableName, column)) {
        process.nextTick(cb, new Error('No column ' + column + ' in table ' + tableName + 'in cloned schema'))
        return
      }
    }
  }
  // Construct the correctly escaped list of fields (columns)
  var fieldNames = Object.keys(jsonData)
  var escapedFieldNames = fieldNames.map(function (fieldName) {
    switch (fieldName) {
      case 'END':
        return '"END"'
      case 'START':
        return '"START"'
      default:
        return '"' + fieldName + '"'
    }
  })
  // Construct the correctly escaped list of values to insert (same order as fields!!!)
  var valuesToInsert = this._getValuesToInsertString(tableName, fieldNames, jsonData)
  var sqlCmd = [
    'INSERT INTO ',
    this.schema + '."' + tableName + '"',
    '(' + escapedFieldNames.join(', ') + ')',
    'VALUES ',
    valuesToInsert
  ].join(' ')
  this.executeSqlCommand(sqlCmd, cb)
}

/*
 * Return the correctly escaped string containing the values to be inserted
 *
 * @private
 */
TestEnvironment.prototype._getValuesToInsertString = function (tableName, fieldNames, jsonData) {
  var tableColumns = this.tablesStructure[tableName]
  var joinedKeys = []
  var dataType
  fieldNames.forEach(function (fieldName) {
    if (!jsonData.hasOwnProperty(fieldName)) {
      throw new Error('No value passed for column name ' + fieldName)
    }
    dataType = tableColumns[fieldName].dataType
    switch (dataType) {
      case 'num':
        joinedKeys.push(jsonData[fieldName])
        break
      case 'text':
        joinedKeys.push("'" + jsonData[fieldName] + "'")
        break
      case 'time':
        joinedKeys.push("'" + jsonData[fieldName] + "'")
        break
      default:
        throw new Error('Unknown data type ' + dataType)
    }
  })
  var valuesToInsert = '(' + joinedKeys.join(', ') + ')'
  return valuesToInsert
}

/**
 * Clear a test table - redirects to truncate.
 *
 * @param {string}
 *            table Name of test table to be cleared.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.clearTable = function (table, cb) {
  this.truncateTable(table, cb)
}

/**
 * Truncate a test table.
 *
 * @param {string}
 *            table Name of test table to be truncated.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.truncateTable = function (table, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (this.noTable(table)) {
    process.nextTick(cb, new Error('No table ' + table + 'in cloned schema'))
    return
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = 'TRUNCATE TABLE ' + testTable
  this.executeSqlCommand(sqlCmd, cb)
}

/**
 * Drop a test table.
 *
 * @param {string}
 *            table Name of test table to be dropped.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.dropTable = function (table, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (this.noTable(table)) {
    process.nextTick(cb, new Error('No table ' + table + 'in cloned schema'))
    return
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = 'DROP TABLE ' + testTable
  this.executeSqlCommand(
    sqlCmd,
    function (err) {
      if (err) {
        return cb(err)
      }
      this.deregisterTable(table)
      cb()
    }.bind(this)
  )
}

/**
 * Create a view by cloning the structure of an existing view.
 *
 * @param {string}
 *            sourceSchema Name of the schema holding the view to be cloned.
 * @param {string}
 *            viewName to be given to the cloned view in the test schema.
 * @param {string}
 *            viewDefinition to be given to the cloned view in the test schema.
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.createView = function (sourceSchema, viewName, viewDefinition, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('Cannot create table - no schema set!'))
    return
  }
  viewDefinition = viewDefinition.replace(new RegExp(sourceSchema, 'g'), this.schema)
  var testView = '"' + this.schema + '"."' + viewName + '"'
  var sqlCmd = 'CREATE VIEW ' + testView + ' AS ' + viewDefinition
  this.executeSqlCommand(sqlCmd, cb)
}

/**
 * Create a view by cloning the structure of an existing view.
 *
 * @param {string}
 *            sourceSchema Name of the schema holding the view to be cloned.
 * @param {string}
 *            procedureName - name of procedure
 * @param {string}
 *            procedureDefinition  - string giving the procedure code
 * @param {String[]} procedurePrefixes - array containing the prefixes for all moved to the test schema
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.createProcedure = function (
  sourceSchema,
  procedureName,
  procedureDefinition,
  procedurePrefixes,
  cb
) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('Cannot create table - no schema set!'))
    return
  }
  var that = this
  var regex
  // For all prefixes, add '.test' to the prefix in the procedure
  procedurePrefixes.forEach(function (prefix) {
    regex = new RegExp('CALL "' + sourceSchema + '"."' + prefix)
    procedureDefinition = procedureDefinition.replace(regex, 'CALL "' + that.schema + '"."test.' + prefix)
  })
  // Attach 'test.' to the original procedure name
  procedureDefinition = procedureDefinition.replace(new RegExp(procedureName, 'g'), 'test.' + procedureName)
  // Replace the source schema name with the internal (test) schema
  procedureDefinition = procedureDefinition.replace(new RegExp(sourceSchema, 'g'), this.schema)
  this.callSqlProcedure(procedureDefinition, {}, cb)
}

/**
 * Retrieve the names of a set of tables in a schema.
 *
 * @param {string} sourceSchema        Name of the schema holding the tables
 * @param {array}  tablePrefixes array of prefix strings used to filter which tables to clone, pass [""] for all prefixes
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.getTableNamesInSchema = function (sourceSchema, tablePrefixes, cb) {
  // get list of all tables within schema
  var sqlCommand = "SELECT DISTINCT(TABLE_NAME) FROM TABLE_COLUMNS WHERE SCHEMA_NAME='" + sourceSchema + "'"
  var collectTableNames = function (err, rows) {
    logToConsole('Collecting table names from DB query result')
    if (err) {
      return cb(err)
    }
    var tableNames = []
    var tableName
    var hasRightPrefix
    rows.forEach(function (row) {
      tableName = row['(TABLE_NAME)']
      // filter out tables that are not matched by one of the table prefixes
      hasRightPrefix = tablePrefixes.some(function (prefix) {
        return tableName.substring(0, prefix.length) === prefix
      })
      if (hasRightPrefix) {
        tableNames.push(tableName)
      }
    })
    logToConsole('Finished collecting table names')
    cb(null, tableNames)
  }
  logToConsole('Firing SQL to find table names: ' + sqlCommand)
  this.executeSqlCommand(sqlCommand, collectTableNames)
}

/**
 * Get the info on the column is a given table.
 *
 * @param {String} schema - schema name
 * @param {String} tableName - table anme
 * @param {Function} cb - callback
 */
TestEnvironment.prototype.getTableColumns = function (schema, tableName, cb) {
  var dataTypeMap = {
    NVARCHAR: 'text',
    VARCHAR: 'text',
    TEXT: 'text',
    SHORTTEXT: 'text',
    DATE: 'time',
    TIMESTAMP: 'time',
    DECIMAL: 'num',
    INTEGER: 'num'
  }
  var sqlCommand = [
    'SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION',
    "FROM TABLE_COLUMNS WHERE SCHEMA_NAME='" + schema + "'",
    "AND TABLE_NAME='" + tableName + "'",
    'GROUP BY TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION',
    'ORDER BY POSITION'
  ].join(' ')
  var getColumnInfo = function (err, rows) {
    if (err) {
      return cb(err)
    }
    var result = {}
    rows.forEach(function (row) {
      result[row.COLUMN_NAME] = {
        position: row.POSITION,
        dataType: dataTypeMap[row.DATA_TYPE_NAME]
      }
    })
    cb(null, result)
  }
  this.executeSqlCommand(sqlCommand, getColumnInfo)
}

/**
 * Carry out and commit an SQL command.
 *
 * @param {string}
 *            sqlCmd SQL command.
 * @param {function} cb - callback
 */
TestEnvironment.prototype.executeSqlCommand = function (sqlCmd, cb) {
  this.hdbClient.exec(sqlCmd, function (err, rows) {
    cb(err, rows)
  })
}

/**
 * Call an SQL procedure.
 *
 * @param {string} sqlProc  - SQL procedure
 * @param {Object} params  - paramter object (JSON)
 * @param {function} cb  - callback
 */
TestEnvironment.prototype.callSqlProcedure = function (sqlProc, params, cb) {
  this.hdbClient.prepare(sqlProc, function (err, statement) {
    if (err) {
      process.nextTick(cb, err)
      return
    }
    statement.exec(params, function (err /* , output variables appear here*/) {
      statement.drop()
      if (err) {
        return cb(err)
      }
      // Collect all the output and pass it to the callback
      var returnVals = Array.prototype.slice.call(arguments, 1)
      var cbArgs = [null].concat(returnVals)
      cb.apply(null, cbArgs)
    })
  })
}

TestEnvironment.prototype.noSchema = function () {
  return !this.schema
}

/*
 * Throw a TypeError if no schema is set.
 */
TestEnvironment.prototype.throwIfNoSchema = function () {
  if (this.noSchema()) {
    throw new TypeError('No test schema set!')
  }
}

TestEnvironment.prototype.noTable = function (table) {
  return this.tables.indexOf(table) < 0
}

TestEnvironment.prototype.tableListEmpty = function () {
  return this.tables.length === 0
}

/*
 * Throw a TypeError if a given table is missing.
 */
TestEnvironment.prototype.throwIfNoTable = function (table) {
  if (this.noTable(table)) {
    throw new TypeError('Unknown table ' + table + '!')
  }
}

TestEnvironment.prototype.noColumn = function (table, column) {
  return !this.tablesStructure[table][column]
}

/*
 * Throw a TypeError if a given column is missing from a given table
 */
TestEnvironment.prototype.throwIfNoColumn = function (table, column) {
  if (this.noColumn(table, column)) {
    throw new TypeError('Unknown column ' + column + ' in table ' + table + '!')
  }
}

// -----------------------------------

/**
 * Create a view by cloning the structure of an existing view.
 *
 * @param {string} sourceSchema     Name of the schema holding the view to be cloned.
 * @param {array}  sourceViewPrefixes   array of prefix strings used to filter which views to clone, pass [''] for all prefixes
 * @param {function} cb - callback
 */
TestEnvironment.prototype.cloneSchemaViews = function (sourceSchema, sourceViewPrefixes, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  if (!(sourceViewPrefixes && sourceViewPrefixes instanceof Array && sourceViewPrefixes.length > 0)) {
    process.nextTick(cb, new Error('No table prefixes given!'))
    return
  }
  var that = this
  var addViewsForPrefix = function (prefix, innerCb) {
    that._getPrefixedViewsInSchema(sourceSchema, prefix, sourceViewPrefixes, function (err, viewsForThisPrefix) {
      if (err) {
        process.nextTick(innerCb, err)
        return
      }
      // Clone views previously marked
      var cloneTasks = viewsForThisPrefix.map(function (view) {
        return function (callback) {
          that.createView(sourceSchema, view.name, view.definition, callback)
        }
      })
      async.series(cloneTasks, innerCb)
    })
  }
  var addViewsTasks = sourceViewPrefixes.map(function (prefix) {
    return function (callback) {
      addViewsForPrefix(prefix, callback)
    }
  })
  async.series(addViewsTasks, cb)
}

/*
 * Retrieve data on alls views with particular prefixes
 *
 * @private
 */
TestEnvironment.prototype._getPrefixedViewsInSchema = function (sourceSchema, curPrefix, viewPrefixes, cb) {
  var sqlCommand = 'CALL "_SYS_BIC"."legacy.tests.db/GET_VIEW_DEFINITION"( ?, ?, ?)'
  var inParams = {
    SCHEMANAME: sourceSchema,
    PREFIX: curPrefix
  }
  this.callSqlProcedure(sqlCommand, inParams, function (err, inParamsUsed, resultRows) {
    if (err) {
      process.nextTick(cb, err)
      return
    }
    // mark these views for cloning (filtering based on prefixes)
    var viewsForThisPrefix = []
    resultRows.forEach(function (row) {
      // /??????? CHECK
      if (!row.DEFINITION) {
        return
      }
      viewsForThisPrefix.push({
        name: row.VIEWNAME,
        definition: row.DEFINITION.toString('ascii') // NClob
      })
    })
    cb(null, viewsForThisPrefix)
  })
}

/**
 * Create a procedure by cloning the structure of an existing procedure.
 *
 * @param {string} sourceSchema     Name of the schema holding the procedure to be cloned.
 * @param {array}  sourceProcedurePrefixes   array of prefix strings specifying which tables should be redirected in procedure
 * @param {function} cb - callback
 */
TestEnvironment.prototype.cloneSchemaProcedures = function (sourceSchema, sourceProcedurePrefixes, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var procedurePrefixes = []
  if (sourceProcedurePrefixes && sourceProcedurePrefixes instanceof Array && sourceProcedurePrefixes.length > 0) {
    procedurePrefixes = sourceProcedurePrefixes // prefixes passed to function
  } else {
    process.nextTick(cb, new Error('No table prefixes given'))
    return
  }
  var that = this
  var addProceduresForPrefix = function (prefix, innerCb) {
    that._getPrefixedProceduresInSchema(sourceSchema, prefix, function (err, proceduresForThisPrefix) {
      if (err) {
        return innerCb(err)
      }
      var procedureCloningTasks = proceduresForThisPrefix.map(function (procedure) {
        return function (callback) {
          that.createProcedure(sourceSchema, procedure.name, procedure.definition, procedurePrefixes, callback)
        }
      })
      async.series(procedureCloningTasks, innerCb)
    })
  }
  var addProcedureTasks = procedurePrefixes.map(function (prefix) {
    return function (callback) {
      addProceduresForPrefix(prefix, callback)
    }
  })
  async.series(addProcedureTasks, cb)
}

/*
 * @private
 */
TestEnvironment.prototype._getPrefixedProceduresInSchema = function (sourceSchema, prefix, cb) {
  var sqlCommand = 'CALL "_SYS_BIC"."legacy.tests.db/GET_PROCEDURE_DEFINITION"( ?, ?, ?)'
  var inParams = {
    SCHEMANAME: sourceSchema,
    PREFIX: prefix
  }
  this.callSqlProcedure(sqlCommand, inParams, function (err, inParamsUsed, resultRows) {
    if (err) {
      return cb(err)
    }
    // mark these procedures for cloning (filtering based on prefixes)
    var proceduresForThisPrefix = []
    resultRows.forEach(function (row) {
      // /??????? CHECK
      if (!row.DEFINITION) {
        return
      }
      proceduresForThisPrefix.push({
        name: row.PROCEDURENAME,
        prefix: inParams.PREFIX,
        definition: row.DEFINITION.toString('ascii') // NClob
      })
    })
    cb(null, proceduresForThisPrefix)
  })
}

/**
 * Grant SELECT access to the schema name for a given user
 *
 * @param {String} userName - name of user
 * @param {function} cb - callback
 */
TestEnvironment.prototype.grantUserTestSchemaRights = function (userName, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var sqlString = 'GRANT SELECT ON SCHEMA "' + this.schema + '" TO ' + userName
  this.executeSqlCommand(sqlString, cb)
}

/**
 * Revoke SELECT access to the schema name for a given user
 *
 * @param {String} userName - name of user
 * @param {function} cb - callback
 */
TestEnvironment.prototype.revokeUserTestSchemaRights = function (userName, cb) {
  if (this.noSchema()) {
    process.nextTick(cb, new Error('No schema'))
    return
  }
  var sqlString = 'REVOKE SELECT ON SCHEMA "' + this.schema + '" FROM ' + userName
  this.executeSqlCommand(sqlString, cb)
}

module.exports = TestEnvironment
