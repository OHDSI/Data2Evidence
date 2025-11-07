import pg from 'pg'
import  knex from 'knex'
import config from "./src/db/knexfile-admin.ts";
import { MigrationSource } from "./src/db/MigrationSource.ts"


const k = knex(config);
await k.migrate.latest({migrationSource: new MigrationSource()});
console.log("jobplugins migrations: done")
