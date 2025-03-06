// @ts-types="npm:@types/pg"
import pg from "pg";
import {
  CachedbDialect,
  IAncestorsLookup,
  ICachedbDomain,
  ICachedbVocabulary,
  IWebapiConcept,
  ICachedbRelatedConceptsFromIdentifier,
} from "./types.ts";
import { env } from "../env.ts";
import { ICachedbConcept, ICachedbConceptRecommended } from "./types.ts";

export class CachedbDAO {
  private readonly jwt: string;
  private readonly datasetId: string;
  private readonly dialect: CachedbDialect;

  constructor(jwt: string, datasetId: string, dialect: CachedbDialect) {
    this.jwt = jwt;
    this.datasetId = datasetId;
    this.dialect = dialect;
    if (!jwt) {
      throw new Error("No token passed for CachedbDAO!");
    }
  }

  async checkIfCohortDefinitionExists(
    schemaName: string,
    cohortDefinitionId: number,
    cohortDefinitionName: string
  ): Promise<number> {
    const client = this.getCachedbConnection();
    try {
      const sql = `
                select count(cd) from ${schemaName}.cohort_definition AS cd WHERE cd.cohort_definition_name = %s and cd.cohort_definition_id <> %s;
                `;
      const result = await client.query(sql, [
        cohortDefinitionName,
        cohortDefinitionId,
      ]);
      return result.rows[0].count;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getConceptsFromIdentifiers(
    vocabSchemaName: string,
    searchConceptIds: number[]
  ): Promise<IWebapiConcept[]> {
    const client = this.getCachedbConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411

      const sql = `
                select
                      CONCEPT_ID AS CONCEPT_ID,
                      CONCEPT_NAME AS CONCEPT_NAME,
                      COALESCE (STANDARD_CONCEPT, 'N') AS STANDARD_CONCEPT,
                      COALESCE (INVALID_REASON, 'V') AS INVALID_REASON,
                      CONCEPT_CODE AS CONCEPT_CODE,
                      CONCEPT_CLASS_ID AS CONCEPT_CLASS_ID,
                      DOMAIN_ID AS DOMAIN_ID,
                      VOCABULARY_ID AS VOCABULARY_ID,
                      VALID_START_DATE AS VALID_START_DATE,
                      VALID_END_DATE AS VALID_END_DATE
                from
                      ${vocabSchemaName}.concept
                where
                      CONCEPT_ID in (${searchConceptIds.join(", ")})
                order by
                      CONCEPT_NAME ASC
            `;
      const result = await client.query(sql);
      return result.rows;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getAncestorsFromIdentifiers(
    vocabSchemaName: string,
    ancestors: number[],
    descendants: number[]
  ): Promise<IAncestorsLookup[]> {
    const client = this.getCachedbConnection();
    try {
      // TODO: Move ancestors and descendants as a sql parameter instead of being in the sql statement itself.
      // ancestors and descendants has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
            select distinct ancestor_concept_id ancestor_id, descendant_concept_id descendant_id
            from ${vocabSchemaName}.concept_ancestor
            where ancestor_concept_id in (${ancestors.join(
              ", "
            )}) and descendant_concept_id in (${descendants.join(", ")});
            `;
      const result = await client.query(sql);
      return result.rows;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getExactConceptRecommended(
    vocabSchemaName: string,
    searchConceptIds: number[]
  ): Promise<ICachedbConceptRecommended[]> {
    const client = this.getCachedbConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
          select concept_id_1, concept_id_2, relationship_id from ${vocabSchemaName}.concept_recommended WHERE concept_id_1 IN (${searchConceptIds.join(
        ", "
      )});
              `;
      const result = await client.query(sql);
      return result.rows ?? [];
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getMultipleExactConcepts(
    vocabSchemaName: string,
    conceptIds: number[],
    includeInvalid = true
  ): Promise<ICachedbConcept[]> {
    const client = this.getCachedbConnection();
    try {
      const invalidReasonWhereClause = includeInvalid
        ? ""
        : `AND invalid_reason = '' `;
      // TODO: Move conceptIds as a sql parameter instead of being in the sql statement itself.
      // conceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
          select *
          from ${vocabSchemaName}.concept
          WHERE
          concept_id IN (${conceptIds.join(", ")})
          ${invalidReasonWhereClause}
          `;

      const result = await client.query<ICachedbConcept>(sql);
      if (result) {
        return result.rows;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getMappedConceptsLookup(
    vocabSchemaName: string,
    conceptIds: number[]
  ): Promise<ICachedbConcept[]> {
    const client = this.getCachedbConnection();
    try {
      // Sql referenced from OHDSI WebAPI getMappedSourcecodes.sql
      const sql = `
        -- get all of the concepts that were part of the list of concepts provided
        Select concept_id, concept_name, COALESCE(standard_concept, 'N') standard_concept, COALESCE(invalid_reason, 'V') invalid_reason,
        CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, VOCABULARY_ID, VALID_START_DATE, VALID_END_DATE
        from ${vocabSchemaName}.concept
        where concept_id in (${conceptIds.join(", ")})

        UNION

        --get all source codes that map to the list of concepts provided
        select CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') STANDARD_CONCEPT, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE
        from ${vocabSchemaName}.concept_relationship cr
        join ${vocabSchemaName}.concept c on c.concept_id = cr.concept_id_1
        where cr.concept_id_2 in (${conceptIds.join(", ")})
        and cr.INVALID_REASON is null
        and relationship_id in ('Maps to')

        UNION

        --get anything that may be stashed in the source-to-concept-map table
        select 0 as CONCEPT_ID, SOURCE_CODE_DESCRIPTION as CONCEPT_NAME, 'N' as STANDARD_CONCEPT, COALESCE(INVALID_REASON,'V') invalid_reason,
        SOURCE_CODE as CONCEPT_CODE, NULL as CONCEPT_CLASS_ID, NULL as DOMAIN_ID, SOURCE_VOCABULARY_ID as VOCABULARY_ID, VALID_START_DATE, VALID_END_DATE
        from ${vocabSchemaName}.SOURCE_TO_CONCEPT_MAP
        where TARGET_CONCEPT_ID in (${conceptIds.join(", ")})
        and INVALID_REASON is null
        order by domain_id, vocabulary_id;
      `;

      const result = await client.query<ICachedbConcept>(sql);
      if (result) {
        return result.rows;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getDomains(vocabSchemaName: string): Promise<ICachedbDomain[]> {
    const client = this.getCachedbConnection();
    try {
      // Sql referenced from OHDSI WebAPI getDomains.sql
      const sql = `
        select domain_id, domain_name, domain_concept_id 
        from ${vocabSchemaName}.domain
        order by DOMAIN_NAME asc
      `;

      const result = await client.query<ICachedbDomain>(sql);
      if (result) {
        return result.rows;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getVocabularies(
    vocabSchemaName: string
  ): Promise<ICachedbVocabulary[]> {
    const client = this.getCachedbConnection();
    try {
      // Sql referenced from OHDSI WebAPI getVocabularies.sql
      const sql = `
        select vocabulary_id, vocabulary_name, vocabulary_reference, vocabulary_version, vocabulary_concept_id
        from ${vocabSchemaName}.vocabulary
        order by VOCABULARY_NAME asc
      `;

      const result = await client.query<ICachedbVocabulary>(sql);
      if (result) {
        return result.rows;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getRelatedConceptsFromIdentifier(
    vocabSchemaName: string,
    conceptId: number
  ): Promise<ICachedbRelatedConceptsFromIdentifier[]> {
    const client = this.getCachedbConnection();
    try {
      // Sql referenced from OHDSI WebAPI getRelatedConcepts.sql
      const sql = `
        select distinct * from (
            select c.CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, RELATIONSHIP_NAME, 1 relationship_distance
            from ${vocabSchemaName}.concept_relationship cr
            join ${vocabSchemaName}.concept c on cr.CONCEPT_ID_2 = c.CONCEPT_ID
            join ${vocabSchemaName}.relationship r on cr.RELATIONSHIP_ID = r.RELATIONSHIP_ID
            where cr.CONCEPT_ID_1 = $1 and cr.INVALID_REASON IS NULL
            union
            select ANCESTOR_CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, 'Has ancestor of' , MIN_LEVELS_OF_SEPARATION relationship_distance
            from ${vocabSchemaName}.concept_ancestor ca
            join ${vocabSchemaName}.concept c on c.CONCEPT_ID = ca.ANCESTOR_CONCEPT_ID
            where DESCENDANT_CONCEPT_ID = $1
            and ANCESTOR_CONCEPT_ID <> $1
            union 
            select DESCENDANT_CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, 'Has descendant of' , MIN_LEVELS_OF_SEPARATION relationship_distance
            from ${vocabSchemaName}.concept_ancestor ca
            join ${vocabSchemaName}.concept c on c.CONCEPT_ID = ca.DESCENDANT_CONCEPT_ID
            where ANCESTOR_CONCEPT_ID = $1
            and DESCENDANT_CONCEPT_ID <> $1
            union
            select distinct c3.CONCEPT_ID, c3.CONCEPT_NAME,COALESCE(c3.standard_concept,'N') standard_concept, COALESCE(c3.INVALID_REASON,'V') invalid_reason, c3.CONCEPT_CODE, c3.CONCEPT_CLASS_ID, c3.DOMAIN_ID, c3.VOCABULARY_ID, c3.VALID_START_DATE, c3.VALID_END_DATE, CONCAT('Has relation to descendant of : ', RELATIONSHIP_NAME) RELATIONSHIP_NAME, min_levels_of_separation relationship_distance
            from (
                    select * from ${vocabSchemaName}.concept where concept_id = $1
            ) c1
            join ${vocabSchemaName}.concept_ancestor ca1 on c1.concept_id = ca1.ancestor_concept_id
            join ${vocabSchemaName}.concept_relationship cr1 on ca1.descendant_concept_id = cr1.concept_id_2 and cr1.relationship_id = 'Maps to' and cr1.invalid_reason IS NULL
            join ${vocabSchemaName}.relationship r on r.relationship_id = cr1.relationship_id
            join ${vocabSchemaName}.concept c3 on cr1.concept_id_1 = c3.concept_id
        ) ALL_RELATED 
        order by relationship_distance ASC;
      `;

      const result = await client.query<ICachedbRelatedConceptsFromIdentifier>(
        sql,
        [conceptId]
      );
      if (result) {
        return result.rows;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  private getCachedbConnection = () => {
    try {
      const client = new pg.Client({
        host: env.CACHEDB__HOST,
        port: env.CACHEDB__PORT,
        user: this.jwt,
        database: `A|${this.dialect}|read|${this.datasetId}`,
        connectionTimeoutMillis: 30000,
      });
      client.connect();
      return client;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
}
