import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDashboard1705398488032 implements MigrationInterface {
  name = 'UpdateDashboard1705398488032'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" DROP CONSTRAINT "FK_77f2bcaf046c4a2bf1822765874"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" DROP CONSTRAINT "REL_77f2bcaf046c4a2bf182276587"`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_dashboard" ADD CONSTRAINT "FK_77f2bcaf046c4a2bf1822765874" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_dashboard" ADD CONSTRAINT "REL_77f2bcaf046c4a2bf182276587" UNIQUE ("dataset_id")`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_dashboard" ADD CONSTRAINT "FK_77f2bcaf046c4a2bf1822765874" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }
}
