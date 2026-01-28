import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddDatasetCodeQueryTable1769500853192 implements MigrationInterface {
  name = "AddDatasetCodeQueryTable1769500853192";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "portal"."dataset_code_query" (
        "id" serial NOT NULL,
        "sql" text NOT NULL,
        "dataset_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "name" character varying NOT NULL,
        "created_by" character varying,
        "created_date" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "modified_by" character varying,
        "modified_date" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "PK_dataset_code_query_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dataset_code_query_dataset_code" FOREIGN KEY ("dataset_id", "type", "name") REFERENCES "portal"."dataset_code"("dataset_id", "type", "name") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."dataset_code_query"`);
  }
}
