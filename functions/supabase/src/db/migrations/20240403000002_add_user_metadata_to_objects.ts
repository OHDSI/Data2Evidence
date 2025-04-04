import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Check if the column already exists
  const columnExists = await knex.raw(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
    AND table_name = 'objects'
    AND column_name = 'user_metadata'
  `);

  if (columnExists.rows.length === 0) {
    // Add the user_metadata column
    await knex.raw(`
      ALTER TABLE storage.objects 
      ADD COLUMN user_metadata JSONB
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop the column if it exists
  await knex.raw(`
    ALTER TABLE storage.objects 
    DROP COLUMN IF EXISTS user_metadata
  `);
} 