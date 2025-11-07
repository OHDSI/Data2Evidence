import { Knex } from 'knex'
import { env } from '../../env'

const PG_USER = env.PG_USER

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema('qe_config').raw(`GRANT USAGE ON SCHEMA qe_config TO ${PG_USER}`)
  return knex.schema
    .withSchema('qe_config')
    .raw(`GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA qe_config TO ${PG_USER}`)
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema('qe_config')
    .raw(`REVOKE SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA qe_config FROM ${PG_USER}`)
}
