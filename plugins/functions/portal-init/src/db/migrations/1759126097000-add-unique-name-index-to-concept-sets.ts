import { MigrationInterface, QueryRunner } from "npm:typeorm";

export class AddUniqueNameIndexToConceptSets1759126097000
  implements MigrationInterface
{
  name = "AddUniqueNameIndexToConceptSets1759126097000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Deduplicate concept_set names by adding running index as suffix (e.g _1, _2, _3) to concept-sets with duplicated names
    await queryRunner.query(
      `
      with cte as (
        select
          id,
          CONCAT(name, '_', rowNum) as deduplicated_concept_set_name
        from
          (
          select
            id,
            artifact->>'name' name,
            row_number() over ( partition by artifact->>'name') as rowNum
          from
            "portal"."user_artifact"
          where
            service_name = 'concept_sets'
          ) as sub
        where
          rowNum >= 2
          )
        update
          "portal"."user_artifact" ua
        set
          artifact = jsonb_set(artifact, '{name}', to_jsonb(cte.deduplicated_concept_set_name))
        from
          cte
        where
          ua.id = cte.id
        and service_name = 'concept_sets';
      `
    );

    // Create unique index on concept_set name
    await queryRunner.query(
      `CREATE UNIQUE INDEX concept_set_name_idx ON "portal"."user_artifact"( (artifact->>'name') ) where service_name='concept_sets';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique index on concept_set name
    await queryRunner.query(`drop index concept_set_name_idx;`);
  }
}
