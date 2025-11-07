import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE VIEW ${env.PG_SCHEMA}."ConfigDbModels_Assignment" AS
SELECT ah."Id" AS "Id",
    ah."Name" AS "Name",
    ah."EntityType" AS "EntityType",
    ah."EntityValue" AS "EntityValue",
    ah."Creator" AS "Creator",
    ah."Created" AS "Created",
    ah."Modifier" AS "Modifier",
    ah."Modified" AS "Modified",
    c."Id" AS "ConfigId",
    c."Version" AS "ConfigVersion",
    c."Type" AS "ConfigType"
FROM ${env.PG_SCHEMA}."ConfigDbModels_AssignmentDetail" as ad
INNER JOIN ${env.PG_SCHEMA}."ConfigDbModels_AssignmentHeader" AS ah
ON ad."HeaderId" = ah."Id"
INNER JOIN ${env.PG_SCHEMA}."ConfigDbModels_Config" AS c
ON ad."ConfigId" = c."Id" AND ad."ConfigVersion" = c."Version" AND ad."ConfigType" = c."Type";`

const rawDown = `DROP VIEW IF EXISTS ${env.PG_SCHEMA}."ConfigDbModels_Assignment";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}
