import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class updateDataset1678762314955 implements MigrationInterface {
  name = 'updateDataset1678762314955'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal"."dataset" ADD CONSTRAINT "UQ_e03dfe16d07e4e269d27a05dccd" UNIQUE ("token_dataset_code")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."dataset" DROP CONSTRAINT "UQ_e03dfe16d07e4e269d27a05dccd"`)
  }
}
