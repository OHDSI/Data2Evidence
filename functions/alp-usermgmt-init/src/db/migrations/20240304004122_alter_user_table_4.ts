import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.renameColumn('email', 'username')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.renameColumn('username', 'email')
  })
}
