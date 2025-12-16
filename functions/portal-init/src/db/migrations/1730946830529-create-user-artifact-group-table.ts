import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateUserArtifactGroupTable1730946830529 implements MigrationInterface {
  name = 'CreateUserArtifactGroupTable1730946830529'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."user_artifact_group" ("created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, CONSTRAINT "PK_22dac3f58b2cb0bb75201cb4215" PRIMARY KEY ("user_id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."user_artifact_group"`)
  }
}
