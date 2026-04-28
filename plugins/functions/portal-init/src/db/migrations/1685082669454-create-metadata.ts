import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateMetadata1685082669454 implements MigrationInterface {
  name = 'CreateMetadata1685082669454'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_metadata" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "data_type" character varying NOT NULL, "value_as_string" character varying, "value_as_numeric" integer, "value_as_timestamp" TIMESTAMP, "dataset_id" uuid NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d0c4ef07ea620307831911fa75a" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(`ALTER TABLE "portal"."dataset" ADD "source_dataset_id" uuid`)
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_metadata" ADD CONSTRAINT "FK_51c041bba0c3c3697ca08471c2f" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_metadata" DROP CONSTRAINT "FK_51c041bba0c3c3697ca08471c2f"`)
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP COLUMN "source_dataset_id"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_metadata"`)
  }
}
