import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetAddPlugin17211757718561 implements MigrationInterface {
  name = 'UpdateDatasetAddPlugin17211757718561'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "plugin" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "plugin"`)
  }
}
