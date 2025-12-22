import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDataset1691644642674 implements MigrationInterface {
  name = 'UpdateDataset1691644642674'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "vocab_schema_name" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "vocab_schema_name"`)
  }
}
