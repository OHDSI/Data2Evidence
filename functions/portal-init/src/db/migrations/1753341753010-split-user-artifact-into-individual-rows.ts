import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class SplitUserArtifactIntoIndividualRows1753341753010
  implements MigrationInterface
{
  name = "SplitUserArtifactIntoIndividualRows1753341753010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column to store user artifact id, default MIGRATION_STEP_SPLIT for next step to split artifacts
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD "id" character varying DEFAULT 'MIGRATION_STEP_SPLIT';`
    );

    // Remove composite key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP CONSTRAINT "PK_07a468802447e3d895378e511aa";`
    );

    // Split user artifacts where id === MIGRATION_STEP_SPLIT into individual rows and insert into db
    await queryRunner.query(
      `
      INSERT INTO
        "portal"."user_artifact" (
          created_by, created_date, modified_by, modified_date, user_id, service_name, artifacts, id
        ) (
          SELECT
            created_by, created_date, modified_by, modified_date, user_id, service_name,
            jsonb_array_elements(artifacts) - 'id' AS artifacts,
            (jsonb_array_elements(artifacts)->>'id')::VARCHAR AS id
          FROM
            "portal"."user_artifact"
          WHERE
            id = 'MIGRATION_STEP_SPLIT'
        );
      `
    );

    // Remove all rows where id === MIGRATION_STEP_SPLIT
    await queryRunner.query(
      `DELETE from "portal"."user_artifact" where id = 'MIGRATION_STEP_SPLIT';`
    );

    // Add composite key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD CONSTRAINT "PK_07a468802447e3d895378e511aa" PRIMARY KEY ("id", "service_name");`
    );

    // Drop default value from id column
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ALTER COLUMN id DROP default;`
    );

    // Rename plural artifacts column to singular artifact
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" RENAME COLUMN artifacts TO artifact;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove primary key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP CONSTRAINT "PK_07a468802447e3d895378e511aa";`
    );

    // Combine user artifacts into a combined row and insert to db with id === MIGRATION_STEP_COMBINE
    await queryRunner.query(
      `
      INSERT INTO
        "portal"."user_artifact" (
          created_by, created_date, modified_by, modified_date, user_id, service_name, artifact, id
        ) (
          SELECT
            created_by, created_date, modified_by, modified_date, user_id, service_name, 
            array_to_json(array_agg(artifact || jsonb_build_object('id', id)))::jsonb AS artifact,
            'MIGRATION_STEP_COMBINE' AS id
          FROM
            "portal"."user_artifact"
          GROUP BY
        user_id, created_by, created_date, modified_by, modified_date, service_name
        );
      `
    );

    // Drop all rows without id === MIGRATION_STEP_COMBINE
    await queryRunner.query(
      `DELETE from "portal"."user_artifact" where id != 'MIGRATION_STEP_COMBINE';`
    );

    // Update composite key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD CONSTRAINT "PK_07a468802447e3d895378e511aa" PRIMARY KEY ("user_id", "service_name");`
    );

    // Remove column to store user artifact service name
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP COLUMN "id";`
    );

    // Rename singular artifact to plural artifacts column
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" RENAME COLUMN artifact TO artifacts;`
    );
  }
}
