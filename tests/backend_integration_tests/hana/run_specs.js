#!/usr/bin/env node
/**
 * Custom test runner for integration test using Mocha.
 *
 * Allows passing arguments that will be written to the config file read by the
 * test suites, setting the mocha reporter etc.
 *
 * @module run_specs
 *
 */

var DbSetupManager = require('./lib/db_setup_manager')
var utils = require('./lib//utils')

var Mocha = require('mocha')
var fs = require('fs')
var path = require('path')
var minimist = require('minimist')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * Get the directory where the specs are stored.
 *
 * @returns {String} - path to default folders for the specs
 */
function getSpecsDir() {
  return path.join(__dirname, '/specs')
}

/**
 * Get the patch to the updated config for the test suite.
 *
 * @returns {String} - path to default location for the configuration file read by the Mocha suite
 */
function getEnvironmentPath() {
  return path.join(getSpecsDir(), '.envir')
}

/**
 * Extra the options to be passed to Mocha from the total set of options.
 *
 * These options have labels of the form "mocha-X" where "X" is the name of the corresponding mocha option (e.g. "mocha-reporter" set the "reporter" option in Mocha).
 *
 * @param {Object} config - total config JSON Object
 * @returns {Object} - JSON option obejct for Mocha
 */
function getMochaOptions(config) {
  var mochaOpts = {}
  Object.keys(config).forEach(function (confKey) {
    var cleanKeyMatch = confKey.match(/^mocha-(.*)$/)
    if (cleanKeyMatch !== null) {
      mochaOpts[cleanKeyMatch[1]] = config[confKey]
    }
  })
  return mochaOpts
}

/**
 * Check if the passed key is valid, i.e. whether it is present in the environment.json file OR it is a Mocha option (format "mocha-X").
 *
 * @param {String} key - string key
 * @param {Object} config - total config JSON Object
 * @returns {Boolean} - true if valie
 */
function isValidKey(key, config) {
  return config.hasOwnProperty(key) || /^mocha-(.*)$/.test(key)
}

/**
 * Check if the passed key is valid, i.e. whether it is present in the environment.json file OR it is a Mocha option (format "mocha-X").
 *
 * @param {Object} defaultConfig - default config
 * @param {String[]} cmdArgs - command line arguments
 * @returns {Object} - config with the command line arguments merged in
 */
function mergeArguments(defaultConfig, cmdArgs) {
  var parsedArgs = minimist(cmdArgs)
  // Collects argument and overwrite default config as needed
  var mergedConfig = JSON.parse(JSON.stringify(defaultConfig))
  for (var key in parsedArgs) {
    if (isValidKey(key, mergedConfig)) {
      mergedConfig[key] = parsedArgs[key]
    } else if (key !== '_') {
      throw new Error('Did not recognize the argument "' + key + '"!')
    }
  }
  return mergedConfig
}

/**
 * Retrieve default config from file.
 *
 * @param {String} dirPath - directory path from which to read
 * @param {Object} fileName - name of config file
 * @returns {Object} - retrieved config
 */
function getDefaultConfig(dirPath, fileName) {
  var defaultEnvironmentPath = path.join(dirPath, fileName)
  var defaultConfig = JSON.parse(fs.readFileSync(defaultEnvironmentPath))
  return defaultConfig
}

/**
 * Write a JSON to a given file location.
 *
 * @param {String} writePath - locationto write to
 * @param {Object} jsonObj -  JSON object
 */
function writeJsonToFile(writePath, jsonObj) {
  fs.writeFileSync(writePath, JSON.stringify(jsonObj))
}

/**
 * Add test file to Mocha obejcts.
 *
 * @param {String} dirPath - directory path where test files are stored
 * @param {Object} config - config to store
 * @param {Mocha} mochaObj - Mocha suite object
 * @returns {Mocha} Mocha object with test files added
 */
function addTestFiles(dirPath, config, mochaObj) {
  var filePatternRegex = new RegExp(config.file_pattern)
  fs.readdirSync(dirPath)
    .filter(function (filePath) {
      return /\.js$/.test(filePath)
    })
    .filter(function (filePath) {
      return filePatternRegex.test(filePath)
    })
    .forEach(function (file) {
      mochaObj.addFile(path.join(dirPath, file))
    })
  return mochaObj
}

/**
 * Set up the test database.
 *
 * @param {SetupManager} dbSetupManager - setup manager object
 * @param {String} testSchemaName - name of test schema
 * @param {Function} cb - callback
 */
function setUpTestDatabase(dbSetupManager, testSchemaName, cb) {
  var TABLE_PREFIXES = [
    'legacy.collections.db',
    'legacy.ots',
    'legacy.config.db.models::',
    'legacy.cdw.db.models::',
    'legacy.cdw.db::',
    'legacy.di.model',
    'pa.db::'
  ]
  var VIEW_PREFIXES = ['legacy.cdw.db.models']
  cb(null)
}

/**
 * Tear down the test database.
 *
 * @param {SetupManager} dbSetupManager - setup manager object
 * @param {Function} cb - callback
 */
function tearDownTestDatabase(dbSetupManager, cb) {
  dbSetupManager.stopHdbClient()
  cb(null)
}

/**
 * Run the Mocha suite containing the current test suite.
 *
 * This function will force Node to quit with an exit code that indicates if there were failures or not.
 *
 * @param {Mocha} mochaSuite - Mocha test suite
 * @param {SetupManager} dbSetupManager - setup manager object
 * @param {Function} logger - logging function taking a string to log
 * @param {Function} cb - callback taking an err, a failure count and a logger function as arguments
 */
function runMochaSuite(mochaSuite, dbSetupManager, logger, cb) {
  logger('--- Entering HTTP test suite ---')
  var startTime = process.hrtime()
  mochaSuite.run(function (failures) {
    var timeDiff = process.hrtime(startTime)
    var durationInSec = timeDiff[0] + 1e-9 * timeDiff[1]
    logger('--- Exiting HTTP test suite (total runtime was ' + durationInSec.toFixed(1) + ' seconds) ---')
    fs.unlinkSync(getEnvironmentPath())
    logger('Tearing down test DB tables')
    tearDownTestDatabase(dbSetupManager, function (err) {
      logger('Closing DB connection')
      dbSetupManager.stopHdbClient()
      cb(err, failures, logger)
    })
  })
}

/**
 * Callback function for last exit actions.
 *
 * @param {Error} err - Error object (or Null, if no error)
 * @param {Number} failures - number of failed test in test suite
 * @param {Function} logger - logging function taking a string to log
 */
function exitCallback(err, failures, logger) {
  console.log(`===>failures: ${failures}`)
  console.log(`===>err: ${err}`)

  if (err) {
    // If an error occurred, exit with non-zero code
    failures = -1
  }
  logger('Exiting')
  // eslint-disable-next-line no-process-exit
  process.exit(failures) // exit with non-zero status if there were failures
}

// Program picks up here
/**
 * Run all specs.
 *
 * @param {String[]} cmdLineArgs - passed commandline args (e.g. process.argv.slice(2))
 */
function runSpecs(cmdLineArgs) {
  var testDir = path.join(__dirname, '/specs')
  var defaultConfig = getDefaultConfig(testDir, 'environment.json')
  var mergedConfig = mergeArguments(defaultConfig, cmdLineArgs)
  var environmentPath = getEnvironmentPath()
  var logger = utils.getLogger(mergedConfig.log, 'In run_specs: ')
  logger('Writing test suite config to file')
  writeJsonToFile(environmentPath, mergedConfig)
  var dbSetupManager = new DbSetupManager(environmentPath, 'test')
  logger('Running Mocha suite')
  var mochaOpts = getMochaOptions(mergedConfig)
  var mochaSuite = new Mocha(mochaOpts)
  addTestFiles(testDir, mergedConfig, mochaSuite)
  runMochaSuite(mochaSuite, dbSetupManager, logger, exitCallback)
}

runSpecs(process.argv.slice(2))
