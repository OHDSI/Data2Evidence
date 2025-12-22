// import { Knex } from 'knex';

export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_files_settings", (table) => {
      table.increments("id").primary();
      table.string("file_type").notNullable();
      table.string("delimiter").notNullable();
      table.string("csv_files");
      table.string("csv_directory");
      table
        .integer("scan_data_conversion_id")
        .unsigned()
        .references("id")
        .inTable("white_rabbit.scan_data_conversions")
        .onDelete("CASCADE");
      table
        .integer("scan_params_id")
        .unsigned()
        .references("id")
        .inTable("white_rabbit.scan_data_params")
        .onDelete("CASCADE");
    });
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_files_settings");
}
