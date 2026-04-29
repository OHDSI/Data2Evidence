import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class updateDatasetDetail1677825145320 implements MigrationInterface {
  name = 'updateDatasetDetail1677825145320'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" DROP CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "name" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "description" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "summary" DROP NOT NULL`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "show_request_access" SET DEFAULT false`
    )
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "dataset_id" SET NOT NULL`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_detail" ADD CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" DROP CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "dataset_id" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "show_request_access" DROP DEFAULT`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "summary" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "description" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" ALTER COLUMN "name" SET NOT NULL`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_detail" ADD CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
  }
}
