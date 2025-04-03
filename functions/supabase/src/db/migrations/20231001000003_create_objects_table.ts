import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").createTable("objects", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("bucket_id");
    table.text("name");
    table.uuid("owner").comment("Field is deprecated");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("last_accessed_at").defaultTo(knex.fn.now());
    table.jsonb("metadata");
    table.specificType("path_tokens", "_text");
    table.text("version");
    table.text("owner_id");
    // table.jsonb("user_metadata");

    // Foreign key to buckets table
    table.foreign("bucket_id").references("id").inTable("storage.buckets");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").dropTableIfExists("objects");
}
