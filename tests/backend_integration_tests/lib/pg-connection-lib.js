const pg = require('pg')
const format = require("pg-format");
const { Pool } = pg
var assert = require('assert')

class PGConn {
  constructor(user, password, host, port, database) {
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

  static createPGConn(credentials) {
    assert(credentials, 'Invalid credentials object!')
    assert(credentials.user, 'Invalid user specified in credentials object!')
    assert(credentials.password, 'Invalid password specified in credentials object!')
    assert(credentials.host, 'Invalid host specified in credentials object!')
    assert(credentials.port, 'Invalid port specified in credentials object!')
    assert(credentials.database, 'Invalid database specified in credentials object!')

    return new PGConn(credentials.user, credentials.password, credentials.host, credentials.port, credentials.database)
  }

  async executeQuery(query, cb) {
    console.log(`>>>>>${query}...`)

    try {
      this.pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        client.release(true)
        cb(err)
      })
      // this.client = await this.pool.connect()
      // const res = await this.client.query(query)
      // this.client.release()

      const res = await this.pool.query(query)
      console.log(`${query} executed;`)
      cb(null, res)
    } catch (err) {
      err.stack
    }
  }

  async executeQuery(query) {
    console.log(`>>>>>${query}...`)

    try {
      this.pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        client.release(true)
        throw err
      })
      // this.client = await this.pool.connect()
      // const res = await this.client.query(query)
      // this.client.release()

      const res = await this.pool.query(query)
      console.log(`${query} executed;`)
      // cb(null, res)
      return res
    } catch (err) {
      err.stack
    }
  }

  async executeProcedure(sqlProc, params) {
    try {
      return await this.pool.query(`CALL ${sqlProc}`, params)
    } catch (err) {
      err.stack
    }
  }

  async releaseClient() {
    if (this.client) {
      await this.client.end()
    }
  }

  async executeStatement(schema, table, columns, data) {
    const query = `INSERT INTO "${schema}"."${table}" (%I) VALUES %L`;
    const finalQuery = format(query, columns, data);
    return await executeQuery(finalQuery);
  }
}

module.exports = { PGConn }
