import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateDatasetAddResultSchema17211757718563
  implements MigrationInterface
{
  name = "UpdateDatasetAddResultSchema17211757718563";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" ADD COLUMN "result_schema_name" VARCHAR(255);`
    );

    await queryRunner.query(
      `UPDATE "portal"."dataset" SET "result_schema_name" = "schema_name";`
    );

    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" ALTER COLUMN "result_schema_name" SET NOT NULL;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" DROP COLUMN "result_schema_name";`
    );
  }
}
