import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddNameToDatasetCode1769500730287 implements MigrationInterface {
  name = "AddNameToDatasetCode1769500730287";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing primary key constraint if exists
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP CONSTRAINT IF EXISTS "PK_dataset_code_id"`,
    );

    // Add the name column
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD COLUMN "name" character varying DEFAULT '' NOT NULL`,
    );

    // Add the new composite primary key
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD CONSTRAINT "PK_dataset_code_dataset_id_type_name" PRIMARY KEY ("dataset_id", "type", "name")`,
    );

    // Drop the old unique constraint if it exists
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP CONSTRAINT IF EXISTS "datasetId_type"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the composite primary key
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP CONSTRAINT "PK_dataset_code_dataset_id_type_name"`,
    );

    // Remove the name column
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP COLUMN "name"`,
    );

    // Restore the original primary key
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD CONSTRAINT "PK_dataset_code_id" PRIMARY KEY ("id")`,
    );

    // Drop the old unique constraint if it exists
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD CONSTRAINT "datasetId_type" UNIQUE ("dataset_id", "type")`,
    );
  }
}
