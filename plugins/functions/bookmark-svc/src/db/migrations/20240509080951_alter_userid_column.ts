import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').alterTable('bookmark', (table: Knex.TableBuilder) => {
    table.string('user_id', 255).alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').alterTable('bookmark', (table: Knex.TableBuilder) => {
    table.uuid('user_id').alter()
  })
}
