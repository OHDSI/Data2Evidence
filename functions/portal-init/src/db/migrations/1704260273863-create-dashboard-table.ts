import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateDashboardTable1704260273863 implements MigrationInterface {
  name = 'CreateDashboardTable1704260273863'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_dashboard" ("id" uuid NOT NULL, "name" character varying NOT NULL, "url" character varying NOT NULL, "dataset_id" uuid NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_77f2bcaf046c4a2bf182276587" UNIQUE ("dataset_id"), CONSTRAINT "PK_bd1ca9b5ec76b0d95933569a523" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_dashboard" ADD CONSTRAINT "FK_77f2bcaf046c4a2bf1822765874" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_dashboard" DROP CONSTRAINT "FK_77f2bcaf046c4a2bf1822765874"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_dashboard"`)
  }
}
