import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.string('idp_user_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.dropColumn('idp_user_id')
  })
}
