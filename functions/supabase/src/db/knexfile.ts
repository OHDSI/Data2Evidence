import { Knex } from "knex";
import * as path from "path";
import { env } from "../env.ts";

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DB_NAME,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
  },
  searchPath: [env.PG_SCHEMA],
  debug: env.PG_DEBUG,
  migrations: {
    schemaName: "storage",
    tableName: "knex_migrations",
    directory: `${path
      .dirname(path.fromFileUrl(import.meta.url))
      .replace(/\/usr\/src/, ".")}/migrations`, // relative path to directory containing the migration files
  },
};

export default config;
