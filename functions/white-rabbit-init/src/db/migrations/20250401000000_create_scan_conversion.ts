import knex, { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .createTable("scan_conversion", (table: Knex.TableBuilder) => {
      table.uuid("id").primary(); // flow_run_id
      table.string("username").notNullable();
      table.string("file_name").notNullable();
      table.bigInteger("file_id").notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .withSchema("white_rabbit")
    .dropTableIfExists("scan_conversion");
}
