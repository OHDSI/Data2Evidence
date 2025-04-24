export async function up(knex: any): Promise<void> {
    return knex.schema
      .withSchema('trex')
      .raw(`CREATE TABLE db (
        id varchar PRIMARY KEY,
        host varchar NOT NULL,
        port int4 NOT NULL,
        "name" varchar NOT NULL,
        dialect varchar NOT NULL,
        credentials jsonb not null,
        vocab_schemas jsonb,
        publications jsonb,
        db_extra jsonb
    )`);
  }
  
  export async function down(knex: any): Promise<void> {
    return knex.schema
      .withSchema('trex')
      .raw(`DROP TABLE db`);
  }
  
  
  




;