const pg = require('pg')
const format = require('pg-format')
const { Pool } = pg
var assert = require('assert')

class PGConnection extends DBConnection {
  constructor(user, password, host, port, database) {
    super(user, password, host, port)
    this.database = database

    this.pool = new Pool({
      user,
      password,
      host,
      port,
      database,
      // min: 3,
      max: 10
      // idleTimeoutMillis:5000,
      // maxLifetimeSeconds:10
    })
    this.client = null
  }

  static createConnection(credentials) {
    assert(credentials, 'Invalid credentials object!')
    assert(credentials.user, 'Invalid user specified in credentials object!')
    assert(credentials.password, 'Invalid password specified in credentials object!')
    assert(credentials.host, 'Invalid host specified in credentials object!')
    assert(credentials.port, 'Invalid port specified in credentials object!')
    assert(credentials.database, 'Invalid database specified in credentials object!')

    return new PGConnection(
      credentials.user,
      credentials.password,
      credentials.host,
      credentials.port,
      credentials.database
    )
  }

  /**
   * Initialize PG connection
   */
  initConnection(cb) {
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
  executeSqlCommand(query, cb) {
    console.log(`Query to be executed:\n${query}`)
    try {
      this.pool.on('error', (err, client) => {
        if (err) {
          console.error('Unexpected error on idle client', err)
          client.release(true)
          cb(err)
        }
      })
      return this.pool.query(query).then(res => {
        console.log(`Executed query:\n${query}`)
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
  executeSqlStatement(sqlCmd, parameterArray, cb) {
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
  callSqlProcedure(sqlProc, params, cb) {
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

  async releaseClient() {
    if (this.client) {
      await this.client.end()
    }
  }

  async executeStatement(schema, table, columns, data) {
    const query = `INSERT INTO "${schema}"."${table}" (%I) VALUES %L`
    const finalQuery = format(query, columns, data)
    return await executeQuery(finalQuery)
  }
}

/**
 * Get the PD DB SYSTEM login data for the PG connection
 *
 * @returns {Object} - JSON object with the login details
 */
HostConfig.prototype.getPGSystemCredentials = function () {
  var credentials = {}
  credentials.host = this.dbhost
  credentials.port = this.dbport
  credentials.database = this.database
  credentials.user = this.system_user
  credentials.password = this.system_password

  return credentials
}

module.exports = { PGConnection }
