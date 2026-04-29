import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema("storage")
    .createTable("s3_multipart_uploads_parts", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.text("upload_id").notNullable();
      table.bigInteger("size").notNullable().defaultTo(0);
      table.integer("part_number").notNullable();
      table.text("bucket_id").notNullable();
      table.text("key").notNullable().collate("C");
      table.text("etag").notNullable();
      table.text("owner_id");
      table.text("version").notNullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

      // Foreign keys
      table
        .foreign("upload_id")
        .references("id")
        .inTable("storage.s3_multipart_uploads");
      table.foreign("bucket_id").references("id").inTable("storage.buckets");
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .withSchema("storage")
    .dropTableIfExists("s3_multipart_uploads_parts");
}
