import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('b2c_group', (table: Knex.TableBuilder) => {
    table.string('system')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('b2c_group', (table: Knex.TableBuilder) => {
    table.dropColumn('system')
  })
}
