import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateDatasetNotebook1698308495407 implements MigrationInterface {
  name = 'CreateDatasetNotebook1698308495407'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_notebook" ("created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL, "name" character varying NOT NULL, "notebook_content" character varying, "dataset_id" uuid NOT NULL, CONSTRAINT "PK_69bbe01fd8a577253ef33445c78" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_notebook" ADD CONSTRAINT "FK_a3b5adbdfd37f9256f4a2de98bb" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_notebook" DROP CONSTRAINT "FK_a3b5adbdfd37f9256f4a2de98bb"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_notebook"`)
  }
}
