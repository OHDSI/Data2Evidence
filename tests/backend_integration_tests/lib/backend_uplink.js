/* eslint-env node */
/* global process */

/**
 * Utilities for communicating with F4F and MRI via HTTP calls.
 *
 * @module backend_uplink
 *
 */

'use strict'

var async = require('async')

var utils = require('./utils')

/*
 * Test-environment object.
 *
 * @constructor
 * @param {HanaRequest} hanaRequest - HANA version of the Requet object from the library of the same name
 * @param {Boolean} loggingOn - if true, progress information will be logged to the console
 */
function BackendUplink(hanaRequest, loggingOn) {
  this.hanaRequest = hanaRequest
  this.previousGlobalSettings = null
  this.log = utils.getLogger(loggingOn, 'In backend_uplink: ')
}

/*
 * Check if a global setting object in non-empty.
 */
BackendUplink._areNonEmptyGlobalSettings = function (globalSettings) {
  if (typeof globalSettings === 'undefined') {
    return false
  }
  if (typeof globalSettings.tableMapping === 'undefined') {
    return false
  }
  return true
}

/*
 * Redirect calls by overriding the schema
 * 1: Call /hc/hph/config/services/global.xsjs with body {action: 'getGlobalSettings'}
 * 2: Take the returned settings and define a new setting JSON which is the same but with all schemas flipped to the test schema
 * 3. Call /hc/hph/config/services/global.xsjs with {action: 'setGlobalSettings', settings: [settings object]}
 */
BackendUplink.prototype.redirectQueriesToTestSchema = function (schemaName, cb) {
  var that = this

  // Retrieve stored settings
  function getCurrentSettingsTask(callback) {
    var retrieveQuery = {
      method: 'POST',
      path: '/hc/hph/config/services/global.xsjs',
      body: JSON.stringify({ action: 'loadGlobalSettings' }),
      contentType: 'application/json;charset=UTF-8',
      headers: {
        authorization: process.env.BEARER_TOKEN
      }
    }
    that.log('Retriving stored global configuration')
    that.hanaRequest.request(retrieveQuery, function (err, response, body) {
      if (err) {
        return callback(err)
      }
      if (response.statusCode !== 200) {
        return callback(new Error('Failed to retrieve global settings!\nBody:\n' + JSON.stringify(body)))
      }
      return callback(null, body)
    })
  }

  // Load the default if the current setting don't look correct
  function getDefaultSettingIfNeededTask(body, callback) {
    if (BackendUplink._areNonEmptyGlobalSettings(body)) {
      that.log('Found stored global settings')
      return process.nextTick(callback, null, body)
    } else {
      that.log('Did not find any stored global settings - retriving defaults')
      var retrieveDefaultQuery = {
        method: 'POST',
        path: '/hc/hph/config/services/global.xsjs',
        body: JSON.stringify({ action: 'getDefaultSettings' }),
        headers: {
          authorization: process.env.BEARER_TOKEN
        }
      }
      that.hanaRequest.request(retrieveDefaultQuery, function (err, response, body2) {
        if (err) {
          return callback(err)
        } else if (response.statusCode !== 200) {
          return callback(new Error('Failed to retrieve default global settings!\nBody:\n' + body2))
        }
        return callback(null, body2)
      })
    }
  }

  // Store the current settings and activate the test settings
  function activateTestSettings(baseSettings, callback) {
    that.previousGlobalSettings = JSON.parse(JSON.stringify(baseSettings))
    // Generate new (independent!) settings which redirect to test schema everywhere
    var newGlobalSettings = that._replaceSchemaName(baseSettings, schemaName)
    var setQuery = {
      method: 'POST',
      path: '/hc/hph/config/services/global.xsjs',
      body: JSON.stringify({
        action: 'setGlobalSettings',
        settings: newGlobalSettings
      }),
      headers: {
        authorization: process.env.BEARER_TOKEN
      }
    }
    that.log('Activating modified global settings')
    that.hanaRequest.request(setQuery, function (err, response, body) {
      if (err) {
        return callback(err)
      }
      if (response.statusCode !== 200) {
        return callback(
          new Error(
            'redirectQueriesToTestSchema - Failed to set global settings! Response code: ' +
              response.statusCode +
              '\nBody:\n' +
              JSON.stringify(body)
          )
        )
      }
      return callback(err)
    })
  }

  async.waterfall([getCurrentSettingsTask, getDefaultSettingIfNeededTask, activateTestSettings], cb)
}

/*
 * Reset the schema names in all references to tables and schemas.
 *
 * @private
 */
BackendUplink.prototype._replaceSchemaName = function (previousGlobalSettings, schemaName) {
  var newGlobalSettings = JSON.parse(JSON.stringify(previousGlobalSettings))
  var escapedTestTableNameWithDot = '"' + schemaName + '".'
  ;['tableMapping', 'guardedTableMapping'].forEach(function (key) {
    Object.keys(newGlobalSettings[key]).forEach(function (placeholder) {
      newGlobalSettings[key][placeholder] = newGlobalSettings[key][placeholder].replace(
        /^[^\.]+\./,
        escapedTestTableNameWithDot
      )
    })
  })
  delete newGlobalSettings.others
  newGlobalSettings.settings.sqlReturnOn = true
  newGlobalSettings.settings.errorDetailsReturnOn = true
  newGlobalSettings.settings.errorStackTraceReturnOn = true
  return newGlobalSettings
}

/*
 * Restore old schema settings, if available, otherwise reset to default values.
 */
BackendUplink.prototype.redirectQueriesBackToStandardSchema = function (cb) {
  var oldGlobalSettings = this.previousGlobalSettings
  oldGlobalSettings.configId = 'GlobalSettings'
  delete oldGlobalSettings.others
  var that = this
  var setQuery = {
    method: 'POST',
    path: '/hc/hph/config/services/global.xsjs',
    body: JSON.stringify({
      action: 'setGlobalSettings',
      settings: oldGlobalSettings
    }),
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Reverting global settings to state before tests')
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (err) {
      return cb(err)
    }
    if (response.statusCode !== 200) {
      return cb(
        new Error(
          'redirectQueriesBackToStandardSchema - Failed to set global settings! Response code: ' +
            response.statusCode +
            '\nBody:\n' +
            JSON.stringify(body)
        )
      )
    }
    that.previousGlobalSettings = null
    return cb(err)
  })
}

/*
 * Add a new CDW configuration.
 */
BackendUplink.prototype.addCdwConfiguration = function (config, configId, configName, cb) {
  var reqBody = {
    action: 'activate',
    configVersion: '1',
    config: config,
    configId: configId,
    configName: configName
  }
  var setQuery = {
    method: 'POST',
    path: '/hc/hph/cdw/config/services/config.xsjs',
    body: JSON.stringify(reqBody),
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }

  this.log('Storing and activating test CDW configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (err) {
      return cb(err)
    }
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to activate CDW configuration!'))
    } else if (body) {
      var fnPrintError = function (errors) {
        if (typeof errors === 'undefined') {
          return false
        }
        errors.forEach(function (err) {
          that.log('\t- ' + err.messageDefault)
        })
        return errors.length > 0
      }
      console.log(JSON.stringify(body.validationResult))
      if (
        fnPrintError(body.validationResult.cdmConfigValidationResult.errors) ||
        fnPrintError(body.validationResult.advancedConfigValidationResult.errors)
      ) {
        return cb(new Error('Failed to activate CDW configuration!'))
      }
    }
    cb(err)
  })
}

/*
 * Remove a CDW configuration.
 */
BackendUplink.prototype.removeCdwConfiguration = function (configId, cb) {
  var reqBody = {
    action: 'delete',
    configId: configId
  }
  var setQuery = {
    method: 'POST',
    path: '/hc/hph/cdw/config/services/config.xsjs',
    body: JSON.stringify(reqBody),
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Removing test CDW configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (err) {
      return cb(err)
    }
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to delete CDW configuration!'))
    }
    cb(err)
  })
}

/*
 * Add a new MRI configuration.
 */
BackendUplink.prototype.addMriConfiguration = function (mriConfig, mriConfigId, configName, cdwConfigId, cb) {
  var reqBody = {
    action: 'activate',
    config: mriConfig,
    configId: mriConfigId,
    configName: configName,
    dependentConfig: {
      configId: cdwConfigId,
      configVersion: '1'
    }
  }
  var setQuery = {
    method: 'POST',
    path: '/pa-config-svc/services/config.xsjs',
    body: JSON.stringify(reqBody),
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Storing and activating test MRI configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (err) {
      return cb(err)
    }
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to activate MRI configuration!'))
    } else if (body && body.errors && Array.isArray(body.errors) && body.errors.length !== 0) {
      that.log('MRI Config validation failed!')
    }
    cb(err)
  })
}

/*
 * Remove an MRI configuration.
 */
BackendUplink.prototype.removeMriConfiguration = function (configId, cb) {
  var reqBody = {
    action: 'delete',
    configId: configId,
    configVersion: 'A'
  }
  var setQuery = {
    method: 'POST',
    path: '/pa-config-svc/services/config.xsjs',
    body: JSON.stringify(reqBody),
    contentType: 'application/json;charset=UTF-8',
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Removing test MRI configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (err) {
      return cb(err)
    }
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to delete MRI configuration!'))
    }
    cb(err)
  })
}

/*
 * Add a new Patient Summary configuration.
 */
BackendUplink.prototype.addPatientConfiguration = function (
  patientConfig,
  patientConfigId,
  configName,
  cdwConfigId,
  cb
) {
  var reqBody = {
    action: 'activate',
    config: patientConfig,
    configId: patientConfigId,
    configName: configName,
    dependentConfig: {
      configId: cdwConfigId,
      configVersion: '1'
    }
  }
  var setQuery = {
    method: 'POST',
    path: '/hc/hph/patient/config/services/config.xsjs',
    body: JSON.stringify(reqBody),
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Storing and activating test Patient Summary configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to activate Patient Summary configuration!'))
    } else if (body && body.errors && Array.isArray(body.errors) && body.errors.length !== 0) {
      that.log('Patient Summary Config validation failed!')
    }
    cb(err)
  })
}

/*
 * Remove an Patient Summary configuration.
 */
BackendUplink.prototype.removePatientConfiguration = function (configId, cb) {
  var reqBody = {
    action: 'delete',
    configId: configId,
    configVersion: 'A'
  }
  var setQuery = {
    method: 'POST',
    path: '/hc/hph/patient/config/services/config.xsjs',
    body: JSON.stringify(reqBody),
    headers: {
      authorization: process.env.BEARER_TOKEN
    }
  }
  this.log('Removing test Patient Summary configuration')
  var that = this
  this.hanaRequest.request(setQuery, function (err, response, body) {
    if (response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return cb(new Error('Failed to delete Patient Summary configuration!'))
    }
    cb(err)
  })
}

module.exports = BackendUplink
