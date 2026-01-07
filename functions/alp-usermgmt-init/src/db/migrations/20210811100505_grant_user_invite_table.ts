import type { Knex } from '../types'
import { env } from '../../env'

const PG_USER = env.PG_USER
let pgUserName = PG_USER
if (pgUserName?.includes('@')) {
  pgUserName = pgUserName.split('@')[0]
}

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema('usermgmt')
    .raw(`GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLE user_invite TO ${pgUserName}`)
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema('usermgmt')
    .raw(`REVOKE SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLE user_invite FROM ${pgUserName}`)
}
