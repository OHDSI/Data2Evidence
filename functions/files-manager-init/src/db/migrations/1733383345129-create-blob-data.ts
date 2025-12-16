import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlobData1733383345129 implements MigrationInterface {
  name = "CreateBlobData1733383345129";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "files_manager"."blob_data" ("id" SERIAL NOT NULL, "data" OID NOT NULL, PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "files_manager"."blob_data"`);
  }
}
