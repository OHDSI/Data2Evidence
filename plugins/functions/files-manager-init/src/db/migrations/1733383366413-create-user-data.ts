import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserData1733383366413 implements MigrationInterface {
  name = "CreateUserData1733383366413";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "files_manager"."user_data" (
        "id" SERIAL not null,
        "hash" VARCHAR(255) not null,
        "username" VARCHAR(255) not null,
        "data_key" VARCHAR(255) not null,
        "file_name" VARCHAR(255) not null,
        "blob_id" integer not null,
        PRIMARY KEY ("id"),
        UNIQUE ("hash","username", "data_key", "file_name"),
        CONSTRAINT fk_blob_id foreign key (blob_id) references "files_manager"."blob_data" (id)
        )`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "files_manager"."user_data"`);
  }
}
