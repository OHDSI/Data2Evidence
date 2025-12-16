import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").createTable("migrations", (table) => {
    table.increments("id");
    table.string("name", 100).notNullable();
    table.string("hash", 40).notNullable();
    table.timestamp("executed_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").dropTableIfExists("migrations");
}
