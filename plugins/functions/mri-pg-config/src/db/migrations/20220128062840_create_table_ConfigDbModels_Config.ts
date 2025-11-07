import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}."ConfigDbModels_Config" (
    "Id" VARCHAR(40) NOT NULL,
    "Version" VARCHAR(20) NOT NULL,
    "Status" VARCHAR(20) DEFAULT '',
    "Name" VARCHAR(255) DEFAULT '',
    "Type" VARCHAR(100) NOT NULL,
    "Data" VARCHAR(1000000) NOT NULL,
    "ParentId" VARCHAR(40),
    "ParentVersion" VARCHAR(20),
    "Creator" VARCHAR(255) NOT NULL,
    "Created" TIMESTAMP NOT NULL,
    "Modifier" VARCHAR(255) NOT NULL,
    "Modified" TIMESTAMP NOT NULL,
    PRIMARY KEY ("Id", "Version")
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}."ConfigDbModels_Config"`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}