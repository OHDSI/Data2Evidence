import { Knex } from "knex";
const env = Deno.env.toObject()

const rawUp = `CREATE TABLE ${env.PG_SCHEMA}."strategus_analysis" (
    id uuid NOT NULL,
    study_id varchar NOT NULL,
    analysis_spec text NOT NULL,
    notebook_name varchar,
    mode varchar NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    created_by varchar NOT NULL DEFAULT 'system',
    modified_by varchar NOT NULL DEFAULT 'system',
    CONSTRAINT study_analysis_pk PRIMARY KEY (id)
);`

const rawDown = `DROP TABLE ${env.PG_SCHEMA}."strategus_analysis";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

