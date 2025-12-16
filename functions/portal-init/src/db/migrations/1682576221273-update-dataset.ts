import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDataset1682576221273 implements MigrationInterface {
  name = 'UpdateDataset1682576221273'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "data_model" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "data_model"`)
  }
}
