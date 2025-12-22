import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateNotebookTable1701394052067 implements MigrationInterface {
  name = 'CreateNotebookTable1701394052067'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."notebook" ("id" uuid NOT NULL, "name" character varying NOT NULL, "notebook_content" character varying, "user_id" uuid NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_69bbe01fd8a577253ef33445c78" PRIMARY KEY ("id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."notebook"`)
  }
}
