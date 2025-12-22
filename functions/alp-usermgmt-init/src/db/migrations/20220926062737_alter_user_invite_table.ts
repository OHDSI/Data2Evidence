import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user_invite', (table: Knex.TableBuilder) => {
    table.timestamp('last_sent_invite', { useTz: false })
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user_invite', (table: Knex.TableBuilder) => {
    table.timestamp('last_sent_invite', { useTz: false })
  })
}
