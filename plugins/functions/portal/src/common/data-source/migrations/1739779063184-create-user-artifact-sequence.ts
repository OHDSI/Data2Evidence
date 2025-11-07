import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class CreateUserArtifactSequence1739779063184
  implements MigrationInterface
{
  name = "CreateUserArtifactSequence1739779063184";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "portal"."concept_set_id_seq" OWNED BY "portal"."user_artifact"."artifacts"`
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "portal"."atlas_cohort_definition_id_seq" OWNED BY "portal"."user_artifact"."artifacts"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "portal"."concept_set_id_seq"`);
    await queryRunner.query(
      `DROP SEQUENCE "portal"."atlas_cohort_definition_id_seq"`
    );
  }
}
