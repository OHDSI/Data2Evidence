import { Knex } from "knex";
const env = Deno.env.toObject();

const rawUp = `CREATE TABLE ${env.PG_SCHEMA}."results" (
    id uuid NOT NULL,
    name varchar NOT NULL,
    file_name varchar NOT NULL,
    file_size bigint NOT NULL,
    checksum varchar NOT NULL,
    bucket varchar NOT NULL,
    storage_path varchar NOT NULL,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    created_by varchar NOT NULL DEFAULT 'system',
    modified_by varchar NOT NULL DEFAULT 'system',
    CONSTRAINT results_pk PRIMARY KEY (id)
);
CREATE INDEX results_created_at_idx ON ${env.PG_SCHEMA}."results" (created_at DESC);`;

const rawDown = `DROP TABLE ${env.PG_SCHEMA}."results";`;

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown);
}
