import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDataset1706502348548 implements MigrationInterface {
  name = 'UpdateDataset1706502348548'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" RENAME COLUMN "database_name" TO "database_code"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "dialect" character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "dialect"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" RENAME COLUMN "database_code" TO "database_name"`)
  }
}
