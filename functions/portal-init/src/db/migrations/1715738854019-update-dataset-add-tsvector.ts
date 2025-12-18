import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetAddTsvector1715738854019 implements MigrationInterface {
  name = 'UpdateDatasetAddTsvector1715738854019'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_detail" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'C')
      ) STORED`
    )

    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(value, ''))
      ) STORED`
    )

    await queryRunner.query(
      `CREATE INDEX "dataset_detail_search_tsv_index" ON "portal"."dataset_detail" USING GIN  (search_tsv)`
    )

    await queryRunner.query(
      `CREATE INDEX "dataset_attribute_search_tsv_index" ON "portal"."dataset_attribute" USING GIN  (search_tsv)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" DROP COLUMN "search_tsv"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" DROP COLUMN "search_tsv"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "portal"."dataset_detail_search_tsv_index"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "portal"."dataset_attribute_search_tsv_index"`)
  }
}
