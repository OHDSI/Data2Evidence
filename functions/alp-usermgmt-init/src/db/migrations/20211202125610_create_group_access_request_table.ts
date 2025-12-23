import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').createTable('group_access_request', (table: Knex.TableBuilder) => {
    table.uuid('id').primary()
    table.uuid('user_id').references('id').inTable('user').onDelete('CASCADE').onUpdate('CASCADE')
    table.uuid('group_id').references('id').inTable('b2c_group').onDelete('CASCADE').onUpdate('CASCADE')
    table.string('status')
    table.string('created_by')
    table.timestamp('created_date', { useTz: false }).defaultTo(knex.fn.now())
    table.string('modified_by')
    table.timestamp('modified_date', { useTz: false })
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').dropTable('group_access_request')
}
