import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').createTable('bookmark', (table: Knex.TableBuilder) => {
    table.string('id', 40).primary().notNullable()
    table.string('bookmark_name', 40).notNullable()
    table.text('bookmark')
    table.string('type', 10)
    table.string('view_name', 100)
    table.timestamp('modified').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'))
    table.string('study_id', 40).notNullable().defaultTo('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
    table.integer('version', 4).notNullable().defaultTo(1)
    table.string('pa_config_id', 40)
    table.string('cdm_config_id', 40)
    table.integer('cdm_config_version', 4)
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('qe_config').dropTable('bookmark')
}
