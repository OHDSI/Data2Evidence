import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDataset1691386594669 implements MigrationInterface {
  name = 'UpdateDataset1691386594669'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "pa_config_id" uuid`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "pa_config_id"`)
  }
}
