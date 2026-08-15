import { Knex } from "knex";
const env = Deno.env.toObject()

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}.site_credential (
    id                INT PRIMARY KEY DEFAULT 1,
    site_id           TEXT,
    claim_token       TEXT,
    cognito_client_id TEXT,
    client_secret_enc TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT site_credential_singleton CHECK (id = 1)
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}.site_credential;`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}
export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}
