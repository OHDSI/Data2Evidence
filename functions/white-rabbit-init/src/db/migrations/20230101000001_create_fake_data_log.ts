export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("fake_data_log", (table) => {
      table.increments("id").primary();
      table.string("message", 1000).notNullable();
      table.timestamp("time").notNullable();
      table.integer("status_code").notNullable();
      table.string("status_name", 25).notNullable();
      table.integer("percent").notNullable();
      table
        .integer("conversion_id")
        .unsigned()
        .references("id")
        .inTable("white_rabbit.fake_data_conversion")
        .onDelete("CASCADE");
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("fake_data_log");
}
