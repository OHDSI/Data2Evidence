import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').createTable('oauth_state', (table: Knex.TableBuilder) => {
    table.uuid('id').primary()
    table.uuid('user_id').notNullable().references('id').inTable('usermgmt.user').onDelete('CASCADE').onUpdate('CASCADE')
    table.text('provider').notNullable()
    table.text('state').notNullable().unique()
    table.text('code_verifier').notNullable()
    table.timestamp('expires_at', { useTz: true }).notNullable()
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.index(['user_id', 'provider'])
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').dropTable('oauth_state')
}
