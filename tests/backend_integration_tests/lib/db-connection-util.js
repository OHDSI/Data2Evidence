var assert = require('assert')
const { PGConnection } = require('./pg/pg-connection-lib')
const { HDBConnection } = require('./hdb/hdb-connection-lib')
var utils = require('./utils')

const dbDialect = process.env.DB_DIALECT ? process.env.DB_DIALECT : 'pg'

function createDBConnection(credentials) {
  console.log(`DB dialect: ${dbDialect}`)
  assert(credentials, 'Invalid credentials object!')
  assert(credentials.user, 'Invalid user specified in credentials object!')
  assert(credentials.password, 'Invalid password specified in credentials object!')
  assert(credentials.host, 'Invalid host specified in credentials object!')
  assert(credentials.port, 'Invalid port specified in credentials object!')
  if (dbDialect.toUpperCase() === 'PG') {
    assert(credentials.database, 'Invalid database specified in credentials object!')
    // create PG connection
    return new PGConnection(credentials)
  } else if (dbDialect.toUpperCase() === 'HDB') {
    // create HDB connection
    return new HDBConnection(credentials)
  }
}

function getSystemCredentials(hostConfig) {
  let credentials = {}
  credentials.host = hostConfig.dbhost
  credentials.port = hostConfig.dbport
  credentials.user = hostConfig.system_user
  credentials.password = hostConfig.system_password
  if (dbDialect.toUpperCase() === 'PG') {
    credentials.database = hostConfig.database
  }

  return credentials
}

module.exports = { createDBConnection, getSystemCredentials }
