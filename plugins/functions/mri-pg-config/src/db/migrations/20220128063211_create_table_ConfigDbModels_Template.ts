import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}."ConfigDbModels_Template" (
    "Id" VARCHAR(40) NOT NULL,
    "System" VARCHAR(40) NOT NULL,
    "Data" text,
    "Creator" VARCHAR(256),
    "Created" TIMESTAMP,
    "Modifier" VARCHAR(256),
    "Modified" TIMESTAMP,
    PRIMARY KEY ("Id")
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}."ConfigDbModels_Template";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

