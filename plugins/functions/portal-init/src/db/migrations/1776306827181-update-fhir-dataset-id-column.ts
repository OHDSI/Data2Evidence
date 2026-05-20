import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateFhirDatasetIdColumn1776306827181 implements MigrationInterface {
  name = "UpdateFhirDatasetIdColumn1776306827181";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhir_project_id" TO "fhir_dataset_id";`,
    );

    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" ALTER COLUMN "fhir_dataset_id" TYPE VARCHAR USING "fhir_dataset_id"::VARCHAR;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" ALTER COLUMN "fhir_dataset_id" TYPE UUID USING "fhir_dataset_id"::UUID;`,
    );

    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhir_dataset_id" TO "fhir_project_id";`,
    );
  }
}
