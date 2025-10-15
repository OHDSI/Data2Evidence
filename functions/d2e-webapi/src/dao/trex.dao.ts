import {
  IWebapiConcept,
  IAncestorsLookup,
  IDomain,
  IVocabulary,
  IRelatedConceptsFromIdentifier,
  IConceptRecordCount,
  IConcept,
  IConceptRecommended,
} from "./types.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import TrexConnection from "./TrexConnection.ts";

export class TrexDAO {
  private readonly conn: TrexConnection;

  private readonly vocabSchemaName: string;
  private readonly resultSchemaName: string;

  constructor(
    databaseCode: string,
    schemaName: string,
    vocabSchemaName: string,
    resultSchemaName: string
  ) {
    try {
      this.conn = new TrexConnection(
        databaseCode,
        schemaName,
        vocabSchemaName,
        resultSchemaName
      );

      this.vocabSchemaName = vocabSchemaName;
      this.resultSchemaName = resultSchemaName;
      // TODO: Bran discuss where to store results for concept count
      // TODO: REMOVE hardcode for testing
      this.resultSchemaName = `alpdev_pg__srcdb.cdmdefault_dc_1736477703219`;
    } catch (err) {
      console.error("Error getting trex connection, ", err);
      throw err;
    }
  }

  public static async getTrexDao(token: string, datasetId: string) {
    const portalServerApi = new PortalServerAPI(token);
    const { databaseCode, schemaName, vocabSchemaName, resultSchemaName } =
      await portalServerApi.getDataset(datasetId);

    return new TrexDAO(
      databaseCode,
      schemaName,
      vocabSchemaName,
      resultSchemaName
    );
  }

  async getConceptsFromIdentifiers(
    searchConceptIds: number[]
  ): Promise<IWebapiConcept[]> {
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
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
                      ${this.vocabSchemaName}.concept
                where
                      CONCEPT_ID in (${searchConceptIds.join(", ")})
                order by
                      CONCEPT_NAME ASC
            `;
      const result = await this.conn.query(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getAncestorsFromIdentifiers(
    ancestors: number[],
    descendants: number[]
  ): Promise<IAncestorsLookup[]> {
    try {
      // TODO: Move ancestors and descendants as a sql parameter instead of being in the sql statement itself.
      // ancestors and descendants has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
      const sql = `
            select distinct ancestor_concept_id ancestor_id, descendant_concept_id descendant_id
            from ${this.vocabSchemaName}.concept_ancestor
            where ancestor_concept_id in (${ancestors.join(
              ", "
            )}) and descendant_concept_id in (${descendants.join(", ")});
            `;
      const result = await this.conn.query(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getExactConceptRecommended(
    searchConceptIds: number[]
  ): Promise<IConceptRecommended[]> {
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
      const sql = `
          select concept_id_1, concept_id_2, relationship_id from ${
            this.vocabSchemaName
          }.concept_recommended WHERE concept_id_1 IN (${searchConceptIds.join(
        ", "
      )});
              `;
      const result = await this.conn.query(sql);
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getMultipleExactConcepts(
    conceptIds: number[],
    includeInvalid = true
  ): Promise<IConcept[]> {
    try {
      const invalidReasonWhereClause = includeInvalid
        ? ""
        : `AND invalid_reason = '' `;
      // TODO: Move conceptIds as a sql parameter instead of being in the sql statement itself.
      // conceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
      const sql = `
          select *
          from ${this.vocabSchemaName}.concept
          WHERE
          concept_id IN (${conceptIds.join(", ")})
          ${invalidReasonWhereClause}
          `;

      const result = await this.conn.query(sql);
      return result as IConcept[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getMappedConceptsLookup(conceptIds: number[]): Promise<IConcept[]> {
    try {
      // Sql referenced from OHDSI WebAPI getMappedSourcecodes.sql
      const sql = `
        -- get all of the concepts that were part of the list of concepts provided
        Select concept_id, concept_name, COALESCE(standard_concept, 'N') standard_concept, COALESCE(invalid_reason, 'V') invalid_reason,
        CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, VOCABULARY_ID, VALID_START_DATE, VALID_END_DATE
        from ${this.vocabSchemaName}.concept
        where concept_id in (${conceptIds.join(", ")})

        UNION

        --get all source codes that map to the list of concepts provided
        select CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') STANDARD_CONCEPT, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE
        from ${this.vocabSchemaName}.concept_relationship cr
        join ${this.vocabSchemaName}.concept c on c.concept_id = cr.concept_id_1
        where cr.concept_id_2 in (${conceptIds.join(", ")})
        and cr.INVALID_REASON is null
        and relationship_id in ('Maps to')

        UNION

        --get anything that may be stashed in the source-to-concept-map table
        select 0 as CONCEPT_ID, SOURCE_CODE_DESCRIPTION as CONCEPT_NAME, 'N' as STANDARD_CONCEPT, COALESCE(INVALID_REASON,'V') invalid_reason,
        SOURCE_CODE as CONCEPT_CODE, NULL as CONCEPT_CLASS_ID, NULL as DOMAIN_ID, SOURCE_VOCABULARY_ID as VOCABULARY_ID, VALID_START_DATE, VALID_END_DATE
        from ${this.vocabSchemaName}.SOURCE_TO_CONCEPT_MAP
        where TARGET_CONCEPT_ID in (${conceptIds.join(", ")})
        and INVALID_REASON is null
        order by domain_id, vocabulary_id;
      `;

      const result = await this.conn.query(sql);
      return result as IConcept[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getDomains(): Promise<IDomain[]> {
    try {
      // Sql referenced from OHDSI WebAPI getDomains.sql
      const sql = `
        select domain_id, domain_name, domain_concept_id 
        from ${this.vocabSchemaName}.domain
        order by DOMAIN_NAME asc
      `;

      const result = await this.conn.query(sql);
      return result as IDomain[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getVocabularies(): Promise<IVocabulary[]> {
    try {
      // Sql referenced from OHDSI WebAPI getVocabularies.sql
      const sql = `
        select vocabulary_id, vocabulary_name, vocabulary_reference, vocabulary_version, vocabulary_concept_id
        from ${this.vocabSchemaName}.vocabulary
        order by VOCABULARY_NAME asc
      `;

      const result = await this.conn.query(sql);
      return result as IVocabulary[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getRelatedConceptsFromIdentifier(
    conceptId: number
  ): Promise<IRelatedConceptsFromIdentifier[]> {
    try {
      // Sql referenced from OHDSI WebAPI getRelatedConcepts.sql
      const sql = `
        select distinct * from (
            select c.CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, RELATIONSHIP_NAME, 1 relationship_distance
            from ${this.vocabSchemaName}.concept_relationship cr
            join ${this.vocabSchemaName}.concept c on cr.CONCEPT_ID_2 = c.CONCEPT_ID
            join ${this.vocabSchemaName}.relationship r on cr.RELATIONSHIP_ID = r.RELATIONSHIP_ID
            where cr.CONCEPT_ID_1 = $1 and cr.INVALID_REASON IS NULL
            union
            select ANCESTOR_CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, 'Has ancestor of' , MIN_LEVELS_OF_SEPARATION relationship_distance
            from ${this.vocabSchemaName}.concept_ancestor ca
            join ${this.vocabSchemaName}.concept c on c.CONCEPT_ID = ca.ANCESTOR_CONCEPT_ID
            where DESCENDANT_CONCEPT_ID = $1
            and ANCESTOR_CONCEPT_ID <> $1
            union 
            select DESCENDANT_CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') standard_concept, COALESCE(c.INVALID_REASON,'V') invalid_reason, CONCEPT_CODE, CONCEPT_CLASS_ID, DOMAIN_ID, c.VOCABULARY_ID, c.VALID_START_DATE, c.VALID_END_DATE, 'Has descendant of' , MIN_LEVELS_OF_SEPARATION relationship_distance
            from ${this.vocabSchemaName}.concept_ancestor ca
            join ${this.vocabSchemaName}.concept c on c.CONCEPT_ID = ca.DESCENDANT_CONCEPT_ID
            where ANCESTOR_CONCEPT_ID = $1
            and DESCENDANT_CONCEPT_ID <> $1
            union
            select distinct c3.CONCEPT_ID, c3.CONCEPT_NAME,COALESCE(c3.standard_concept,'N') standard_concept, COALESCE(c3.INVALID_REASON,'V') invalid_reason, c3.CONCEPT_CODE, c3.CONCEPT_CLASS_ID, c3.DOMAIN_ID, c3.VOCABULARY_ID, c3.VALID_START_DATE, c3.VALID_END_DATE, CONCAT('Has relation to descendant of : ', RELATIONSHIP_NAME) RELATIONSHIP_NAME, min_levels_of_separation relationship_distance
            from (
                    select * from ${this.vocabSchemaName}.concept where concept_id = $1
            ) c1
            join ${this.vocabSchemaName}.concept_ancestor ca1 on c1.concept_id = ca1.ancestor_concept_id
            join ${this.vocabSchemaName}.concept_relationship cr1 on ca1.descendant_concept_id = cr1.concept_id_2 and cr1.relationship_id = 'Maps to' and cr1.invalid_reason IS NULL
            join ${this.vocabSchemaName}.relationship r on r.relationship_id = cr1.relationship_id
            join ${this.vocabSchemaName}.concept c3 on cr1.concept_id_1 = c3.concept_id
        ) ALL_RELATED 
        order by relationship_distance ASC;
      `;

      const result = await this.conn.query(sql, [conceptId]);
      return result as IRelatedConceptsFromIdentifier[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getConceptRecordCount(
    conceptIds: number[]
  ): Promise<IConceptRecordCount[]> {
    try {
      // Sql referenced from OHDSI WebAPI CDMCacheRepository.java
      const sql = `
        select concept_id, record_count, descendant_record_count, person_count, descendant_person_count
        from ${this.resultSchemaName}.achilles_result_concept_count
        where concept_id IN (${conceptIds.join(", ")})
      `;

      const result = await this.conn.query(sql);
      return result as IConceptRecordCount[];
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
