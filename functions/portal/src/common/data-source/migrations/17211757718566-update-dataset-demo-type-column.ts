import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class UpdateDatasetDemoTypeColumn17211757718566
  implements MigrationInterface
{
  name = "UpdateDatasetDemoTypeColumn17211757718566";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update HANA dialect: set type to 'hana__omop' where type is NULL
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'hana__omop' WHERE (type IS NULL) AND dialect = 'hana';`
    );
    
    // Update Postgres dialect: set type to 'source' where type is NULL or 'demo'
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'source' WHERE (type IS NULL OR type = 'demo') AND dialect = 'postgres';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET type = NULL WHERE type = 'hana__omop' AND dialect = 'hana';`
    );
    
    await queryRunner.query(
      `UPDATE portal.dataset SET type = 'demo' WHERE type = 'source' AND dialect = 'postgres';`
    );
  }
}
