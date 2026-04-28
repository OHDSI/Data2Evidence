import { Knex } from "knex";
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
    ssl
  },
  searchPath: [env.PG_SCHEMA],
  debug: env.PG__DEBUG,
  migrations: {
    schemaName: "perseus",
    tableName: "knex_migrations",
  },
};

export default config;
