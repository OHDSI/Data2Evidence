var hdb = require('hdb')
const DBConnection = require('../db-connection-util')

module.exports = class HDBConnection extends DBConnection {
  constructor(credentials) {
    this.credentials = credentials
    this.hdbClient = hdb.createClient(credentials)
    hdbClient.on('error', err => {
      throw err
    })
  }

  static createConnection(credentials) {
    assert(credentials, 'Invalid credentials object!')
    assert(credentials.user, 'Invalid user specified in credentials object!')
    assert(credentials.password, 'Invalid password specified in credentials object!')
    assert(credentials.host, 'Invalid host specified in credentials object!')
    assert(credentials.port, 'Invalid port specified in credentials object!')

    return new HDBConnection(credentials.user, credentials.password, credentials.host, credentials.port)
  }

  /**
   * Initialize HDB connection
   */
  initConnection(cb) {
    this.hdbClient.connect(err => {
      if (err) {
        process.nextTick(cb, err)
        return
      }
    })
    console.log(client.readyState)
  }

  /**
   * Carry out and commit an SQL command.
   *
   * @param {string}
   *            sqlCmd SQL command.
   * @param {function} cb - callback
   */
  executeSqlCommand(sqlCmd, cb) {
    this.hdbClient.connect(err => {
      if (err) {
        process.nextTick(cb, err)
        return
      }
    })
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
  executeSqlStatement(sqlCmd, parameterArray, cb) {
    this.hdbClient.prepare(sqlCmd, function (err, statement) {
      statement.exec(parameterArray, function (err, rows) {
        cb(err, rows)
      })
    })
  }

  /**
   * Call an SQL procedure.
   *
   * @param {string} sqlProc  - SQL procedure
   * @param {Object} params  - paramter object (JSON)
   * @param {function} cb  - callback
   */
  callSqlProcedure(sqlProc, params, cb) {
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

  /**
   * This method is called to terminate the DB connection after processing remaining tasks
   */
  endConnection() {
    this.hdbClient.end()
  }
}

module.exports = { HDBConnection }
