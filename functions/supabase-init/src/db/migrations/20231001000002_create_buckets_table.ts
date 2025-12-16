import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").createTable("buckets", (table) => {
    table.text("id").primary();
    table.text("name").notNullable();
    table.uuid("owner").comment("Field is deprecated");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.boolean("public").defaultTo(false);
    table.boolean("avif_autodetection").defaultTo(false);
    table.bigInteger("file_size_limit");
    table.specificType("allowed_mime_types", "_text");
    table.text("owner_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").dropTableIfExists("buckets");
}
