import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateDatasetSplitDatamodelColumn17211757718562 implements MigrationInterface {
  name = 'UpdateDatasetSplitDatamodelColumn17211757718562'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE portal.dataset SET plugin = SPLIT_PART(data_model, ' ', 2)`)
    await queryRunner.query(`UPDATE portal.dataset SET plugin = replace(replace(plugin, '[', ''), ']', '')`)
    await queryRunner.query(`UPDATE portal.dataset SET data_model = SPLIT_PART(data_model, ' ', 1)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE portal.dataset SET plugin = CASE WHEN plugin IS NOT NULL THEN '[' || plugin || ']' ELSE NULL END`
    )
    await queryRunner.query(
      `UPDATE portal.dataset SET data_model = CASE WHEN plugin IS NOT NULL THEN CONCAT(data_model, ' ', plugin) ELSE data_model END`
    )
    await queryRunner.query(`UPDATE portal.dataset SET plugin = null`)
  }
}
