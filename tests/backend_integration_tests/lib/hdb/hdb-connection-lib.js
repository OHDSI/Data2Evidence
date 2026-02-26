var hdb = require('hdb')

function HDBConnection(credentials) {
  this.credentials = credentials
  this.hdbClient = hdb.createClient(credentials)
  this.hdbClient.on('error', err => {
    throw err
  })
}

/**
 * Initialize HDB connection
 */
HDBConnection.prototype.initConnection = cb => {
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
HDBConnection.prototype.executeSqlCommand = (sqlCmd, cb) => {
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
HDBConnection.prototype.executeSqlStatement = (sqlCmd, parameterArray, cb) => {
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
HDBConnection.prototype.callSqlProcedure = (sqlProc, params, cb) => {
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
HDBConnection.prototype.endConnection = () => {
  if (this.client) {
    this.hdbClient.end()
  }
}

module.exports = { HDBConnection }
