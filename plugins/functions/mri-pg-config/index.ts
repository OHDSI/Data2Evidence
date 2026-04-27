import  knex from 'knex'
import config from "./src/db/knexfile-admin.ts";
import pg from 'pg';
import * as path from "path";

import { MigrationSource } from "./src/db/MigrationSource.ts"
import { SeedSource } from "./src/db/SeedSource.ts"


const k = knex(config);
const m = await k.migrate.latest({migrationSource: new MigrationSource()});
const s = await k.seed.run({seedSource: new SeedSource()});
console.log("mri-pg-config: done")
