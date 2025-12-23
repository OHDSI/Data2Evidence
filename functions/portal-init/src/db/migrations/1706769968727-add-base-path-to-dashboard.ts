import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class AddBasePathToDashboard1706769968727 implements MigrationInterface {
  name = 'AddBasePathToDashboard1706769968727'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" ADD "base_path" character varying NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" DROP COLUMN "base_path"`)
  }
}
