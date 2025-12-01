import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const columnExists = await knex.raw(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
    AND table_name = 'objects'
    AND column_name = 'user_metadata'
  `);

  if (columnExists.rows.length === 0) {
    await knex.schema.withSchema("storage").alterTable("objects", (table) => {
      table.jsonb("user_metadata").nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("storage").alterTable("objects", (table) => {
    table.dropColumn("user_metadata");
  });
}


