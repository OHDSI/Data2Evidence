import knex from 'knex'
import pg from 'pg'
import { createLogger } from '../Logger'
import { env } from '../env'

const logger = createLogger('WebapiDb')

let ssl: any = JSON.parse(env.PG_SSL.toLowerCase())
if (env.PG_CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG_CA_ROOT_CERT
  }
}

const webapiDb = knex({
  client: 'pg',
  connection: {
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DB_NAME,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl
  },
  searchPath: ['webapi'],
  pool: {
    min: 0,
    max: 5,
    idleTimeoutMillis: env.PG__IDLE_TIMEOUT_IN_MS
  },
  debug: env.PG_DEBUG
})

webapiDb.client.validateConnection = (connection: any) => {
  return !connection.__knex__disposed
}

const pool = webapiDb.client.pool
pool.on('release', () => {
  process.nextTick(() => {
    pool.check()
  })
})

export { webapiDb }
