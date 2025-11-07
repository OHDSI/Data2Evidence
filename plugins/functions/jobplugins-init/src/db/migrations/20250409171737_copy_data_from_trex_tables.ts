import { Knex } from "knex";
const env = Deno.env.toObject()

const rawUp = `
INSERT INTO ${env.PG_SCHEMA}."Canvas" (created_by, created_date, modified_by, modified_date, id, "name", last_flow_run_id, "type")
SELECT created_by, created_date, modified_by, modified_date, id, "name", last_flow_run_id, "type"
FROM "trex"."Canvas";

INSERT INTO ${env.PG_SCHEMA}."Graph" (created_by, created_date, modified_by, modified_date, id, flow, "comment", canvas_id, "version") 
SELECT created_by, created_date, modified_by, modified_date, id, flow, "comment", canvas_id, "version"
FROM "trex"."Graph" ;
`

const rawDown = `
delete from ${env.PG_SCHEMA}."Graph";
delete from ${env.PG_SCHEMA}."Canvas";
`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp).catch((e) => {
        console.log(`20250409171737_copy_data_from_trex_tables: skipped insert`);
        console.log(e);
      }))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

