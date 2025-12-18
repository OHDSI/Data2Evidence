import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class updateDataset1677809439828 implements MigrationInterface {
  name = 'updateDataset1677809439828'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "created_date" SET DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "modified_date" SET DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "visibility_status" SET DEFAULT 'HIDDEN'`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "type" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "created_date" SET DEFAULT now()`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "modified_date" SET DEFAULT now()`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "modified_date" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "created_date" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "type" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "visibility_status" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "modified_date" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ALTER COLUMN "created_date" DROP DEFAULT`)
  }
}
