import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLanguageToDatasetCode1770345329000 implements MigrationInterface {
  name = "AddLanguageToDatasetCode1770345329000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" ADD "language" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_code" DROP COLUMN "language"`,
    );
  }
}
