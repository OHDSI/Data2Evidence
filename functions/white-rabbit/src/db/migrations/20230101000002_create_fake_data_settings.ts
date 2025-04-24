export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("fake_data_settings", (table) => {
      table.increments("id").primary();
      table.integer("max_row_count").notNullable();
      table.boolean("do_uniform_sampling").notNullable();
      table.string("user_schema").notNullable();
      table.string("directory");
      table.string("scan_report_file_name");
      table
        .integer("fake_data_conversion_id")
        .unsigned()
        .references("id")
        .inTable("white_rabbit.fake_data_conversion")
        .onDelete("CASCADE");
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("fake_data_settings");
}
