import { Knex } from "knex";
const env = Deno.env.toObject()

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}.concept_mapping_suggestion (
    created_by varchar NOT NULL,
    created_date timestamp NOT NULL DEFAULT now(),
    modified_by varchar NOT NULL,
    modified_date timestamp NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    dataflow_id varchar NOT NULL,
    node_id varchar NOT NULL,
    source_row_id varchar NOT NULL,
    target_concept_id int4 NOT NULL,
    concept_name varchar NULL,
    concept_code varchar NULL,
    domain_id varchar NULL,
    vocabulary_id varchar NULL,
    suggested_by varchar NOT NULL,
    is_approved boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_704583d801e1e111356546469b0" PRIMARY KEY (id),
    CONSTRAINT "UQ_62c9571f9a61e4b192951d4ed7f" UNIQUE (dataflow_id, node_id, source_row_id, target_concept_id)
);
CREATE INDEX IF NOT EXISTS "IDX_0ab23e6e9d213b8e6befbf512d" ON ${env.PG_SCHEMA}.concept_mapping_suggestion (dataflow_id, node_id);
CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}.concept_mapping_row_flag (
    created_by varchar NOT NULL,
    created_date timestamp NOT NULL DEFAULT now(),
    modified_by varchar NOT NULL,
    modified_date timestamp NOT NULL DEFAULT now(),
    dataflow_id varchar NOT NULL,
    node_id varchar NOT NULL,
    source_row_id varchar NOT NULL,
    flagged boolean NOT NULL DEFAULT false,
    CONSTRAINT "PK_3ca177369e94405cf558de619f5" PRIMARY KEY (dataflow_id, node_id, source_row_id)
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}.concept_mapping_row_flag;
  DROP TABLE IF EXISTS ${env.PG_SCHEMA}.concept_mapping_suggestion;`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}
