import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').createTable('linked_account', (table: Knex.TableBuilder) => {
    table.uuid('id').primary()
    table.uuid('user_id').notNullable().references('id').inTable('usermgmt.user').onDelete('CASCADE').onUpdate('CASCADE')
    table.text('provider').notNullable()
    table.text('provider_subject').notNullable()
    table.text('provider_username').nullable()
    table.binary('access_token_enc').notNullable()
    table.binary('refresh_token_enc').nullable()
    table.timestamp('access_token_expires', { useTz: true }).nullable()
    table.text('scopes').nullable()
    table.timestamp('linked_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('last_synced_at', { useTz: true }).nullable()
    table.text('last_sync_error').nullable()
    table.unique(['user_id', 'provider'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').dropTable('linked_account')
}
