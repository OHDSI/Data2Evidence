import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}."ConfigDbModels_AssignmentHeader" (
    "Id" VARCHAR(40) NOT NULL,
    "Name" VARCHAR(255) DEFAULT '',
    "EntityType" CHARACTER(1) NOT NULL,
    "EntityValue" VARCHAR(255) NOT NULL,
    "Creator" VARCHAR(255) NOT NULL,
    "Created" TIMESTAMP NOT NULL,
    "Modifier" VARCHAR(255) NOT NULL,
    "Modified" TIMESTAMP NOT NULL,
    PRIMARY KEY ("Id")
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA }."ConfigDbModels_AssignmentHeader";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

