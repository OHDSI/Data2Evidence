import { env, logger } from '../env.ts'
import * as path from "https://deno.land/std@0.188.0/path/mod.ts";
import knex from "npm:knex";

/*const sleep = (time: number) => {
  setTimeout(() => time, time)
}

  let ssl: any = Boolean(env.PG_SSL)
  if (env.PG__CA_ROOT_CERT) {
    ssl = {
      rejectUnauthorized: true,
      ca: env.PG__CA_ROOT_CERT
    }
  }

  if (!env.PG__CA_ROOT_CERT && env.NODE_ENV === 'production') {
    logger.warn('PG_CA_ROOT_CERT is undefined')
  }*/

class SeedSource {

    private path: string;
    private usejs: boolean;

    constructor(private seeds: string, usejs: boolean) {
        this.path = seeds;
        this.usejs = usejs;
    }
    async getSeeds() {
      const files = Deno.readDir(`${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/${this.path}`);
      let res = []
      for await (const f of files) {
        res.push(f.name)
      }

      return Promise.resolve(res.sort());
    }
  
    getSeedName(seed: any) {
        if(this.usejs)
            return seed.slice(0,-2)+"js"; 
      return seed;
    }
  
    getSeed(seed:any)  {
          return import(`./${this.path}/${seed}`);
    }
  }

   class MigrationSource {

    private path: string;
    private usejs: boolean;

    
    constructor(migrations: string, usejs:boolean) {
        this.path = migrations;
        this.usejs = usejs;

    }
    async getMigrations() {
      const files = Deno.readDir(`${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/${this.path}`);
      let res = []
      for await (const f of files) {
        res.push(f.name)
      }

      return Promise.resolve(res.sort());
    }
  
    getMigrationName(migration: any) {
        if(this.usejs)
            return migration.slice(0,-2)+"js"; 
      return migration;
    }
  
    getMigration(migration: any)  {
          return import(this.path+`${migration}`);
          //return import(`./${this.path}/${migration}`);
    }
  }

export class KnexMigration {
    private k;

    private config :any = {
        client: 'pg',
        connection: {
          host: env.PG__HOST,
          port: env.PG__PORT,
          database: env.PG__DB_NAME,
          user: env.PG__USER,
          password: env.PG__PASSWORD,
          ssl: (() => {
            let ssl: any = JSON.parse(env.PG__SSL.toLowerCase());
            if (env.PG__CA_ROOT_CERT) {
              return {
                rejectUnauthorized: true,
                ca: env.PG__CA_ROOT_CERT,
              };
            }
            return ssl;
            })()
        }
      };

      private migrations: string | null;
      private seeds: string | null;
      private usejs: boolean;

    constructor(schema: string, migrations: string | null, seeds: string | null, usejs: boolean = false) {
        this.config.searchPath = [schema];
        this.migrations = migrations;
        this.seeds = seeds;
        this.usejs = usejs;
        if(migrations) {
            this.config.migrations = {
                schemaName: schema,
                tableName: 'knex_migrations',
                directory: `${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/${migrations}` // relative path to directory containing the migration files 
              };
        }
        if(seeds) {
            this.config.seeds = {
                directory: `${path.dirname(path.fromFileUrl(import.meta.url)).replace(/\/usr\/src/, '.')}/${seeds}`
            };
        }
        this.k = knex(this.config);
    }
  
    public async initalizeDataSource() {
        logger.log("Initializing DataSource...");
      try {
        if(this.migrations) {
            logger.log(">>> Running Migrations <<<");
            const migrationResult = await this.k.migrate.latest({ migrationSource: new MigrationSource(this.migrations, this.usejs) });
            logger.log(`Migrations Done: ${migrationResult}`);
        }
        if(this.seeds) {
            logger.log(">>> Running Seeds <<<");
            const seedResult = await this.k.seed.latest({ migrationSource: new SeedSource(this.seeds, this.usejs) });
            logger.log(`Seeding Done: ${seedResult}`);
        }
  
        logger.log(">>> Initialization Complete <<<");
      } catch (error) {
        logger.error(`Error during DataSource initialization: ${error}`);
      } finally {
        await this.k.destroy();
      }
    }
  }

  export async function addPlugin(app: any, value: any, dir: string) {
    const km = new KnexMigration(value.schema, value.migration_path, value.seed_path, value.usejs || false);
    km.initalizeDataSource();
  }
  