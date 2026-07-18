import { Knex } from "knex";
const env = Deno.env.toObject()
const rawUp = `CREATE TABLE ${env.PG_SCHEMA}."document" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    content     jsonb NOT NULL,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);
CREATE INDEX idx_notebook_document_updated ON ${env.PG_SCHEMA}."document"(updated_at DESC);`
const rawDown = `DROP TABLE ${env.PG_SCHEMA}."document";`
export async function up(knex: Knex): Promise<void> { return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp)) }
export async function down(knex: Knex): Promise<void> { return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown) }
