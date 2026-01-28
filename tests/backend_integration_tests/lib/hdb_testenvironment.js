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
* @param {PGConn} pgConn - PG Connection for connecting to PG DB
* @param {string}
*            schemaName Name of the test schema to be created
* @param {boolean}
*            randomizeSchemaName Flag deciding if the passed schema name should be supplemented with a random string
(default: false)
*/
function TestEnvironment(pgConn, schemaName, randomizeSchemaName) {
  var testSchemaName = schemaName || ''
  if (randomizeSchemaName) {
    testSchemaName += Math.floor(Math.random() * 1000000)
  }
  this.schema = testSchemaName
  this.tables = []
  this.tablesStructure = {}
  this.previousGlobalSettings = null
  this.pgConn = pgConn
}

/**
 * Test-environment initialization.
 *
 * Connects the HDB client then sets up the specified test schema.
 */
TestEnvironment.prototype.envSetup = async () => {
  await this.dropSchema()
  await this.createSchema()
}

/**
 * Clean up and remove test environment.
 */
TestEnvironment.prototype.envTeardown = async () => {
  try {
    await this.dropSchema()
  } catch (err) {
    console.log(`err on dropping schema: ${err}`)
  }
}

/**
 * Set up a new test schema with the already specified name
 *
 */
TestEnvironment.prototype.createSchema = async () => {
  var sqlCmd = 'CREATE SCHEMA "' + this.schema + '"'
  await this.executeSqlCommand(sqlCmd)
}

/**
 * Truncate all the tables from the test schema
 */
TestEnvironment.prototype.truncateSchema = async () => {
  if (this.noSchema()) {
    return new Error('No schema to truncate!')
  }
  if (this.tableListEmpty()) {
    return new Error('No stored tables to truncate!')
  }

  try {
    for (const tableName of this.tables) {
      await this.truncateTable(tableName)
    }
  } catch (err) {
    return err
  }
}

/**
 * Clone a set of tables to the test schema.
 *
 * @param {string} sourceSchema        Name of the schema holding the table to be cloned.
 * @param {array}  sourceTablePrefixes array of prefix strings used to filter which tables to clone, pass [""] for all prefixes
 */
TestEnvironment.prototype.cloneSchemaTables = async (sourceSchema, sourceTablePrefixes) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }

  // use passed or default table prefixes (to filter on tables to be cloned)
  var tablePrefixes
  var validTablePrefixesPassed =
    sourceTablePrefixes && sourceTablePrefixes instanceof Array && sourceTablePrefixes.length > 0
  if (!validTablePrefixesPassed) {
    return new Error('No table prefixes given')
  }
  tablePrefixes = sourceTablePrefixes // prefixes passed to function

  const tableNames = await this.getTableNamesInSchema(sourceSchema, tablePrefixes)

  for (const tableName of tableNames) {
    await this.createTable(sourceSchema, tableName, tableName)
  }
}

/**
 * Clear all the tables from the schema
 *
 */
TestEnvironment.prototype.clearSchema = async () => {
  for (const tableName of this.tables) {
    await this.clearTable(tableName)
  }
}

/**
 * Drop test schema
 *
 */
TestEnvironment.prototype.dropSchema = async () => {
  var sqlCmd = 'DROP SCHEMA "' + this.schema + '" CASCADE'
  await this.executeSqlCommand(sqlCmd)
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
 */
TestEnvironment.prototype.createTable = async (sourceSchema, sourceTable, newTable) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  var originTable = '"' + sourceSchema + '"."' + sourceTable + '"'
  var testTable = '"' + this.schema + '"."' + newTable + '"'
  var sqlCmd = 'CREATE TABLE ' + testTable + ' AS TABLE ' + originTable + ' WITH NO DATA'

  await this.executeSqlCommand(sqlCmd)

  this.tables.push(newTable)

  const result = await that.getTableColumns(sourceSchema, newTable)
  this.tablesStructure[newTable] = result
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
 */
TestEnvironment.prototype.copyInTable = async (sourceSchema, sourceTable, newTable) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  await this.createTable(sourceSchema, sourceTable, newTable)
}

/**
 * Register a pre-existing table in the set schema.
 *
 * @param {String} table name of the table to be registered
 */
TestEnvironment.prototype.registerTable = async table => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (this.tables.indexOf(table) < 0) {
    this.tables.push(table)
  }
  var that = this
  if (!this.tablesStructure[table]) {
    // keep an internal representation of the table structure
    this.tablesStructure[table] = await this.getTableColumns(this.schema, table)
  }
  // Call the callback but make sure we stay asynchronous
  return null
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
 */
TestEnvironment.prototype.fillTableFromCsv = async (table, csvPath) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (this.noTable(table)) {
    return new Error('No table ' + table + 'in cloned schema')
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = "IMPORT FROM CSV FILE '" + csvPath + "' INTO " + testTable
  await this.executeSqlCommand(sqlCmd)
}

/**
 * Insert some values into a table from the schema
 *
 * @param {string} tableName - name of table into which the data should be puts
 * @param {Object} jsonData - JSON object with each key-value pair corresponding to the column name and the value to be inserted
 */
TestEnvironment.prototype.insertIntoTable = async (tableName, jsonData) => {
  // Checks
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (this.noTable(tableName)) {
    return new Error('No table ' + tableName + ' in cloned schema ' + this.schema)
  }
  // Return early if if no data was passed
  if (Object.keys(jsonData).length === 0) {
    return null
  }
  for (var column in jsonData) {
    if ({}.hasOwnProperty.call(jsonData, column)) {
      if (this.noColumn(tableName, column)) {
        return new Error('No column ' + column + ' in table ' + tableName + 'in cloned schema')
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
  await this.executeSqlCommand(sqlCmd)
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
 */
TestEnvironment.prototype.clearTable = async table => {
  await this.truncateTable(table)
}

/**
 * Truncate a test table.
 *
 * @param {string}
 *            table Name of test table to be truncated.
 */
TestEnvironment.prototype.truncateTable = async table => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (this.noTable(table)) {
    return new Error('No table ' + table + 'in cloned schema')
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = 'TRUNCATE TABLE ' + testTable
  await this.executeSqlCommand(sqlCmd)
}

/**
 * Drop a test table.
 *
 * @param {string}
 *            table Name of test table to be dropped.
 */
TestEnvironment.prototype.dropTable = async table => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (this.noTable(table)) {
    return new Error('No table ' + table + 'in cloned schema')
  }
  var testTable = '"' + this.schema + '"."' + table + '"'
  var sqlCmd = 'DROP TABLE ' + testTable
  await this.executeSqlCommand(sqlCmd)
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
 */
TestEnvironment.prototype.createView = async (sourceSchema, viewName, viewDefinition) => {
  if (this.noSchema()) {
    return new Error('Cannot create table - no schema set!')
  }
  viewDefinition = viewDefinition.replace(new RegExp(sourceSchema, 'g'), this.schema)
  var testView = '"' + this.schema + '"."' + viewName + '"'
  var sqlCmd = 'CREATE VIEW ' + testView + ' AS ' + viewDefinition
  await this.executeSqlCommand(sqlCmd)
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
 */
TestEnvironment.prototype.createProcedure = async (
  sourceSchema,
  procedureName,
  procedureDefinition,
  procedurePrefixes
) => {
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
  await this.callSqlProcedure(procedureDefinition)
}

/**
 * Retrieve the names of a set of tables in a schema.
 *
 * @param {string} sourceSchema        Name of the schema holding the tables
 * @param {array}  tablePrefixes array of prefix strings used to filter which tables to clone, pass [""] for all prefixes
 */
TestEnvironment.prototype.getTableNamesInSchema = async (sourceSchema, tablePrefixes) => {
  // get list of all tables within schema
  var sqlCommand = `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = '${sourceSchema}' AND TABLE_TYPE = 'BASE TABLE'`
  logToConsole('Firing SQL to find table names: ' + sqlCommand)
  const rows = await this.executeSqlCommand(sqlCommand)

  logToConsole('Collecting table names from DB query result')
 
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
  return tableNames
}

/**
 * Get the info on the column is a given table.
 *
 * @param {String} schema - schema name
 * @param {String} tableName - table anme
 */
TestEnvironment.prototype.getTableColumns = async (schema, tableName) => {
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
    'SELECT table_name, column_name, data_type, ordinal_position',
    "FROM information_schema.columns WHERE table_schema='" + schema + "'",
    "AND table_name='" + tableName + "'",
    'GROUP BY table_name, column_name, data_type, ordinal_position',
    'ORDER BY ordinal_position'
  ].join(' ')

  const rows = await this.executeSqlCommand(sqlCommand)

  var result = {}
  rows.forEach(function (row) {
    result[row.column_name] = {
      position: row.ordinal_position,
      dataType: dataTypeMap[row.data_type]
    }
  })
  return result
}

/**
 * Carry out and commit an SQL command.
 *
 * @param {string}
 *            sqlCmd SQL command.
 */
TestEnvironment.prototype.executeSqlCommand = async sqlCmd => {
  return await this.executeSqlCommand(sqlCmd)
}

/**
 * Call an SQL procedure.
 *
 * @param {string} sqlProc  - SQL procedure
 * @param {Object} params  - paramter object (JSON)
 */
TestEnvironment.prototype.callSqlProcedure = async (sqlProc, params) => {
  return await this.pgConn.executeProcedure(sqlProc, params)
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
 */
TestEnvironment.prototype.cloneSchemaViews = async (sourceSchema, sourceViewPrefixes) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  if (!(sourceViewPrefixes && sourceViewPrefixes instanceof Array && sourceViewPrefixes.length > 0)) {
    return new Error('No table prefixes given!')
  }

  for (const prefix of sourceViewPrefixes) {
    const viewsForThisPrefix = await this._getPrefixedViewsInSchema(sourceSchema, prefix, sourceViewPrefixes)

    for (const view of viewsForThisPrefix) {
      await this.createView(sourceSchema, view.name, view.definition)
    }
  }
}

/*
 * Retrieve data on alls views with particular prefixes
 *
 * @private
 */
TestEnvironment.prototype._getPrefixedViewsInSchema = async (sourceSchema, curPrefix, viewPrefixes) => {
  var sqlCommand = `SELECT definition FROM pg_views WHERE schemaname = '${sourceSchema}' and viewname like '${curPrefix}%'`

  const resultRows = await this.executeSqlCommand(sqlCommand)

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
  return viewsForThisPrefix
}

/**
 * Create a procedure by cloning the structure of an existing procedure.
 *
 * @param {string} sourceSchema     Name of the schema holding the procedure to be cloned.
 * @param {array}  sourceProcedurePrefixes   array of prefix strings specifying which tables should be redirected in procedure
 */
TestEnvironment.prototype.cloneSchemaProcedures = async (sourceSchema, sourceProcedurePrefixes) => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  var procedurePrefixes = []
  if (sourceProcedurePrefixes && sourceProcedurePrefixes instanceof Array && sourceProcedurePrefixes.length > 0) {
    procedurePrefixes = sourceProcedurePrefixes // prefixes passed to function
  } else {
    return new Error('No table prefixes given')
  }

  for (const prefix of sourceProcedurePrefixes) {
    const proceduresForThisPrefix = await this._getPrefixedProceduresInSchema(sourceSchema, prefix)

    for (const procedure of proceduresForThisPrefix) {
      await this.createProcedure(sourceSchema, procedure.name, procedure.definition, procedurePrefixes)
    }
  }
}

/*
 * @private
 */
TestEnvironment.prototype._getPrefixedProceduresInSchema = async (sourceSchema, prefix) => {
  const sqlCommand = [
    `SELECT n.nspname AS schema_name, p.proname AS procedure_name, pg_get_functiondef(p.oid) AS definition`,
    `FROM pg_proc p LEFT JOIN pg_namespace n ON n.oid = p.pronamespace`,
    `WHERE p.prokind in ('p', 'f') AND n.nspname NOT IN ('pg_catalog', 'information_schema') and n.nspname = '${sourceSchema}' and p.proname like '${prefix}%'`,
    `ORDER BY schema_name, procedure_name`
  ].join(' ')

  const resultRows = await this.executeSqlCommand(sqlCommand)
  var inParams = {
    SCHEMANAME: sourceSchema,
    PREFIX: prefix
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
      prefix,
      definition: row.DEFINITION.toString('ascii') // NClob
    })
  })
  return proceduresForThisPrefix
}

/**
 * Grant SELECT access to the schema name for a given user
 *
 * @param {String} userName - name of user
 */
TestEnvironment.prototype.grantUserTestSchemaRights = async userName => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  var sqlString = 'GRANT SELECT ON SCHEMA "' + this.schema + '" TO ' + userName
  await this.executeSqlCommand(sqlString)
}

/**
 * Revoke SELECT access to the schema name for a given user
 *
 * @param {String} userName - name of user
 */
TestEnvironment.prototype.revokeUserTestSchemaRights = async userName => {
  if (this.noSchema()) {
    return new Error('No schema')
  }
  var sqlString = 'REVOKE SELECT ON SCHEMA "' + this.schema + '" FROM ' + userName
  await this.executeSqlCommand(sqlString)
}

module.exports = TestEnvironment
