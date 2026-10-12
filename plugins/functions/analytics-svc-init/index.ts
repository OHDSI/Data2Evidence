import knex from "knex";
import config from "./src/db/knexfile-admin.ts";
import { env } from "./src/env.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts";
import { pruneCohortCache } from "./src/db/pruneCohortCache.ts";

const k = knex(config);
try {
  await k.migrate.latest({ migrationSource: new MigrationSource() });
  console.log("analytics-svc-init migrations: done");

  await pruneCohortCache(k, env.PG_SCHEMA);
} finally {
  // Without this the knex pool keeps open handles, the Deno worker's event loop
  // never drains, and the isolate is force-killed on the wall-clock limit —
  // which stalls trex's startup before it serves any request. Same pattern as
  // perseus-init / alp-usermgmt-init.
  await k.destroy();
}
