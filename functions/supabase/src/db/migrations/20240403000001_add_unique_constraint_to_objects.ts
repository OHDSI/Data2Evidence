import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // First, check if the constraint already exists
  const constraintExists = await knex.raw(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'objects_name_bucket_id_unique'
    AND conrelid = 'storage.objects'::regclass
  `);

  if (constraintExists.rows.length === 0) {
    // Check for duplicate records
    const duplicates = await knex.raw(`
      SELECT name, bucket_id, COUNT(*) 
      FROM storage.objects 
      GROUP BY name, bucket_id 
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      // Handle duplicates by renaming them
      await knex.raw(`
        UPDATE storage.objects
        SET name = name || '_' || id
        WHERE id IN (
          SELECT id
          FROM (
            SELECT id,
                  ROW_NUMBER() OVER (PARTITION BY name, bucket_id ORDER BY created_at DESC) as rnum
            FROM storage.objects
          ) t
          WHERE t.rnum > 1
        )
      `);
    }

    // Add the unique constraint
    await knex.raw(`
      ALTER TABLE storage.objects 
      ADD CONSTRAINT objects_name_bucket_id_unique UNIQUE (name, bucket_id)
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop the constraint if it exists
  await knex.raw(`
    ALTER TABLE storage.objects 
    DROP CONSTRAINT IF EXISTS objects_name_bucket_id_unique
  `);
} 