import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateRelease1685342973670 implements MigrationInterface {
  name = 'CreateRelease1685342973670'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_release" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "dataset_id" uuid NOT NULL, "release_date" TIMESTAMP NOT NULL DEFAULT now(), "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_07fad3671d65e0a0b0155f72e06" UNIQUE ("dataset_id", "name"), CONSTRAINT "PK_aa20aa3cea082608097ef3928e8" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_release" ADD CONSTRAINT "FK_1b80bb1bb098bb7eb03a54c56ae" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_release" DROP CONSTRAINT "FK_1b80bb1bb098bb7eb03a54c56ae"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_release"`)
  }
}
