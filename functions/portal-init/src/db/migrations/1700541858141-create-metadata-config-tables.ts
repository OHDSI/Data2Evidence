import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class CreateMetadataConfigTables1700541858141 implements MigrationInterface {
  name = 'CreateMetadataConfigTables1700541858141'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_tag_config" ("name" character varying NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b81a74caebc7501e2aa06765e35" PRIMARY KEY ("name"))`
    )
    await queryRunner.query(
      `CREATE TABLE "portal"."dataset_attribute_config" ("id" character varying NOT NULL, "name" character varying NOT NULL, "data_type" character varying NOT NULL, "category" character varying NOT NULL, "is_displayed" boolean NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d3a7fdd836b1186423485a20453" PRIMARY KEY ("id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."dataset_attribute_config"`)
    await queryRunner.query(`DROP TABLE "portal"."dataset_tag_config"`)
  }
}
