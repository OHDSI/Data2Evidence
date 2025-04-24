
export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema('trex')
    .raw(`CREATE TABLE IF NOT EXISTS plugins (name VARCHAR(256) PRIMARY KEY, url VARCHAR(1024), version VARCHAR(256), payload JSONB)`)
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema('trex')
    .raw(`DROP TABLE plugins`)
}


