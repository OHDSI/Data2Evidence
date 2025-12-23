import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetMetadata1700551597884 implements MigrationInterface {
  name = 'UpdateDatasetMetadata1700551597884'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "name"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "data_type"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "value_as_string"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "value_as_numeric"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "value_as_timestamp"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "value" character varying NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "attribute_id" character varying NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "attribute_id"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP COLUMN "value"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "value_as_timestamp" TIMESTAMP`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "value_as_numeric" integer`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "value_as_string" character varying`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "data_type" character varying NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" ADD "name" character varying NOT NULL`)
  }
}
