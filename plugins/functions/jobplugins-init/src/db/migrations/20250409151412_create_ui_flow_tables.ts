import { Knex } from "knex";
const env = Deno.env.toObject()

const rawUp = `CREATE TABLE ${env.PG_SCHEMA}."Graph" (
    created_by varchar NOT NULL,
    created_date timestamp NOT NULL DEFAULT now(),
    modified_by varchar NOT NULL,
    modified_date timestamp NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    flow jsonb NOT NULL,
    "comment" varchar NULL,
    canvas_id uuid NOT NULL,
    "version" int4 NOT NULL,
    CONSTRAINT "PK_84b2ec4ba5d0e64082629ef76ef" PRIMARY KEY (id)
);
CREATE TABLE ${env.PG_SCHEMA}."Canvas" (
    created_by varchar NOT NULL,
    created_date timestamp NOT NULL DEFAULT now(),
    modified_by varchar NOT NULL,
    modified_date timestamp NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    "name" varchar NOT NULL,
    last_flow_run_id uuid NULL,
    "type" varchar NOT NULL,
    CONSTRAINT "PK_b7b4e8cc7b370dc4f8dcae9eabd" PRIMARY KEY (id)
);
ALTER TABLE ${env.PG_SCHEMA}."Graph" ADD CONSTRAINT "FK_a5bdf3d43a7a149a02ccfb8c86f" FOREIGN KEY (canvas_id) REFERENCES ${env.PG_SCHEMA}."Canvas"(id) ON DELETE CASCADE;`

const rawDown = `ALTER TABLE ${env.PG_SCHEMA}."Graph" DROP CONSTRAINT "FK_a5bdf3d43a7a149a02ccfb8c86f";
  DROP TABLE ${env.PG_SCHEMA}."Graph";
  DROP TABLE ${env.PG_SCHEMA}."Canvas";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

