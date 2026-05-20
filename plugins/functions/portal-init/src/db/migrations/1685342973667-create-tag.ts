import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateTag1685342973667 implements MigrationInterface {
  name = 'CreateTag1685342973667'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_tag" ("id" SERIAL NOT NULL, "name" character varying, "dataset_id" uuid NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_07fad3671d65e0a0b0155f72e07" UNIQUE ("dataset_id", "name"), CONSTRAINT "PK_aa20aa3cea082608097ef3928e9" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_tag" ADD CONSTRAINT "FK_1b80bb1bb098bb7eb03a54c56af" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_tag" DROP CONSTRAINT "FK_1b80bb1bb098bb7eb03a54c56af"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_tag"`)
  }
}
