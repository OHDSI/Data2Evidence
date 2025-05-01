// @ts-types="npm:@types/pg"
import pg from "pg";
import {
  Filters,
  IConceptRelationship,
  IDuckdbConcept,
  IConceptRecommended,
  IConceptAncestor,
  IConcept,
  DatasetDialects,
  IConceptHierarchy,
} from "../types.ts";
import { env } from "../env.ts";
// import { env as transformersEnv, pipeline } from "transformers";
import { getGTEEmbedding } from "../utils/helperUtil.ts";

export class CachedbDAO {
  private readonly jwt: string;
  private readonly datasetId: string;
  private readonly vocabSchemaName: string;
  private readonly semanticRatio: number;

  constructor(
    jwt: string,
    datasetId: string,
    vocabSchemaName: string,
    semanticRatio: number
  ) {
    this.jwt = jwt;
    this.datasetId = datasetId;
    this.vocabSchemaName = vocabSchemaName;
    this.semanticRatio = semanticRatio;
    if (!jwt) {
      throw new Error("No token passed for CachedbDAO!");
    }
  }

  async getConcepts(
    pageNumber = 0,
    rowsPerPage: number,
    searchText = "",
    filters: Filters
  ) {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [duckdbFtsBaseQuery, duckdbFtsBaseQueryParams] =
        this.getOptimizedSearchQuery(searchText, textEmbedding, filters);
      const conceptsSql = `
      ${duckdbFtsBaseQuery}
      select *
          from fts
          limit ? OFFSET ?;
      `;

      const offset = pageNumber * rowsPerPage;
      const conceptsSqlParams = [
        ...duckdbFtsBaseQueryParams,
        rowsPerPage,
        offset,
      ];
      const countSql = `${duckdbFtsBaseQuery} select count(concept_id) as count from fts`;
      const countSqlParams = duckdbFtsBaseQueryParams;
      const sqlPromises = [
        client.query<IConcept>(conceptsSql, conceptsSqlParams),
        client.query<{ count: string }>(countSql, countSqlParams),
      ] as const;
      const results = await Promise.all(sqlPromises);

      const data = {
        hits: results[0].rows,
        totalHits: results[1] ? parseInt(results[1].rows[0].count) : 0,
      };
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getMultipleExactConcepts(
    searchTexts: number[],
    includeInvalid = true
  ): Promise<IDuckdbConcept> {
    if (!searchTexts.length) {
      return {
        hits: [],
        totalHits: 0,
      };
    }
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const searchTextWhereClause =
        searchTexts.reduce((accumulator, _searchText, index: number) => {
          accumulator += `$${index + 1},`;
          return accumulator;
        }, `concept_id IN (`) + ") ";

      const invalidReasonWhereClause = includeInvalid
        ? ""
        : `AND invalid_reason IS NULL `;

      const sql = `
        select *
        from ${this.vocabSchemaName}.concept
        WHERE
        ${searchTextWhereClause}
        ${invalidReasonWhereClause}
        `;

      const result: { rows: IConcept[]; rowCount: number } = await client.query(
        sql,
        [...searchTexts]
      );
      const data = {
        hits: result.rows,
        totalHits: result.rowCount ?? 0,
      };
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getConceptFilterOptionsFaceted(
    searchText: string,
    filters: Filters
  ): Promise<any> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      // Get the base query with filters applied once
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [baseQuery, baseQueryParams] = this.getDuckdbFtsBaseQuery(
        searchText,
        textEmbedding,
        filters
      );
      // Create a single consolidated query that gets all facet data at once
      const sql = `
        ${baseQuery}
        SELECT 'concept_class_id' as facet_type, concept_class_id as facet_value, COUNT(*) as count 
        FROM fts 
        GROUP BY concept_class_id
        
        UNION ALL
        
        SELECT 'domain_id' as facet_type, domain_id as facet_value, COUNT(*) as count 
        FROM fts 
        GROUP BY domain_id
        
        UNION ALL
        
        SELECT 'standard_concept' as facet_type, COALESCE(standard_concept, '') as facet_value, COUNT(*) as count 
        FROM fts 
        GROUP BY standard_concept
        
        UNION ALL
        
        SELECT 'vocabulary_id' as facet_type, vocabulary_id as facet_value, COUNT(*) as count 
        FROM fts 
        GROUP BY vocabulary_id
        
        UNION ALL
        
        SELECT 'valid_end_date' as facet_type, 
          CASE WHEN valid_end_date >= current_date THEN 'Valid' ELSE 'Invalid' END as facet_value, 
          COUNT(*) as count 
        FROM fts 
        GROUP BY facet_value;
      `;

      // Execute the query once instead of 5 separate queries
      const result = await client.query(sql, baseQueryParams);

      // Prepare the response structure
      const filterOptions: Record<string, Record<string, number>> = {
        conceptClassId: {},
        domainId: {},
        standardConcept: {},
        vocabularyId: {},
        validity: {},
      };

      // Process all results in a single loop
      for (const row of result.rows) {
        const facetType = row.facet_type;
        const facetValue = row.facet_value ?? ""; // Handle null values
        const count = Number(row.count);

        // Map to appropriate filter category
        switch (facetType) {
          case "concept_class_id":
            filterOptions.conceptClassId[facetValue] = count;
            break;
          case "domain_id":
            filterOptions.domainId[facetValue] = count;
            break;
          case "standard_concept":
            filterOptions.standardConcept[facetValue] = count;
            break;
          case "vocabulary_id":
            filterOptions.vocabularyId[facetValue] = count;
            break;
          case "valid_end_date":
            filterOptions.validity[facetValue] = count;
            break;
        }
      }

      // Calculate concept counts (derived from standard_concept)
      const standardConceptCount = filterOptions.standardConcept["S"] || 0;
      const totalConceptCount = Object.values(
        filterOptions.standardConcept
      ).reduce((acc, val) => acc + val, 0);

      filterOptions["concept"] = {
        Standard: standardConceptCount,
        "Non-standard": totalConceptCount - standardConceptCount,
      };
      return filterOptions;
    } catch (error) {
      console.error("Error fetching concept filter options:", error);
      throw error;
    } finally {
      await client.end();
    }
  }

  private getDuckdbFtsBaseQuery = (
    searchText: string,
    textEmbedding: string,
    filters: Filters,
    columns: string[] = []
  ): [string, any[]] => {
    const filterWhereClause = this.generateFilterWhereClause(filters);

    const columnsToSelect =
      columns.length === 0
        ? "concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason" // Exclude embeddings from results
        : columns.join(", ");
    if (searchText === "") {
      return [
        `
      with fts as (
        select
          ${columnsToSelect}
        from
          ${this.vocabSchemaName}.concept
          ${filterWhereClause}
        )
      `,
        [],
      ];
    } else if (this.semanticRatio > 0) {
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";

      return [
        `
      with sem_fts_scores as (
        select 
          ${columnsToSelect},
          ${this.vocabSchemaName}.fts_main_concept.match_bm25(concept_id, ?1) as fts_score,
          array_cosine_distance(concept_name_embedding, string_split(?2, ',')::FLOAT[384]) as embd_score
        from
          ${this.vocabSchemaName}.concept
          ${duckdbFtsWhereClause}
      ),
      fts as (
        select 
          sem_fts_scores.${columnsToSelect},
          (
            ${this.semanticRatio} * (embd_score + 1) / (select max(embd_score)+1 from sem_fts_scores) + 
            (1-${this.semanticRatio}) * fts_score / (select max(fts_score) from sem_fts_scores)
          ) as hybrid_score
        from 
          sem_fts_scores
        order by hybrid_score desc
        )
      `,
        [searchText, textEmbedding],
      ];
    } else {
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";
      return [
        `
      with fts as (
        select
          ${columnsToSelect},
          ${this.vocabSchemaName}.fts_main_concept.match_bm25(concept_id, ?) as score
        from
          ${this.vocabSchemaName}.concept
          ${duckdbFtsWhereClause}
          order by score desc
        )
      `,
        [searchText],
      ];
    }
  };

  /**
   * Optimized search query method with multi-factor scoring - used for concept searches
   *
   * Scoring system:
   * 1. Exact match (1000 points): When concept_name exactly matches the search term
   * 2. Starts with match (800 points): When concept_name starts with the search term
   * 3. Standard concept (100 points): When the concept is a standard concept (standard_concept = 'S')
   * 4. BM25 score: Base relevance score from full-text search
   *
   * The final score is the sum of all applicable scores, and results are ordered by this score.
   */
  private getOptimizedSearchQuery = (
    searchText: string,
    textEmbedding: string,
    filters: Filters,
    columns: string[] = []
  ): [string, any[]] => {
    const filterWhereClause = this.generateFilterWhereClause(filters);
    const columnsToSelect =
      columns.length === 0
        ? "concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason" // Exclude embeddings from results
        : columns.join(", ");

    if (searchText === "") {
      return [
        `
      with fts as (
        select
          ${columnsToSelect}
        from
          ${this.vocabSchemaName}.concept
          ${filterWhereClause}
        )
      `,
        [],
      ];
    } else if (this.semanticRatio > 0) {
      // Hybrid Search: Build the query with all scoring factors
      const query = `
      with concept_with_scores as (
        select
          ${columnsToSelect}${columns.length === 0 ? ", " : ""}
          -- Exact match scoring (highest priority)
          CASE
            WHEN LOWER(concept_name) = LOWER(?1) THEN 1000
            WHEN LOWER(concept_name) LIKE LOWER(?2) || '%' THEN 800
            ELSE 0
          END as exact_match_score,
          
          -- Standard concept boost
          CASE
            WHEN standard_concept = 'S' THEN 100
            ELSE 0
          END as standard_boost
        from
          ${this.vocabSchemaName}.concept
      ),
      sem_fts_scores as (
        select 
          ${columnsToSelect}${columns.length === 0 ? ", " : ""}
          ${
            this.vocabSchemaName
          }.fts_main_concept.match_bm25(concept_id, ?3) as fts_score,
          array_cosine_distance(concept_name_embedding, string_split(?4, ',')::FLOAT[384]) as embd_score
        from
          ${this.vocabSchemaName}.concept
          ${filterWhereClause}
        ),
      normalized_hybrid as (
        select 
          ${columnsToSelect}${columns.length === 0 ? ", " : ""}
          (
            ${this.semanticRatio} * 
            (embd_score + 1) / (select max(embd_score) + 1 from sem_fts_scores) + 
            (1 - ${this.semanticRatio}) * 
            fts_score / (select max(fts_score) from sem_fts_scores)
          ) as hybrid_score
        from 
          sem_fts_scores
      )
      
      select
        *,
        (nh.hybrid_score + c.exact_match_score + c.standard_boost) as score
      from
        concept_with_scores c
      join normalized_hybrid nh
        on nh.concept_id = c.concept_id
      WHERE score > 0
      ${filterWhereClause ? ` AND ${filterWhereClause.substring(7)}` : ""}
      order by score desc
      `;

      // Combine all parameters
      const queryParams = [
        searchText, // For exact match (equals)
        searchText, // For exact match (starts with)
        searchText, // For hybrid score
        textEmbedding, // For hybrid score
      ];

      // Create the final query with fts wrapper
      const finalQuery = `
      with fts as (
        ${query}
      )
      `;
      return [finalQuery, queryParams];
    } else {
      // FTS search: Build the query with all scoring factors
      const query = `
      with concept_with_scores as (
        select
          ${columnsToSelect}${columns.length === 0 ? ", " : ""}
          -- Base BM25 score (existing functionality)
          ${
            this.vocabSchemaName
          }.fts_main_concept.match_bm25(concept_id, ?1) as bm25_score,
          
          -- Exact match scoring (highest priority)
          CASE
            WHEN LOWER(concept_name) = LOWER(?2) THEN 1000
            WHEN LOWER(concept_name) LIKE LOWER(?3) || '%' THEN 800
            ELSE 0
          END as exact_match_score,
          
          -- Standard concept boost
          CASE
            WHEN standard_concept = 'S' THEN 100
            ELSE 0
          END as standard_boost
        from
          ${this.vocabSchemaName}.concept
      )
      
      select
        *,
        (bm25_score + exact_match_score + standard_boost) as score
      from
        concept_with_scores
      WHERE score > 0
      ${filterWhereClause ? ` AND ${filterWhereClause.substring(7)}` : ""}
      order by score desc
      `;

      // Combine all parameters
      const queryParams = [
        searchText, // For BM25 score
        searchText, // For exact match (equals)
        searchText, // For exact match (starts with)
      ];

      // Create the final query with fts wrapper
      const finalQuery = `
      with fts as (
        ${query}
      )
      `;
      return [finalQuery, queryParams];
    }
  };

  public generateFilterWhereClause(filters: Filters): string {
    const conceptClassIdFilter = filters.conceptClassId.map((filterValue) => {
      return `concept_class_id = '${filterValue}'`;
    });
    const domainIdFilter = filters.domainId.map((filterValue) => {
      return `domain_id = '${filterValue}'`;
    });
    const standardConceptFilter = filters.standardConcept.map((filterValue) => {
      if (filterValue === "S") return `standard_concept = 'S'`;
      else return `standard_concept != 'S'`;
    });
    const vocabularyIdFilter = filters.vocabularyId.map((filterValue) => {
      return `vocabulary_id = '${filterValue}'`;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySeconds = Math.floor(Number(today) / 1000);
    const validityFilter = filters.validity.map((filterValue) => {
      if (filterValue === "Valid") {
        return `valid_end_date >= ${todaySeconds}`;
      } else {
        return `valid_end_date < ${todaySeconds}`;
      }
    });

    const filterList = [
      ...conceptClassIdFilter,
      ...domainIdFilter,
      ...standardConceptFilter,
      ...vocabularyIdFilter,
      ...validityFilter,
    ];

    if (filterList.length === 0) {
      return "";
    } else {
      return ` WHERE ${filterList.join(" AND ")}`;
    }
  }

  async getConceptRelationships(conceptId: number): Promise<{
    hits: {
      relationship_id: string;
      concept_id_1: number;
      concept_id_2: number;
    }[];
    totalHits: number;
  }> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
      select *
          from ${this.vocabSchemaName}.concept_relationship
          WHERE concept_id_1=$1
          `;
      const result = await client.query(sql, [conceptId]);

      const data = {
        hits: result.rows,
        totalHits: result.rowCount,
      };
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getRelationships(relationshipIds: string[]): Promise<{
    hits: {
      relationship_id: string;
      relationship_name: string;
      is_hierarchical: string;
      defines_ancestry: string;
      reverse_relationship_id: string;
      relationship_concept_id: number;
    }[];
    totalHits: number;
  }> {
    if (!relationshipIds.length) {
      return {
        hits: [],
        totalHits: 0,
      };
    }
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const placeholders = relationshipIds
        .map((_, index) => `$${index + 1}`)
        .join(", ");
      const sql = `
      select *
          from ${this.vocabSchemaName}.relationship
          WHERE relationship_id in (${placeholders})
          `;
      const result = await client.query(sql, relationshipIds);
      const data = {
        hits: result.rows,
        totalHits: result.rowCount,
      };
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getExactConcept(
    conceptName: string | number,
    conceptColumnName: "concept_name" | "concept_id" | "concept_code"
  ): Promise<any> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
        select concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason from ${this.vocabSchemaName}.concept WHERE ${conceptColumnName}=? AND standard_concept='S';
            `;
      const result = await client.query(sql, [conceptName]);
      return result.rows ?? [];
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }
  }

  async getExactConceptRecommended(
    searchConceptIds: number[]
  ): Promise<IConceptRecommended[]> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
        select concept_id_1, concept_id_2, relationship_id from ${
          this.vocabSchemaName
        }.concept_recommended WHERE concept_id_1 IN (${searchConceptIds.join(
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

  async getExactConceptDescendants(
    searchConceptIds: number[]
  ): Promise<IConceptAncestor[]> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
    // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
    // https://github.com/alp-os/internal/issues/1411
    try {
      const sql = `
      select ancestor_concept_id, descendant_concept_id, min_levels_of_separation, max_levels_of_separation from ${
        this.vocabSchemaName
      }.concept_ancestor WHERE ancestor_concept_id IN (${searchConceptIds.join(
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

  async getConceptRelationship(
    searchConceptIds: number[],
    conceptRelationshipType: "Maps to"
  ): Promise<IConceptRelationship[]> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
        select concept_id_1, concept_id_2, relationship_id, valid_start_date, valid_end_date, invalid_reason from ${
          this.vocabSchemaName
        }.concept_relationship WHERE concept_id_2 IN (${searchConceptIds.join(
        ", "
      )}) AND relationship_id = ? AND invalid_reason IS NULL;
            `;
      const result = await client.query(sql, [conceptRelationshipType]);
      return result.rows;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getHierarchyDescendants(
    searchConceptId: number
  ): Promise<IConceptHierarchy[]> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
        select
          ca.ancestor_concept_id,
          ca.descendant_concept_id,
          -1 as depth,
          c.concept_id,
          c.concept_name,
          c.vocabulary_id,
          c.concept_class_id
        from
          ${this.vocabSchemaName}.concept_ancestor ca
        join ${this.vocabSchemaName}.concept c on
          c.concept_id = ca.descendant_concept_id
        where
          ca.min_levels_of_separation = 1
          and ca.ancestor_concept_id = ?;
            `;
      const result = await client.query(sql, [searchConceptId]);
      return result.rows;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getHierarchyAncestors(
    searchConceptId: number,
    maxDepth: number
  ): Promise<IConceptHierarchy[]> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      // Recursive SQL statement taken with reference from OHDSI Athena
      // src/main/java/com/odysseusinc/athena/repositories/v5/ConceptAncestorRelationV5Repository.java
      const sql = `
        WITH RECURSIVE
          r (depth) AS (
            SELECT
              0 AS depth,
              ca.ancestor_concept_id,
              ca.descendant_concept_id,
            FROM
            ${this.vocabSchemaName}.concept_ancestor ca
            WHERE
              ca.descendant_concept_id = ?
              AND ca.min_levels_of_separation = 0
            UNION
            SELECT
              depth + 1 AS depth,
              ca.ancestor_concept_id,
              ca.descendant_concept_id,
            FROM
              ${this.vocabSchemaName}.concept_ancestor ca
              JOIN r ON ca.descendant_concept_id = r.ancestor_concept_id
            WHERE
              ca.min_levels_of_separation = 1
              AND depth < ?::INT
          )
        SELECT
          r.*,
          c.concept_id,
          c.concept_name,
          c.vocabulary_id,
          c.concept_class_id
        FROM
          r
          JOIN ${this.vocabSchemaName}.concept c ON c.concept_id = r.ancestor_concept_id
          ORDER BY concept_id, ancestor_concept_id, descendant_concept_id;
            `;
      const result = await client.query(sql, [searchConceptId, maxDepth]);
      return result.rows;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  private getCachedbConnection = (jwt: string, datasetId: string) => {
    try {
      const client = new pg.Client({
        host: env.CACHEDB__HOST,
        port: env.CACHEDB__PORT,
        user: jwt,
        database: `A|${DatasetDialects.DUCKDB}|read|${datasetId}`,
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
