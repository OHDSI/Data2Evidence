import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class RenameMetadataToAttribute1700648789750 implements MigrationInterface {
  name = 'RenameMetadataToAttribute1700648789750'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP CONSTRAINT "FK_51c041bba0c3c3697ca08471c2f"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" RENAME TO "dataset_attribute"`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ADD CONSTRAINT "FK_e446b306681a93d4aee756751f8" FOREIGN KEY ("attribute_id") REFERENCES "portal"."dataset_attribute_config"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ADD CONSTRAINT "FK_eeab02ff3218bb495f83d89e965" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" DROP CONSTRAINT "FK_eeab02ff3218bb495f83d89e965"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" DROP CONSTRAINT "FK_e446b306681a93d4aee756751f8"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" RENAME TO "dataset_metadata"`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_metadata" ADD CONSTRAINT "FK_51c041bba0c3c3697ca08471c2f" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }
}
