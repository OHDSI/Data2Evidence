import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user_group', (table: Knex.TableBuilder) => {
    table.dropForeign(['b2c_group_id'])
    table.foreign('b2c_group_id').references('b2c_group.id').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user_group', (table: Knex.TableBuilder) => {
    table.dropForeign(['b2c_group_id'])
    table.foreign('b2c_group_id').references('b2c_group.id').onDelete('RESTRICT')
  })
}
