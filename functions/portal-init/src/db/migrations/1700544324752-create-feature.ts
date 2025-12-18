import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateFeature1700544324752 implements MigrationInterface {
  name = 'CreateFeature1700544324752'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."feature" ("id" SERIAL NOT NULL, "feature" character varying NOT NULL, "is_enabled" boolean NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e7f60d762cba5d80e5a61412a47" UNIQUE ("feature"), CONSTRAINT "PK_ff0cf49a0a823dcf2454317e501" PRIMARY KEY ("id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."feature"`)
  }
}
