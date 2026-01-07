export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_data_logs", (table) => {
      table.bigInteger("id").primary();
      table.string("message", 1000).notNullable();
      table.timestamp("time", { useTz: false }).notNullable();
      table.integer("status_code").notNullable();
      table.string("status_name", 25).notNullable();
      table.integer("percent").notNullable();
      table
        .bigInteger("conversion_id")
        .references("id")
        .inTable("white_rabbit.scan_data_conversions")
        .onDelete("CASCADE")
        .notNullable();
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_data_logs");
}
