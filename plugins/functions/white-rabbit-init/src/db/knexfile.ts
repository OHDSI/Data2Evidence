import { Knex } from "knex";
import * as path from "path";
import { env } from "../env.ts";

let ssl = JSON.parse(env.PG__SSL.toLowerCase())
if (env.PG__CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: env.PG__CA_ROOT_CERT,
  }
}

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: env.PG_HOST || env.PG__HOST,
    port: env.PG_PORT || env.PG__PORT,
    database: env.PG_DB_NAME || env.PG__DB_NAME,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl,
  },
  searchPath: [env.PG_SCHEMA],
  debug: env.PG__DEBUG,
  migrations: {
    schemaName: "white_rabbit",
    tableName: "knex_migrations",
    directory: `${path
      .dirname(path.fromFileUrl(import.meta.url))
      .replace(/\/usr\/src/, ".")}/migrations`,
  },
};

export default config;
