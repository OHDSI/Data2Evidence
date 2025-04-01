export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_data_params", (table) => {
      table.bigInteger("id").primary();
      table.boolean("scan_values").notNullable();
      table.integer("min_cell_count");
      table.integer("max_values");
      table.integer("sample_size");
      table.boolean("calculate_numeric_stats").notNullable();
      table.integer("numeric_stats_sampler_size");
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_data_params");
}
