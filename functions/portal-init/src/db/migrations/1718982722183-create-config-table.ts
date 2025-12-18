import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateConfigTable1718982722183 implements MigrationInterface {
  name = 'CreateConfigTable1718982722183'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."config" ( "type" character varying NOT NULL, "value" character varying NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_495a137f89d13174b8d6b9b8c13" PRIMARY KEY ("type"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."config"`)
  }
}
