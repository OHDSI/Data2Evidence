import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateDatasetDemoTypeColumn17211757718565
  implements MigrationInterface
{
  name = "UpdateDatasetDemoTypeColumn17211757718565";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'omop' WHERE type = 'demo' AND dialect = 'postgres';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'demo' WHERE type = 'omop' AND dialect = 'postgres';`
    );
  }
}
