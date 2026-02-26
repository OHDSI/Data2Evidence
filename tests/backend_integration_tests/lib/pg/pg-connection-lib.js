const pg = require('pg')
const { Pool } = pg

function PGConnection(credentials) {
  this.database = credentials.database
  creadentials["max"] = 10
  this.pool = new Pool(credentials)
  this.client = null
}
/**
 * Initialize PG connection
 */
PGConnection.prototype.initConnection = cb => {
  try {
    this.pool.on('error', (err, client) => {
      if (err) {
        console.error('Unexpected error on idle client', err)
        client.release(true)
        cb(err)
      }
    })
  } catch (err) {
    err.stack
    cb(err)
  }
}

/**
 * Carry out and commit an SQL command.
 *
 * @param {string}
 *            sqlCmd SQL command.
 * @param {function} cb - callback
 */
PGConnection.prototype.executeSqlCommand = (sqlCmd, cb) => {
  console.log(`Query to be executed:\n${sqlCmd}`)
  try {
    this.pool.on('error', (err, client) => {
      if (err) {
        console.error('Unexpected error on idle client', err)
        client.release(true)
        cb(err)
      }
    })
    return this.pool.query(sqlCmd).then(res => {
      console.log(`Executed query:\n${sqlCmd}`)
      cb(null, res.rows)
    })
  } catch (err) {
    err.stack
    cb(err)
  }
}

/**
 * Prepare an SQL statement and execute it with the passed paramters.
 *
 * @param {string}
 *            sqlCmd SQL command with value parameterPlaceholders
 * @param {Arrax} parameterArray - array of parameters (in correct order)
 * @param {Function} cb - callback
 */
PGConnection.prototype.executeSqlStatement = (sqlCmd, parameterArray, cb) => {
  console.log(`Query to be executed:\n${query}`)
  console.log(`parameterArray:\n${parameterArray}`)

  return this.pool.query(sqlCmd, parameterArray).then(res => {
    console.log(`Executed query:\n${query}`)
    cb(null, res.rows)
  })
}

/**
 * Call an SQL procedure.
 *
 * @param {string} sqlProc  - SQL procedure
 * @param {Object} params  - paramter object (JSON)
 * @param {function} cb  - callback
 */
PGConnection.prototype.callSqlProcedure = (sqlProc, params, cb) => {
  console.log(`sqlProc:\n${sqlProc}`)
  console.log(`params:\n${params}`)
  try {
    this.pool.on('error', (err, client) => {
      if (err) {
        console.error('Unexpected error on idle client', err)
        client.release(true)
        cb(err)
      }
    })
    return this.pool.query(`CALL ${sqlProc}`, params).then(res => {
      console.log(`Executed query:\n${query}`)
      cb(null, res)
    })
  } catch (err) {
    err.stack
    cb(err)
  }
}

PGConnection.prototype.releaseClient = () => {
  console.log('Not implemented')
}

module.exports = { PGConnection }
