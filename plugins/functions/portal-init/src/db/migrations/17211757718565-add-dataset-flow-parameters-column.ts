import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddDatasetFlowParametersColumn17211757718565 implements MigrationInterface {
  name = "AddDatasetFlowParametersColumn17211757718565";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE portal.dataset ADD COLUMN flow_parameters jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE portal.dataset DROP COLUMN flow_parameters`);
  }
}

