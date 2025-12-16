export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_data_results", (table) => {
      table.bigInteger("id").primary();
      table.timestamp("time", { useTz: false }).notNullable();
      table.string("file_name").notNullable();
      table.bigInteger("file_id").notNullable();
      table
        .bigInteger("scan_data_conversion_id")
        .references("id")
        .inTable("white_rabbit.scan_data_conversions")
        .onDelete("CASCADE")
        .notNullable();
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_data_results");
}
