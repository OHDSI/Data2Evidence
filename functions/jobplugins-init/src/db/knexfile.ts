import { Knex } from "knex";
import * as path from "path";

const _env = Deno.env.toObject();

let ssl = JSON.parse(_env.PG__SSL.toLowerCase());
if (_env.PG_CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: _env.PG_CA_ROOT_CERT,
  };
}

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: _env.PG__HOST!,
    port: Number(_env.PG__PORT),
    database: _env.PG__DB_NAME!,
    user: _env.PG_USER!,
    password: _env.PG_PASSWORD!,
    ssl,
  },
  searchPath: [_env.PG_SCHEMA!],
  pool: {
    min: Number(_env.PG__MIN_POOL),
    max: Number(_env.PG__MAX_POOL),
    idleTimeoutMillis: Number(_env.PG__IDLE_TIMEOUT_IN_MS) || 30000,
  },
  debug: Boolean(Number(_env.PG__DEBUG)),
  migrations: {
    extension: ".ts",
    schemaName: _env.PG_SCHEMA,
    tableName: "knex_migrations", // table name used for storing the migration state
    directory: `${path
      .dirname(path.fromFileUrl(import.meta.url))
      .replace(/\/usr\/src/, ".")}/migrations`,
  }
};

export default config;
