import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateUserArtifactTable1729863090719 implements MigrationInterface {
  name = 'CreateUserArtifactTable1729863090719'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."user_artifact" ("created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "artifacts" jsonb NOT NULL, CONSTRAINT "PK_07a468802447e3d895378e511aa" PRIMARY KEY ("user_id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."user_artifact"`)
  }
}
