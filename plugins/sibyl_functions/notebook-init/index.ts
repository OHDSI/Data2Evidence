import knex from 'knex'
import config from "./src/db/knexfile-admin.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts"

const k = knex(config);
try {
  await k.migrate.latest({ migrationSource: new MigrationSource() });
  console.log("notebook migrations: done")
} finally {
  // Close the Knex pool; otherwise its Postgres sockets leak across invocations
  // and cold starts in the edge runtime.
  await k.destroy();
}
