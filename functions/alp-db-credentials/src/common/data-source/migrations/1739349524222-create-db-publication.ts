import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDbPublication1739349524222 implements MigrationInterface {
  name = 'CreateDbPublication1739349524222'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "db_credentials_mgr"."db_publication" ("id" SERIAL NOT NULL, "publication" character varying NOT NULL, "slot" character varying NOT NULL, "db_id" uuid NOT NULL, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2c00d40454a74a07284f53c3e41" UNIQUE ("publication", "db_id"), CONSTRAINT "PK_692b25da07a6fce963c98a1c445" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `ALTER TABLE "db_credentials_mgr"."db_publication" ADD CONSTRAINT "FK_90722678a5543b197d244e87fab" FOREIGN KEY ("db_id") REFERENCES "db_credentials_mgr"."db"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "db_credentials_mgr"."db_publication" DROP CONSTRAINT "FK_90722678a5543b197d244e87fab"`
    )
    await queryRunner.query(`DROP TABLE "db_credentials_mgr"."db_publication"`)
  }
}
