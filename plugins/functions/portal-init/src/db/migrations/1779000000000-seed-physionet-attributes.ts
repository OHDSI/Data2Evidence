import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class SeedPhysionetAttributes1779000000000 implements MigrationInterface {
  name = "SeedPhysionetAttributes1779000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent INSERT — ON CONFLICT DO NOTHING so this is safe on existing DBs
    // and re-runs.
    await queryRunner.query(`
      INSERT INTO "portal"."dataset_attribute_config"
        ("id", "name", "category", "data_type", "is_displayed", "created_by", "modified_by")
      VALUES
        ('physionet_slug',    'PhysioNet slug',    'DATASET', 'STRING', false, 'system', 'system'),
        ('physionet_version', 'PhysioNet version', 'DATASET', 'STRING', true,  'system', 'system')
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "portal"."dataset_attribute_config"
      WHERE "id" IN ('physionet_slug', 'physionet_version')
    `);
  }
}
