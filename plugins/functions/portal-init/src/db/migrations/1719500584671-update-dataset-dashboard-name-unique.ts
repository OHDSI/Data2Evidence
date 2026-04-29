import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetDashboardNameUnique1719500584671 implements MigrationInterface {
  name = 'UpdateDatasetDashboardNameUnique1719500584671'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_dashboard" ADD CONSTRAINT "UQ_33b2de95e9a2667397e119cd312" UNIQUE ("name")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" DROP CONSTRAINT "UQ_33b2de95e9a2667397e119cd312"`)
  }
}
