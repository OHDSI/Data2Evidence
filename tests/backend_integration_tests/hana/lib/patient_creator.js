/* eslint-env node */

/**
 * @module patient_creator
 */

'use strict'

var utils = require('./utils')
var async = require('async')
var assert = require('assert')

// Define current logging behavior
var log = {
  debug: function () {
    // Just to have a no-op
  }
}

var insertPholderTableMap = {
  '@PATIENT': ['legacy.cdw.db.models::DWEntities.Patient_Attr'],
  '@PATIENT_KEY': ['legacy.cdw.db.models::DWEntities.Patient_Key'],
  '@INTERACTION': ['legacy.cdw.db.models::DWEntities.Interactions_Attr'],
  '@CODE': ['legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details'],
  '@MEASURE': ['legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures'],
  '@OBS': ['legacy.cdw.db.models::DWEntities.Observations_Attr'],
  '@TEXT': ['legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text']
}

/**
 * Patient creator class.
 *
 * @constructor
 * @param {string} schemaName - name of schema to write to
 * @param {Client} hdbClient - a HDB client to the DB
 * @param {Object} config - JSON object giving the data configuration
 */
function PatientCreator(schemaName, hdbClient, config) {
  this.schemaName = schemaName
  this.hdbClient = hdbClient
  this.config = config
}

/* "Statics" */
PatientCreator.insertPholderTableMap = insertPholderTableMap

/**
 * Replace $$ placeholder
 *
 * @param {String} infoValue - string in which to do the replacement
 * @param {String} requestValue - string to insert
 * @returns {String} - string with replacements done
 */
PatientCreator.getValue = function (infoValue, requestValue) {
  return infoValue.replace('$$', requestValue)
}

/**
 * Initialize the patient creator.
 *
 * This was pulled out of the constructor to avoid have an asynchronous
 * constructor.
 *
 * @param {Function} cb - callback
 */
PatientCreator.prototype.init = function (cb) {
  var that = this
  this.hdbClient.connect(function (err) {
    if (err) {
      return process.nextTick(cb, err)
    }
    that.getTables(that.schemaName, function (err, tables) {
      if (err) {
        return process.nextTick(cb, err)
      }
      that.tables = tables
      cb()
    })
  })
}

/**
 * Retrieve information about tables in a given schema.
 *
 * @param {String} schemaName - name of schema
 * @param {Function} cb - callback
 */
PatientCreator.prototype.getTables = function (schemaName, cb) {
  var sqlCommand = `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION
        FROM TABLE_COLUMNS WHERE SCHEMA_NAME='${schemaName}'
        GROUP BY TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION`
  var dataTypeMap = {
    NVARCHAR: 'text',
    TEXT: 'text',
    DATE: 'time',
    TIMESTAMP: 'time',
    SECONDDATE: 'time',
    DECIMAL: 'num',
    INTEGER: 'num',
    BIGINT: 'num',
    VARBINARY: 'binary'
  }
  var innerCb = function (err, rows) {
    if (err) {
      return cb(err)
    }
    var result = {}
    var tableName
    var columnName
    var dataType
    var position
    rows.forEach(function (row) {
      tableName = row.TABLE_NAME
      columnName = row.COLUMN_NAME
      dataType = row.DATA_TYPE_NAME
      position = row.POSITION
      if (!(tableName in result)) {
        result[tableName] = {}
      }
      result[tableName][columnName] = {
        position: position,
        dataType: dataTypeMap[dataType]
      }
    })
    cb(null, result)
  }
  this.executeSqlCommand(sqlCommand, innerCb)
}

/**
 * Extract the values needed to write a given value to the DB.
 *
 * @param {Object} configExpression - JSON object specifying the data to be written
 * @returns {Object} - JSON object with fields table, field, value, and pholder
 */
PatientCreator.prototype.extractPholderTableFieldValue = function (configExpression) {
  // Extract table placeholder, field, and value
  var regex = /(@\w+)\.(?:")?([\w\.]+)(?:")?\s*=\s*(\S+)\s*$/
  var match = configExpression.match(regex)
  assert(match, 'Cannot match config expression ' + configExpression + '!')
  var pholder = match[1]
  var fieldName = match[2]
  var value = match[3]
  // TODO: Find a way to avoid this ugly workaround, e.g. by making JSON walk function able to handle '.' in attribute names
  value = value.replace(/'(\S+)'/g, '$1')
  assert(pholder in PatientCreator.insertPholderTableMap, 'Unknown placeholder ' + pholder)
  var possibleTables = PatientCreator.insertPholderTableMap[pholder]
  for (var i = 0; i < possibleTables.length; i++) {
    var table = possibleTables[i]
    if (fieldName in this.tables[table]) {
      return {
        table: table,
        field: fieldName,
        value: value,
        pholder: pholder
      }
    }
  }
  throw new Error('Field ' + fieldName + ' not found in tables ' + possibleTables.join(', '))
}

/**
 * Write data to a table.
 *
 * @param {String} tableName - name of table to write to
 * @param {Object} jsonData - JSON object holding data to be written
 * @param {Function} cb - callback
 */
PatientCreator.prototype.insertIntoTable = function (tableName, jsonData, cb) {
  if (Object.keys(jsonData).length === 0) {
    process.nextTick(cb)
    return
  }
  // special cases to avoid not-null errors
  if (tableName === 'legacy.cdw.db.models::DWEntities.Patient_Attr') {
    jsonData.ValidFrom = jsonData.VALID_FROM || '1980-01-01T00:00:00.000Z'
  } else if (tableName === 'legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text') {
    jsonData.Lang = jsonData.LANG || 'EN'
    jsonData.InteractionTextID = utils.createDWID()
  }
  var that = this
  var fieldNames = Object.keys(jsonData)
  var getValueForField = function (fieldName) {
    var value = jsonData[fieldName]
    var type = that.tables[tableName][fieldName].dataType
    // Ensure that numerical values are stored as values
    if (type === 'num' && typeof value !== 'number') {
      value = parseFloat(value)
      // Ensure that binary values are stored accordingly
    } else if (type === 'binary') {
      value = Buffer.from(value, 'hex')
    }
    return value
  }
  var stmtParameters = fieldNames.map(getValueForField)
  // Required to handle CamelCase column names
  var joinedFieldNames =
    '(' +
    fieldNames
      .map(function (fieldName) {
        return '"' + fieldName + '"'
      })
      .join(', ') +
    ')'
  var joinedValuePlaceholders =
    '(' +
    Array.apply(null, Array(fieldNames.length))
      .map(function () {
        return '?'
      })
      .join(',') +
    ')'
  var fullTableName = this.schemaName + '."' + tableName + '"'
  var sqlCommand = ['INSERT INTO', fullTableName, joinedFieldNames, 'VALUES', joinedValuePlaceholders].join(' ')
  this.executeSqlStatement(sqlCommand, stmtParameters, cb)
}

/**
 * Create a new patient with interactions based on given patientJson.
 *
 * Only adds interactions from patientJson that match the "patient creation"
 * config (which is passed to the constructor of PatientCreator)! The optional
 * condId parameter is used as condition ID for all interactions under
 * "patient.conditions.acme".
 *
 * @param   {Object} patientJson A JSON object describing a patient and related
 *                               interactions. Its tree structure is similar to
 *                               config objects.
 * @param   {String} condId      (optional) A conditionID used for interactions
 *                               under "patient.conditions.acme".
 * @param {Function} cb - callback
 */
PatientCreator.prototype.addPatient = function (patientJson, condId, cb) {
  var requestIterator = utils.getRequestIterator(patientJson, this.config)
  this.addPatientFromRequestIterator(requestIterator, condId, cb)
}

/**
* Create a new patient with interactions based on given request iterator.
*
* Only adds interactions from patientJson that match the "patient creation"
* config (which is passed to the constructor of PatientCreator)! The optional
* condId parameter is used as condition ID for all interactions under
* "patient.conditions.acme".
*
* @param   {Object} requestIterator - a request iterator object that allows
*                                    access to the request and the associated
                                    config elemements.
* @param   {String} condId      (optional) A conditionID used for interactions
*                               under "patient.conditions.acme".
* @param {Function} cb - callback
*/
PatientCreator.prototype.addPatientFromRequestIterator = function (requestIterator, condId, cb) {
  var patientId = utils.createDWID()
  // Generate a condition ID if none is passed
  var conditionId = condId || utils.createDWID()
  // Collect patient attributes
  var patientAttributes = requestIterator.get('patient.attributes.*')
  var patientsObsDataArray = this._getPatientsObsDataArray(patientAttributes, patientId)
  var patientData = this._getPatientData(patientAttributes, patientId)
  var that = this
  // --- Async stuff below here.... ---
  // Function for writing observation patient attributes
  var writePatientObsAttrib = function (cb4) {
    log.debug('Writing patient observations')
    var obsTable = PatientCreator.insertPholderTableMap['@OBS'][0]
    async.each(
      patientsObsDataArray,
      function (curObsData, icb4) {
        that.insertIntoTable(obsTable, curObsData, icb4)
      },
      cb4
    )
  }
  // Function for writing normal (non-observation) patient attributes
  var writePatientAtrib = function (cb3) {
    log.debug('Writing patient attributes')
    var tableList = Object.keys(patientData)
    async.each(
      tableList,
      function (table, icb3) {
        that.insertIntoTable(table, patientData[table], icb3)
      },
      cb3
    )
  }
  // Function for writing patient interactions
  var writePatientInteraction = function (cb2) {
    log.debug('Writing patient interactions')
    var patientInteractions = requestIterator.get('patient.interactions.*.*')
    async.each(
      patientInteractions,
      function (interaction, icb2) {
        that.createInteraction(requestIterator, interaction, patientId, null, icb2)
      },
      cb2
    )
  }
  // Function for writing condition interactions
  var writeConditionInteraction = function (cb1) {
    log.debug('Writing patient condition interactions')
    var conditionInteractions = requestIterator.get('patient.conditions.*.interactions.*.*')
    async.each(
      conditionInteractions,
      function (interaction, icb1) {
        that.createInteraction(requestIterator, interaction, patientId, conditionId, icb1)
      },
      cb1
    )
  }
  // This callback is called when everything is done, passing the patient ID
  var finalCb = function (err) {
    cb(err, patientId)
  }
  // THIS IS WERE THE ACTUAL WORK HAPPENS
  async.parallel(
    [writePatientObsAttrib, writePatientAtrib, writePatientInteraction, writeConditionInteraction],
    finalCb
  )
}

/*
 * Retrieve data for patient observation attributes.
 *
 * @private
 */
PatientCreator.prototype._getPatientsObsDataArray = function (patientAttributes, patientId) {
  var that = this
  var patientsObsDataArray = []
  patientAttributes.forEach(function (attr) {
    var obsId = utils.createDWID()
    var obsData = {}
    if (attr.configValue.defaultInserts) {
      attr.configValue.defaultInserts.forEach(function (defaultIns) {
        var info = that.extractPholderTableFieldValue(defaultIns)
        // TODO: We always write into the same obsData object, so what happens if @OBS occurs multiple times?
        if (info.pholder === '@OBS') {
          if (Object.keys(obsData).length === 0) {
            obsData = {
              DWDateFrom: '1990-01-01T00:00:00',
              DWDateTo: null,
              DWAuditID: 1,
              DWID: obsId,
              DWID_Patient: patientId
            }
          }
          obsData[info.field] = PatientCreator.getValue(info.value, attr.requestValue)
        }
      })
    }
    if (Object.keys(obsData).length > 0) {
      patientsObsDataArray.push(obsData)
    }
  })
  return patientsObsDataArray
}

/*
 * Retrieve data for normal (non-observation) patient attributes.
 *
 * @private
 */
PatientCreator.prototype._getPatientData = function (patientAttributes, patientId) {
  var that = this
  var patientData = {}
  var patientTableName = PatientCreator.insertPholderTableMap['@PATIENT']
  var patientKeyTableName = PatientCreator.insertPholderTableMap['@PATIENT_KEY']
  patientData[patientTableName] = {
    DWID: patientId,
    DWDateFrom: '1990-01-01T00:00:00',
    DWDateTo: null,
    DWAuditID: 1
  }
  patientData[patientKeyTableName] = {
    DWID: patientId,
    DWSource: 'MRI01',
    DWAuditID: 1,
    PatientID: patientId
  }
  // Collect normal (non-observation) patient attributes
  patientAttributes.forEach(function (attr) {
    if (attr.configValue.defaultInserts) {
      attr.configValue.defaultInserts.forEach(function (defaultIns) {
        var info = that.extractPholderTableFieldValue(defaultIns)
        if (info.pholder !== '@OBS') {
          patientData[info.table][info.field] = PatientCreator.getValue(info.value, attr.requestValue)
        }
      })
    }
  })
  return patientData
}

/**
 * Create and write interaction attributes to the DB.
 *
 * @param {Object} attr - JSON object holding attribute information,
 * @param {String} interactionId - ID of associated interaction
 * @param {Function} cb - callback
 */
PatientCreator.prototype.createInteractionAttribute = function (attr, interactionId, cb) {
  var that = this
  var attrData = {
    DWID: interactionId,
    DWDateFrom: '1990-01-01T00:00:00',
    DWDateTo: null,
    DWAuditID: 1
  }
  if (attr.configValue.defaultInserts) {
    var table
    /* TODO: Unclear what happens if we have multiple default inserts since
        we then overwrite the "table" values and only keep the last one... */
    attr.configValue.defaultInserts.forEach(function (defaultIns) {
      var info = that.extractPholderTableFieldValue(defaultIns)
      table = info.table
      attrData[info.field] = PatientCreator.getValue(info.value, attr.requestValue)
    })
    if (table) {
      that.insertIntoTable(table, attrData, cb)
    } else {
      process.nextTick(cb)
      return
    }
  }
}

/**
 * Create and write an interaction to the DB.
 *
 * @param {Object} requestIterator - requestIterator for navigating request and associated config structure
 * @param {Object} interaction - JSOn object holding interaction data
 * @param {String} patientId - ID of associated patient
 * @param {String} conditionId - ID of associated condition
 * @param {Function} cb - callback
 */
PatientCreator.prototype.createInteraction = function (requestIterator, interaction, patientId, conditionId, cb) {
  var that = this
  var interactionId = utils.createDWID()
  var interactionData = {
    DWID: interactionId,
    DWDateFrom: '1990-01-01T00:00:00',
    DWDateTo: null,
    DWAuditID: 1
  }
  if (conditionId) {
    interactionData.DWID_Condition = conditionId
  }
  interactionData.DWID_Patient = patientId
  if (interaction.configValue.defaultInserts) {
    interaction.configValue.defaultInserts.forEach(function (defaultIns) {
      var info = that.extractPholderTableFieldValue(defaultIns)
      interactionData[info.field] = PatientCreator.getValue(info.value, interaction.requestValue)
    })
  }
  if (interaction.requestValue.hasOwnProperty('_start')) {
    interactionData.PeriodStart = interaction.requestValue._start
  }
  if (interaction.requestValue.hasOwnProperty('_end')) {
    interactionData.PeriodEnd = interaction.requestValue._end
  }
  var table = PatientCreator.insertPholderTableMap['@INTERACTION'][0]
  var innerCb = function () {
    // Get a list of all attributes
    var attributeList = requestIterator.get(interaction.requestPath + '.attributes.*')
    async.each(
      attributeList,
      function (attr, someOtherCb) {
        that.createInteractionAttribute(attr, interactionId, someOtherCb)
      },
      cb
    )
  }
  this.insertIntoTable(table, interactionData, innerCb)
}

/**
 * Carry out and commit an SQL command.
 *
 * @param {string}
 *            sqlCmd SQL command.
 * @param {Function} cb - callback
 */
PatientCreator.prototype.executeSqlCommand = function (sqlCmd, cb) {
  this.hdbClient.exec(sqlCmd, function (err, rows) {
    cb(err, rows)
  })
}

/**
 * Prepare an SQL statement and execute it with the passed paramters.
 *
 * @param {string}
 *            sqlCmd SQL command with value parameterPlaceholders
 * @param {Arrax} parameterArray - array of parameters (in correct order)
 * @param {Function} cb - callback
 */
PatientCreator.prototype.executeSqlStatement = function (sqlCmd, parameterArray, cb) {
  this.hdbClient.prepare(sqlCmd, function (err, statement) {
    statement.exec(parameterArray, function (err, rows) {
      cb(err, rows)
    })
  })
}

module.exports = PatientCreator
