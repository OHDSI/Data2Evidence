import { Knex } from "knex";
const env = Deno.env.toObject();

const rawUp = `ALTER TABLE ${env.PG_SCHEMA}."strategus_analysis" ADD COLUMN "dataset_id" VARCHAR NOT NULL;`;

const rawDown = `ALTER TABLE ${env.PG_SCHEMA}."strategus_analysis" DROP COLUMN "dataset_id";`;

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown);
}
