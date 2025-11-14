import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateDatasetTypeColumn17211757718564
  implements MigrationInterface
{
  name = "UpdateDatasetTypeColumn17211757718564";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'source' WHERE type = '' AND dialect = 'postgres';`
    );
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'hana__omop' WHERE type = '' AND dialect = 'hana';`
    );
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'fhir' WHERE type = '' AND (fhir_project_id IS NOT NULL OR database_code LIKE '%alp_fhir%');`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = '' WHERE type = 'source' AND dialect = 'postgres';`
    );
    await queryRunner.query(
      `UPDATE portal.dataset SET type = '' WHERE type = 'hana__omop' AND dialect = 'hana';`
    );
    await queryRunner.query(
      `UPDATE portal.dataset SET type = '' WHERE type = 'fhir' AND (fhir_project_id IS NOT NULL OR database_code LIKE '%alp_fhir%');`
    );
  }
}
