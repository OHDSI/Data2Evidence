import { MigrationInterface, QueryRunner } from 'npm:typeorm'

export class AddIsSharedToNotebook1701441915734 implements MigrationInterface {
  name = 'AddIsSharedToNotebook1701441915734'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."notebook" ADD "is_shared" BOOLEAN NOT NULL DEFAULT FALSE`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portal"."notebook" DROP COLUMN "is_shared"`)
  }
}
