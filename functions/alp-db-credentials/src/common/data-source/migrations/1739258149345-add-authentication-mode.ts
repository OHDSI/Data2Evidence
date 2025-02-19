import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthenticationMode1739258149345 implements MigrationInterface {
  name = 'AddAuthenticationMode1739258149345'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "db_credentials_mgr"."db" ADD "authentication_mode" character varying NOT NULL DEFAULT 'Password'`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "db_credentials_mgr"."db" DROP COLUMN "authentication_mode"`)
  }
}
