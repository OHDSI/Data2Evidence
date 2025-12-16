import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateMetadataConfigRelationship1701165537531 implements MigrationInterface {
  name = 'UpdateMetadataConfigRelationship1701165537531'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "portal"."dataset_attribute_id_seq" OWNED BY "portal"."dataset_attribute"."id"`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ALTER COLUMN "id" SET DEFAULT nextval('"portal"."dataset_attribute_id_seq"')`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_tag" ADD CONSTRAINT "FK_8304fa2239f6a7592ef3876e1f5" FOREIGN KEY ("name") REFERENCES "portal"."dataset_tag_config"("name") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_tag" DROP CONSTRAINT "FK_8304fa2239f6a7592ef3876e1f5"`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ALTER COLUMN "id" SET DEFAULT nextval('portal.dataset_metadata_id_seq')`
    )
    await queryRunner.query(`ALTER TABLE "portal"."dataset_attribute" ALTER COLUMN "id" DROP DEFAULT`)
    await queryRunner.query(`DROP SEQUENCE "portal"."dataset_attribute_id_seq"`)
  }
}
