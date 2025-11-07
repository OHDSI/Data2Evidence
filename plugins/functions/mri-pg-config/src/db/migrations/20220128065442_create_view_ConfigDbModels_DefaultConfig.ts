import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE VIEW ${env.PG_SCHEMA}."ConfigDbModels_DefaultConfig" AS
SELECT udc."User",
    udc."ConfigType",
    c."Id",
    c."Version",
    c."Name",
    c."Data"
FROM ${env.PG_SCHEMA}."ConfigDbModels_UserDefaultConfig" as udc
INNER JOIN ${env.PG_SCHEMA}."ConfigDbModels_Config" AS c
ON udc."ConfigId" = c."Id" AND udc."ConfigVersion" = c."Version";`

const rawDown = `DROP VIEW IF EXISTS ${env.PG_SCHEMA}."ConfigDbModels_DefaultConfig";`

export async function up(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp)
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

