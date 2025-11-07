import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}."ConfigDbModels_UserDefaultConfig" (
    "User" VARCHAR(256) NOT NULL,
    "ConfigType" VARCHAR(20) NOT NULL,
    "ConfigId" VARCHAR(40) NOT NULL,
    "ConfigVersion" VARCHAR(20) NOT NULL,
    PRIMARY KEY ("User", "ConfigType")
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}."ConfigDbModels_UserDefaultConfig";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

