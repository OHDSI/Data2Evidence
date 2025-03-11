export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_data_conversions", (table) => {
      table.bigInteger("id").primary();
      table.string("username").notNullable();
      table.string("project").notNullable();
      table.integer("status_code").notNullable();
      table.string("status_name", 25).notNullable();
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_data_conversions");
}
