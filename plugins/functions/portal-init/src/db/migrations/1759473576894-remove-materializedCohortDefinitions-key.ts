import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class RemoveMaterializedCohortDefinitionsKey1759473576894
  implements MigrationInterface
{
  name = "RemoveMaterializedCohortDefinitionsKey1759473576894";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove materializedCohortDefinitions key from bookmarks
    await queryRunner.query(
      `
      with cte as (
        select
          id,
          artifact - 'materializedCohortDefinitions' artifact
        from
          "portal"."user_artifact"
        where
          service_name = 'bookmarks'
      )
      update
        "portal"."user_artifact" ua
      set
        artifact = cte.artifact
      from
        cte
      where
        ua.id = cte.id
        and ua.service_name = 'bookmarks';      
      `
    );

    // Remove materializedCohortDefinitions key from atlas_cohort_definitions
    await queryRunner.query(
      `
      with cte as (
        select
          id,
          artifact - 'materializedCohortDefinitions' artifact
        from
          "portal"."user_artifact"
        where
          service_name = 'atlas_cohort_definitions'
      )
      update
        "portal"."user_artifact" ua
      set
        artifact = cte.artifact
      from
        cte
      where
        ua.id = cte.id
        and ua.service_name = 'atlas_cohort_definitions';
      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add materializedCohortDefinitions as empty array to bookmarks AND atlas_cohort_definitions
    await queryRunner.query(
      `
      update
        "portal"."user_artifact"
      set
        artifact = jsonb_set(artifact, '{materializedCohortDefinitions}', '[]'::jsonb)
      where
        service_name in ('bookmarks', 'atlas_cohort_definitions')
      `
    );
  }
}
