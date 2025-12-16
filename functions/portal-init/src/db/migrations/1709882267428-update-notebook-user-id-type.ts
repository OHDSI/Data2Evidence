import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class UpdateNotebookUserIdType1709882267428 implements MigrationInterface {
  name = 'UpdateNotebookUserIdType1709882267428'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."notebook" ALTER COLUMN "user_id" TYPE character varying`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `ALTER TABLE "portal"."notebook" ALTER COLUMN "user_id" SET DATA TYPE uuid USING (uuid_generate_v4())`
    )
  }
}
