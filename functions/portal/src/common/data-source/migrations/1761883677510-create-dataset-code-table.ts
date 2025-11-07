import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class createDatasetCodeTable1761883677510 implements MigrationInterface {
  name = "createDatasetCodeTable1761883677510";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "portal"."dataset_code" (
        "id" serial NOT NULL,
        "type" character varying NOT NULL,
        "code" character varying NOT NULL,
        "dataset_id" uuid NOT NULL,
        "created_by" character varying,
        "created_date" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "modified_by" character varying,
        "modified_date" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "PK_dataset_code_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dataset_code_dataset_id" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD CONSTRAINT "datasetId_type" UNIQUE ("dataset_id", "type")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."dataset_code"`);
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP CONSTRAINT "datasetId_type"`
    );
  }
}
