import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddSequenceToDatasetAttribute1793600000000
  implements MigrationInterface
{
  name = "AddSequenceToDatasetAttribute1793600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" ADD COLUMN "sequence" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset_attribute" DROP COLUMN "sequence"`
    );
  }
}
