import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class SplitUserArtifact1749110029676 implements MigrationInterface {
  name = "SplitUserArtifact1749110029676";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column to store user artifact service name, default MIGRATION_STEP_SPLIT for next step to split artifacts
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD "service_name" character varying DEFAULT 'MIGRATION_STEP_SPLIT';`
    );

    // Change primary key to composite key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP CONSTRAINT "PK_07a468802447e3d895378e511aa";`
    );
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD CONSTRAINT "PK_07a468802447e3d895378e511aa" PRIMARY KEY ("user_id", "service_name");`
    );

    // Split user artifacts where service_name === null into individual rows and insert into db
    await queryRunner.query(
      `
      INSERT INTO
        "portal"."user_artifact" (
          created_by, created_date, modified_by, modified_date, user_id, service_name, artifacts
        ) (
          SELECT
            ua.created_by, ua.created_date, ua.modified_by, ua.modified_date, ua.user_id, 
            p.key as service_name, p.value as artifacts
          FROM
            "portal"."user_artifact" ua
            cross join jsonb_each (ua.artifacts) as p (key, value)
          WHERE
            service_name = 'MIGRATION_STEP_SPLIT'
        );
      `
    );

    // Remove all rows where service_name === MIGRATION_STEP_SPLIT
    await queryRunner.query(
      `DELETE from "portal"."user_artifact" where service_name = 'MIGRATION_STEP_SPLIT';`
    );

    // Drop default value from service_name column
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ALTER COLUMN service_name DROP default;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Combine user artifacts into a combined row and insert to db with service_name === MIGRATION_STEP_COMBINE
    await queryRunner.query(
      `
      INSERT INTO
      "portal"."user_artifact" (
        created_by, created_date, modified_by, modified_date, user_id, service_name, artifacts
        ) (
          select
            created_by, created_date, modified_by, modified_date, user_id,
            'MIGRATION_STEP_COMBINE' service_name,
            json_object_agg(service_name, artifacts) as artifacts
          from
            user_artifact
          group by
            user_id, created_by, created_date, modified_by, modified_date
          );
      `
    );

    // Drop all rows without service_name === MIGRATION_STEP_COMBINE
    await queryRunner.query(
      `DELETE from "portal"."user_artifact" where service_name != 'MIGRATION_STEP_COMBINE';`
    );

    // Change composite key to primary key
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP CONSTRAINT "PK_07a468802447e3d895378e511aa";`
    );
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" ADD CONSTRAINT "PK_07a468802447e3d895378e511aa" PRIMARY KEY ("user_id");`
    );

    // Remove column to store user artifact service name
    await queryRunner.query(
      `ALTER TABLE "portal"."user_artifact" DROP COLUMN "service_name";`
    );
  }
}
