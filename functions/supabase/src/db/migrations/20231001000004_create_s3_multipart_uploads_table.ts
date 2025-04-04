import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema("storage")
    .createTable("s3_multipart_uploads", (table) => {
      table.text("id").primary();
      table.bigInteger("in_progress_size").notNullable().defaultTo(0);
      table.text("upload_signature").notNullable();
      table.text("bucket_id").notNullable();
      table.text("key").notNullable().collate("C");
      table.text("version").notNullable();
      table.text("owner_id");
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      // Foreign key to buckets table
      table.foreign("bucket_id").references("id").inTable("storage.buckets");
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema("storage")
    .dropTableIfExists("s3_multipart_uploads");
}
