export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_db_settings", (table) => {
      table.increments("id").primary();
      table.string("db_type").notNullable();
      table.string("server").notNullable();
      table.integer("port").notNullable();
      table.string("username").notNullable();
      // table.string("password").notNullable();
      table.string("database_name").notNullable();
      table.string("schema_name");
      table.string("httppath");
      // Removed foreign key constraints for now
      table.integer("scan_data_conversion_id").unsigned();
      table.integer("scan_params_id").unsigned();
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_db_settings");
}
