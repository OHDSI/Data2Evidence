import knex, { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema("perseus")
    .createTable("etl_mappings", (table: Knex.TableBuilder) => {
      table.increments("id").primary();
      table.string("username").notNullable();
      table.string("user_schema_name").notNullable();
      table.string("source_schema_name");
      table.string("cdm_version");
      table.string("scan_report_name");
      table.bigint("scan_report_id");
    })
    .createTable("user_defined_lookups", (table: Knex.TableBuilder) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("username").notNullable();
      table.text("source_to_standard").notNullable();
      table.text("source_to_source").notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema("perseus")
    .dropTable("etl_mappings")
    .dropTable("user_defined_lookups");
}
