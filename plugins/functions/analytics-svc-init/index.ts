import pg from "pg";
import knex from "knex";
import config from "./src/db/knexfile-admin.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts";
import { pruneCohortCache } from "./src/db/pruneCohortCache.ts";

const k = knex(config);
await k.migrate.latest({ migrationSource: new MigrationSource() });
console.log("analytics-svc-init migrations: done");

await pruneCohortCache(k, Deno.env.get("PG_SCHEMA") ?? "analytics");
