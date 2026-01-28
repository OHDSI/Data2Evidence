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
BackendUplink.prototype.redirectQueriesToTestSchema = async function (schemaName) {
  var that = this

  // Retrieve stored settings
  async function getCurrentSettingsTask() {
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
    try {
      const res = await that.hanaRequest.request(retrieveQuery)
      if (res.response.statusCode !== 200) {
        return new Error('Failed to retrieve global settings!\nBody:\n' + JSON.stringify(res.data))
      }
      return res.data
    } catch (err) {
      return err
    }
  }

  // Load the default if the current setting don't look correct
  async function getDefaultSettingIfNeededTask(body) {
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
      try {
        const res = await that.hanaRequest.request(retrieveDefaultQuery)
        if (res.response.statusCode !== 200) {
          return new Error('Failed to retrieve default global settings!\nBody:\n' + res.data)
        }
        return res.data
      } catch (err) {
        return err
      }
    }
  }

  // Store the current settings and activate the test settings
  async function activateTestSettings(baseSettings) {
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
    try {
      const res = await that.hanaRequest.request(setQuery)
      if (res.response.statusCode !== 200) {
        return 
          new Error(
            'redirectQueriesToTestSchema - Failed to set global settings! Response code: ' +
              response.statusCode +
              '\nBody:\n' +
              JSON.stringify(res.data)
          )
      }
      return null
    } catch (err) {
      return err
    }
  }

  const body = await getCurrentSettingsTask()
  const baseSettings = await getDefaultSettingIfNeededTask(body)
  return await activateTestSettings(baseSettings)
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
BackendUplink.prototype.redirectQueriesBackToStandardSchema = async function () {
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
  try {
    const res = await this.hanaRequest.request(setQuery)
    if (res.response.statusCode !== 200) {
      return 
        new Error(
          'redirectQueriesBackToStandardSchema - Failed to set global settings! Response code: ' +
            response.statusCode +
            '\nBody:\n' +
            JSON.stringify(res.data)
        )
    }
    that.previousGlobalSettings = null
    return null
  } catch (err) { 
    return err
  }
}

/*
 * Add a new CDW configuration.
 */
BackendUplink.prototype.addCdwConfiguration = async function (config, configId, configName) {
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
    try {
    const res = await this.hanaRequest.request(setQuery)

    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', res.data)
      return new Error('Failed to activate CDW configuration!')
    } else if (res.data) {
      var fnPrintError = function (errors) {
        if (typeof errors === 'undefined') {
          return false
        }
        errors.forEach(function (err) {
          that.log('\t- ' + err.messageDefault)
        })
        return errors.length > 0
      }
      console.log(JSON.stringify(res.data.validationResult))
      if (
        fnPrintError(res.data.validationResult.cdmConfigValidationResult.errors) ||
        fnPrintError(res.data.validationResult.advancedConfigValidationResult.errors)
      ) {
        return new Error('Failed to activate CDW configuration!')
      }
    }
    return null
  } catch (err) {
    return err
  }
}

/*
 * Remove a CDW configuration.
 */
BackendUplink.prototype.removeCdwConfiguration = async function (configId) {
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
  try {
    const res = await this.hanaRequest.request(setQuery)
    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', body)
      return new Error('Failed to delete CDW configuration!')
    }
    return null
  } catch (err) {
    return err
  }
}

/*
 * Add a new MRI configuration.
 */
BackendUplink.prototype.addMriConfiguration = async function (mriConfig, mriConfigId, configName, cdwConfigId) {
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
  try {
    const res = await this.hanaRequest.request(setQuery)
    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', res.data)
      return new Error('Failed to activate MRI configuration!')
    } else if (res.data && res.data.errors && Array.isArray(res.data.errors) && res.data.errors.length !== 0) {
      that.log('MRI Config validation failed!')
    }
    return null
  } catch (err) {
    return err
  }
}

/*
 * Remove an MRI configuration.
 */
BackendUplink.prototype.removeMriConfiguration = async function (configId) {
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
  try {
    const res = await this.hanaRequest.request(setQuery)

    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', res.data)
      return new Error('Failed to delete MRI configuration!')
    }
    return null
  } catch (err) {
    return err
  }
}

/*
 * Add a new Patient Summary configuration.
 */
BackendUplink.prototype.addPatientConfiguration = async function (
  patientConfig,
  patientConfigId,
  configName,
  cdwConfigId
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
  try {
    const res = await this.hanaRequest.request(setQuery)
    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', res.data)
      return new Error('Failed to activate Patient Summary configuration!')
    } else if (res.data && res.data.errors && Array.isArray(res.data.errors) && res.data.errors.length !== 0) {
      that.log('Patient Summary Config validation failed!')
    }
    return null
  } catch (err) {
    return err
  }
}

/*
 * Remove an Patient Summary configuration.
 */
BackendUplink.prototype.removePatientConfiguration = async function (configId) {
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
  try {
    const res = await his.hanaRequest.request(setQuery)
    if (res.response.statusCode !== 200) {
      that.log('Non-200 reponse!', res.data)
      return new Error('Failed to delete Patient Summary configuration!')
    }
    return null
  } catch (err) {
    return err
  }
}

module.exports = BackendUplink
