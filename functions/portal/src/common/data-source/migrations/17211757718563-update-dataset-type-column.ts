import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateDatasetTypeColumn17211757718563
  implements MigrationInterface
{
  name = "UpdateDatasetTypeColumn17211757718563";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'source' WHERE type = '';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = '' WHERE type = 'source';`
    );
  }
}
