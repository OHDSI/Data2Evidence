import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class updateDataset1678343392349 implements MigrationInterface {
  name = 'updateDataset1678343392349'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "schema_name" DROP NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "schema_name" SET NOT NULL`)
  }
}
