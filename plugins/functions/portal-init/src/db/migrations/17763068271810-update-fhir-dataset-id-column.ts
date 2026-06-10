import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateFhirDatasetIdColumn17763068271810 implements MigrationInterface {
  name = "UpdateFhirDatasetIdColumn17763068271810";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhir_project_id" TO "fhir_dataset_id";`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" RENAME COLUMN "fhir_dataset_id" TO "fhir_project_id";`,
    );
  }
}
