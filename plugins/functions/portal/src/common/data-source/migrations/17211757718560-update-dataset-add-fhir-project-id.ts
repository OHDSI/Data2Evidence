import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetAddFhirProjectId17211757718560 implements MigrationInterface {
  name = 'UpdateDatasetAddFhirProjectId17211757718560'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "fhir_project_id" UUID DEFAULT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "fhir_project_id"`)
  }
}

// 17211757718560-update-dataset-add-fhir-project-id
