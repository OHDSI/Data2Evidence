import type { Knex } from 'knex'
import { env } from '../env.ts'
import * as path from "path";

let ssl: any = JSON.parse(env.PG_SSL.toLowerCase())
if (env.PG_CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG_CA_ROOT_CERT
  }
}

if (!env.PG_CA_ROOT_CERT && env.NODE_ENV === 'production') {
  console.warn('PG_CA_ROOT_CERT is undefined')
}

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DB_NAME,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl
  },
  searchPath: [env.PG_SCHEMA],
  pool: {
    min: env.PG_MIN_POOL,
    max: env.PG_MAX_POOL,
    idleTimeoutMillis: env.PG__IDLE_TIMEOUT_IN_MS
  },
  debug: env.PG_DEBUG,
  migrations: {
    schemaName: 'usermgmt',
    tableName: 'knex_migrations',
    directory: `${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/migrations`
  },
  seeds: {
    directory: `${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/seeds`
  }
}

export default config
