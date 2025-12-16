import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').createTable('b2c_group', (table: Knex.TableBuilder) => {
    table.uuid('id').primary()
    table.string('role')
    table.uuid('tenant_id')
    table.uuid('study_id')
    table.string('created_by')
    table.timestamp('created_date', { useTz: false }).defaultTo(knex.fn.now())
    table.string('modified_by')
    table.timestamp('modified_date', { useTz: false })
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').dropTable('b2c_group')
}
