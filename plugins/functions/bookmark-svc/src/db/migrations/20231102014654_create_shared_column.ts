import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').alterTable('bookmark', (table: Knex.TableBuilder) => {
    table.boolean('shared')
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').alterTable('bookmark', (table: Knex.TableBuilder) => {
    table.dropColumn('shared')
  })
}