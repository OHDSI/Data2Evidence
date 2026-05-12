import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddDatasetCacheId1778417559068 implements MigrationInterface {
  name = "AddDatasetCacheId1778417559068";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portal"."dataset"
      ADD COLUMN IF NOT EXISTS "cache_id" varchar NULL
    `);
    await queryRunner.query(`
      UPDATE "portal"."dataset"
      SET "cache_id" = "database_code"
      WHERE "cache_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "portal"."dataset" DROP COLUMN IF EXISTS "cache_id"
    `);
  }
}
