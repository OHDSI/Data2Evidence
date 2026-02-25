const { PGConnection } = require('./pg/pg-connection-lib')
const { HDBConnection } = require('./hdb/hdb-connection-lib')
var utils = require('./utils')

const dbDialect = process.env.DB_DIALECT ? process.env.DB_DIALECT : 'pg'

function createDBConnection(credentials) {
  const log = utils.getLogger(credentials.getLogStatus(), 'In db-connection-util: ')
  log(`DB dialect: ${dbDialect}`)
  if (dbDialect.uppercaseString() === 'PG') {
    // load PG lib
    return PGConnection.createConnection(credentials)
  } else if (dbDialect.uppercaseString() === 'HDB') {
    // load HDB lib
    return HDBConnection.createConnection(credentials)
  }
}

function getSystemCredentials(hostConfig) {
  let credentials = {}
  credentials.host = hostConfig.dbhost
  credentials.port = hostConfig.dbport
  credentials.user = hostConfig.system_user
  credentials.password = hostConfig.system_password
  if (dbDialect.uppercaseString() === 'PG') {
    credentials.database = hostConfig.database
  }

  return credentials
}

class DBConnection {
  constructor(user, password, host, port) {
    this.user = user
    this.password = password
    this.host = host
    this.port = port
  }

  /**
   * This is an abstract method to initialize connection
   */
  initConnection(cb) {}

  /**
   * This is an abstract method, will be implemented in the sub classes
   * @param {string}
   *            sqlCmd SQL command.
   * @param {function} cb - callback
   */
  executeSqlCommand(sqlCmd, cb) {}

  /**
   * Prepare an SQL statement and execute it with the passed paramters.
   *
   * @param {string}
   *            sqlCmd SQL command with value parameterPlaceholders
   * @param {Arrax} parameterArray - array of parameters (in correct order)
   * @param {Function} cb - callback
   */
  executeSqlStatement(sqlCmd, parameterArray, cb) {}
  
  /**
   * This is an abstract method, will be implemented in the sub classes
   *
   * @param {string} sqlProc  - SQL procedure
   * @param {Object} params  - paramter object (JSON)
   * @param {function} cb  - callback
   */
  callSqlProcedure(sqlProc, params, cb) {}

  /**
   * This is an abstract method to implementation (if any) to terminate the DB connection after processing remaining tasks
   */
  endConnection() {}
}

module.exports = { createDBConnection, getSystemCredentials, DBConnection }
