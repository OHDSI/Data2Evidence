import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateFhirDatasetIdColumn1776306827181 implements MigrationInterface {
  name = "UpdateFhirDatasetIdColumn1776306827181";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhir_project_id" TO "fhirDatasetId";`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhirDatasetId" TO "fhir_project_id";`,
    );
  }
}
