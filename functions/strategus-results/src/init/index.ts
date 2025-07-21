import pg from 'pg'
import  knex from 'knex'
import config from "../db/knexfile-admin.ts";
import { MigrationSource } from "../db/MigrationSource.ts"

const k = knex(config);
await k.migrate.latest({migrationSource: new MigrationSource()});
console.log("strategus-results migrations: done")
