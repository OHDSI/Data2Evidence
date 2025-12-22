import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').createTable('user_group', (table: Knex.TableBuilder) => {
    table.uuid('id').primary()
    table.uuid('user_id').references('id').inTable('user').onDelete('CASCADE').onUpdate('CASCADE')
    table.uuid('b2c_group_id').references('id').inTable('b2c_group').onDelete('SET NULL').onUpdate('CASCADE')
    table.string('created_by')
    table.timestamp('created_date', { useTz: false }).defaultTo(knex.fn.now())
    table.string('modified_by')
    table.timestamp('modified_date', { useTz: false })
    table.unique(['user_id', 'b2c_group_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').dropTable('user_group')
}
