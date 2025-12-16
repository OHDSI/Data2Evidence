import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class createDatasetTables1676872851977 implements MigrationInterface {
  name = 'createDatasetTables1676872851977'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset" ("id" uuid NOT NULL, "tenant_id" uuid NOT NULL, "visibility_status" character varying NOT NULL, "database_name" character varying NOT NULL, "schema_name" character varying NOT NULL, "token_dataset_code" character varying NOT NULL, "type" character varying NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL, "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL, CONSTRAINT "PK_36c1c67adb3d1dd69ae57f18913" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_detail" ("id" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "summary" character varying NOT NULL, "show_request_access" boolean NOT NULL, "dataset_id" uuid, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL, "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL, CONSTRAINT "REL_ba6ae69bc5b38ce43560c08176" UNIQUE ("dataset_id"), CONSTRAINT "PK_cdf29ff99d856abcdc7143d346e" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_detail" ADD CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768" FOREIGN KEY ("dataset_id") REFERENCES "portal"."dataset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset_detail" DROP CONSTRAINT "FK_ba6ae69bc5b38ce43560c081768"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_detail"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset"`)
  }
}
