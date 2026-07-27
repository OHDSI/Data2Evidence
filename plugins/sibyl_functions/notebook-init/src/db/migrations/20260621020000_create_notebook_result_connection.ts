import { Knex } from "knex";
const env = Deno.env.toObject()
const rawUp = `
CREATE TABLE ${env.PG_SCHEMA}."analysis_result" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id     uuid REFERENCES ${env.PG_SCHEMA}."analysis_definition"(id),
    job_id            text NOT NULL,
    cdm_connection_id uuid,
    status            text NOT NULL,
    storage_bucket    text NOT NULL,
    storage_key       text NOT NULL,
    size_bytes        bigint,
    created_by        uuid,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notebook_result_def ON ${env.PG_SCHEMA}."analysis_result"(definition_id);
CREATE TABLE ${env.PG_SCHEMA}."cdm_connection" (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label        text NOT NULL,
    dbms         text NOT NULL DEFAULT 'postgresql',
    host         text NOT NULL,
    port         int  NOT NULL DEFAULT 5432,
    database     text NOT NULL,
    cdm_schema   text NOT NULL,
    vocab_schema text,
    "user"       text NOT NULL,
    password_encrypted bytea,
    created_by   uuid,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN ${env.PG_SCHEMA}."cdm_connection".password_encrypted IS '@behavior -*';`
const rawDown = `DROP TABLE ${env.PG_SCHEMA}."analysis_result"; DROP TABLE ${env.PG_SCHEMA}."cdm_connection";`
export async function up(knex: Knex): Promise<void> { return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp)) }
export async function down(knex: Knex): Promise<void> { return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown) }
