import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class AddDatasetAttributeUniqueConstraint1701234230874 implements MigrationInterface {
  name = 'AddDatasetAttributeUniqueConstraint1701234230874'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ADD CONSTRAINT "datasetId_attributeId" UNIQUE ("dataset_id", "attribute_id")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" DROP CONSTRAINT "datasetId_attributeId"`)
  }
}
