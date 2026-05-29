import {
  Filters,
  IConceptRelationship,
  IDuckdbConcept,
  IConceptRecommended,
  IConceptAncestor,
  IConcept,
  IConceptHierarchy,
} from "../types.ts";
import { getGTEEmbedding } from "../utils/helperUtil.ts";
import { individualFilterWhereOR } from "./cachedb.ts";
import { ALLOWED_SORT_COLUMNS } from "../controllers/validators/conceptSchemas.ts";

function buildOrderByClause(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  hasSearchTerm: boolean,
): string {
  const defaultOrder = hasSearchTerm
    ? "ORDER BY score DESC"
    : "ORDER BY concept_name ASC";
  if (!sortBy) return defaultOrder;
  if (!(ALLOWED_SORT_COLUMNS as readonly string[]).includes(sortBy))
    return defaultOrder;
  if (sortBy === "score" && !hasSearchTerm) return "ORDER BY concept_name ASC";

  const direction = sortOrder === "asc" || sortOrder === "ASC" ? "ASC" : "DESC";
  return `ORDER BY ${sortBy} ${direction}`;
}

export class CachedbDAO {
  private readonly vocabSchemaName: string;
  private readonly semanticRatio: number;
  private readonly databaseCode: string;
  private readonly schemaName: string;
  private readonly resultsSchemaName: string;
  private readonly fts_concept_identifier: string;
  private readonly fts_concept_synonym_identifier: string;
  // Calibration for the hybrid score (see getOptimizedSearchQuery docblock for
  // how these feed the ranking invariants).
  // bm25SaturationK: BM25 normalization x/(x+k); smaller k saturates faster.
  // hybridBoostScale: caps the [0,1] hybrid score below the discrete boosts
  // (exact 1000 / prefix 800 / syn-exact 700 / contains 600 / syn-prefix 500)
  // while still beating standard_boost (100) so token-disjoint queries like
  // "high blood sugar" -> "Hyperglycemia" can surface via embeddings.
  private readonly bm25SaturationK = 5;
  private readonly hybridBoostScale = 400;

  constructor(
    vocabSchemaName: string,
    semanticRatio: number,
    databaseCode: string,
    schemaName: string,
    resultsSchemaName: string,
  ) {
    this.vocabSchemaName = vocabSchemaName;
    this.semanticRatio = semanticRatio;
    this.databaseCode = databaseCode;
    this.schemaName = schemaName;
    this.resultsSchemaName = resultsSchemaName;
    this.fts_concept_identifier = `fts_${vocabSchemaName}_concept`;
    this.fts_concept_synonym_identifier = `fts_${vocabSchemaName}_concept_synonym`;
  }

  // Per-concept synonym signals, max-aggregated across all synonym rows.
  // Always emits both columns; callers ignore whichever they don't need.
  // Callers MUST bind $1=searchText and $2=escapedSearchText (LIKE-safe).
  //   syn_exact_score: 700 if a synonym equals the query, 500 on prefix, else 0.
  //                    Sits below the concept_name exact/prefix tier (1000/800)
  //                    so canonical-name matches always outrank synonym matches
  //                    of the same string.
  //   syn_bm25:        best BM25 from the synonym FTS index. Folded into the
  //                    concept-level fts_score via GREATEST(concept_bm25, syn_bm25),
  //                    so synonym-only FTS hits rank like concept_name FTS hits.
  private getSynonymScoresCTE = (): string => `
    synonym_scores as (
      select
        cs.concept_id,
        MAX(CASE
          WHEN LOWER(cs.concept_synonym_name) = LOWER($1) THEN 700
          WHEN LOWER(cs.concept_synonym_name) LIKE LOWER($2) || '%' ESCAPE '\\' THEN 500
          ELSE 0
        END) as syn_exact_score,
        MAX(cs.raw_bm25) as syn_bm25
      from (
        select
          concept_id,
          concept_synonym_name,
          ${this.fts_concept_synonym_identifier}.match_bm25(fts_document_identifier_id, $1) as raw_bm25
        from ${this.vocabSchemaName}.concept_synonym
      ) cs
      where cs.raw_bm25 IS NOT NULL
         OR LOWER(cs.concept_synonym_name) = LOWER($1)
         OR LOWER(cs.concept_synonym_name) LIKE LOWER($2) || '%' ESCAPE '\\'
      group by cs.concept_id
    )
  `;

  private getBestBm25Score = (
    conceptBm25Expression: string,
    synonymBm25Expression: string,
  ): string => `
    NULLIF(
      GREATEST(
        COALESCE(${conceptBm25Expression}, 0),
        COALESCE(${synonymBm25Expression}, 0)
      ),
      0
    )
  `;

  async getConcepts(
    pageNumber = 0,
    rowsPerPage: number,
    searchText = "",
    filters: Filters,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const client = this.getTrexConnection();
    try {
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [duckdbFtsBaseQuery, duckdbFtsBaseQueryParams] =
        this.getOptimizedSearchQuery(searchText, textEmbedding, filters);
      const orderByClause = buildOrderByClause(
        sortBy,
        sortOrder,
        searchText !== "",
      );
      // LIMIT/OFFSET continue the numbered placeholders started by the base query.
      const limitIdx = duckdbFtsBaseQueryParams.length + 1;

      const conceptsSql = `
      ${duckdbFtsBaseQuery}
      select *
          from fts
          ${orderByClause}
          LIMIT $${limitIdx} OFFSET $${limitIdx + 1};
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

  async getConceptIds(searchText = "", filters: Filters): Promise<number[]> {
    const client = this.getTrexConnection();
    try {
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [baseQuery, baseParams] = this.getOptimizedSearchQuery(
        searchText,
        textEmbedding,
        filters,
      );

      const sql = `${baseQuery} select concept_id as id from fts`;
      const result = await client.query(sql, baseParams);
      return result.rows.map((row: any) => row.id as number);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getConceptsCount(searchText = "", filters: Filters): Promise<number> {
    const client = this.getTrexConnection();
    try {
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [duckdbFtsBaseQuery, duckdbFtsBaseQueryParams] =
        this.getOptimizedSearchQuery(searchText, textEmbedding, filters);

      const countSql = `${duckdbFtsBaseQuery} select count(concept_id) as count from fts`;
      const countSqlParams = duckdbFtsBaseQueryParams;
      const results = await client.query<{ count: string }>(
        countSql,
        countSqlParams,
      );

      return results ? parseInt(results.rows[0].count) : 0;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getMultipleExactConcepts(
    searchTexts: number[],
    includeInvalid = true,
  ): Promise<IDuckdbConcept> {
    if (!searchTexts.length) {
      return {
        hits: [],
        totalHits: 0,
      };
    }
    const client = this.getTrexConnection();
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
        [...searchTexts],
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
    filters: Filters,
  ): Promise<any> {
    const client = this.getTrexConnection();
    try {
      // Get the base query with filters applied once
      const textEmbedding =
        this.semanticRatio > 0
          ? (await getGTEEmbedding(searchText)).join(",")
          : "";
      const [baseQuery, baseQueryParams] = this.getDuckdbFtsBaseQuery(
        searchText,
        textEmbedding,
        filters,
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
        filterOptions.standardConcept,
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
    columns: string[] = [],
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
          ${this.vocabSchemaName}.concept c
          ${filterWhereClause}
        )
      `,
        [],
      ];
    } else if (this.semanticRatio > 0) {
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND fts_score is not null`
        : "WHERE fts_score is not null ";

      // Facet base query, hybrid path: include a concept if concept_name or
      // any synonym hits FTS. fts_score = strongest BM25 across both indexes.
      // syn_exact_score from the CTE is unused here (facet counts ignore it).
      const escapedSearchText = searchText.replace(/[%_\\]/g, "\\$&");
      return [
        `
      with ${this.getSynonymScoresCTE()},
      sem_fts_scores as (
        select
          ${columnsToSelect},
          ${this.getBestBm25Score(
            `${this.fts_concept_identifier}.match_bm25(c.concept_id, $1)`,
            "sy.syn_bm25",
          )} as fts_score,
          array_cosine_similarity(e.concept_name_embedding, string_split($3, ',')::FLOAT[384]) as embd_score
        from
          ${this.vocabSchemaName}.concept c
          JOIN ${this.vocabSchemaName}.concept_name_embeddings e USING (concept_id)
          left join synonym_scores sy on sy.concept_id = c.concept_id
          ${duckdbFtsWhereClause}
      ),
      fts as (
        select
          sem_fts_scores.${columnsToSelect},
          (
            ${this.semanticRatio} * GREATEST(embd_score, 0) +
            (1 - ${this.semanticRatio}) * (fts_score / (fts_score + ${this.bm25SaturationK}))
          ) as hybrid_score
        from
          sem_fts_scores
        where fts_score is not null
        order by hybrid_score desc
        )
      `,
        [searchText, escapedSearchText, textEmbedding], // $1, $2, $3
      ];
    } else {
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";
      // Facet base query, FTS-only: same shape, no embedding leg.
      // syn_exact_score from the CTE is unused here (facet counts ignore it).
      const escapedSearchText = searchText.replace(/[%_\\]/g, "\\$&");
      return [
        `
      with ${this.getSynonymScoresCTE()},
      fts as (
        select
          ${columnsToSelect},
          ${this.getBestBm25Score(
            `${this.fts_concept_identifier}.match_bm25(c.concept_id, $1)`,
            "sy.syn_bm25",
          )} as score
        from
          ${this.vocabSchemaName}.concept c
          left join synonym_scores sy on sy.concept_id = c.concept_id
          ${duckdbFtsWhereClause}
          order by score desc
        )
      `,
        [searchText, escapedSearchText], // $1, $2
      ];
    }
  };

  /**
   * Build the SQL used by the /concept search endpoint.
   *
   *   score = relevance + exact_match_score + syn_exact_score + standard_boost
   *
   * Discrete boosts on the canonical name and synonyms, ordered so
   * canonical-name matches always outrank synonym matches of the same string:
   *   exact_match_score (concept_name): 1000 equals / 800 prefix / 600 contains
   *   syn_exact_score   (concept_synonym, max over rows): 700 equals / 500 prefix
   *   standard_boost                                    : 100 if standard_concept = 'S'
   *
   * Relevance term:
   *   fts_score = GREATEST(concept_bm25, syn_bm25)  -- synonym-only FTS hits
   *                                                    rank like concept_name hits
   *   FTS-only       : relevance = COALESCE(fts_score, 0)
   *   hybrid (>0)    : relevance = hybridBoostScale * (
   *                       semanticRatio * MAX(embd_cos_sim, 0)              -- in [0, 1]
   *                     + (1 - semanticRatio) * fts_score / (fts_score + K) -- in [0, 1)
   *                   )                                                     -- in [0, hybridBoostScale]
   *   - MAX(embd, 0) clamps "vector points away from query" to 0 rather than subtract.
   *   - x/(x+K) is a Michaelis-Menten saturation curve; smaller K saturates faster.
   *
   * The constants (hybridBoostScale=400, bm25SaturationK=5) are chosen so that:
   *   - concept_name exact/prefix (1000/800) always beat pure hybrid (<=400),
   *   - syn exact / concept_name contains / syn prefix (700/600/500) also do,
   *   - but pure hybrid still beats standard_boost (100) on its own,
   *     which is what surfaces token-disjoint queries via embeddings
   *     (e.g. "high blood sugar" -> "Hyperglycemia").
   */
  private getOptimizedSearchQuery = (
    searchText: string,
    textEmbedding: string,
    filters: Filters,
    columns: string[] = [],
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
          ${this.vocabSchemaName}.concept c
          ${filterWhereClause}
        )
      `,
        [],
      ];
    } else {
      // CTE chain inside `with fts as (...)`:
      //   synonym_scores      -> per-concept syn_exact_score + syn_bm25
      //   concept_with_scores -> concept_name exact/prefix/contains + standard boost
      //   search_scores       -> hybrid: normalized fts+embedding; FTS-only: raw concept BM25
      //   (final select)      -> sums all signals, keeps any-signal rows
      const synonymCte = this.getSynonymScoresCTE();
      // Escape SQL LIKE special chars so user-supplied % and _ are treated literally.
      const escapedSearchText = searchText.replace(/[%_\\]/g, "\\$&");

      const conceptWithScores = `
        with ${synonymCte},
        concept_with_scores as (
          select
            ${columnsToSelect}${columns.length === 0 ? ", " : ""}
            -- Exact match scoring (highest priority)
            CASE
              WHEN LOWER(concept_name) = LOWER($1) THEN 1000
              WHEN LOWER(concept_name) LIKE LOWER($2) || '%' ESCAPE '\\' THEN 800
              WHEN LOWER(concept_name) LIKE '%' || LOWER($2) || '%' ESCAPE '\\' THEN 600
              ELSE 0
            END as exact_match_score,
            -- Standard concept boost
            CASE
              WHEN standard_concept = 'S' THEN 100
              ELSE 0
            END as standard_boost
          from
            ${this.vocabSchemaName}.concept c
        ),
      `;

      let searchScores: string;
      let queryParams: any[];

      // Placeholder convention across both branches:
      //   $1 = searchText        (= comparisons, BM25 on concept + synonym)
      //   $2 = escapedSearchText (LIKE patterns on concept + synonym)
      //   $3 = textEmbedding     (hybrid path only)
      if (this.semanticRatio > 0) {
        // Hybrid: merge strongest concept/synonym BM25 into fts_score before
        // normalization so synonym-only matches rank as FTS hits too.
        searchScores = `
          sem_fts_scores as (
            select
              ${columnsToSelect}${columns.length === 0 ? ", " : ""}
              ${this.getBestBm25Score(
                `${this.fts_concept_identifier}.match_bm25(concept_id, $1)`,
                "sy.syn_bm25",
              )} as fts_score,
              array_cosine_similarity(e.concept_name_embedding, string_split($3, ',')::FLOAT[384]) as embd_score,
              sy.syn_exact_score as syn_exact_score
            from
              ${this.vocabSchemaName}.concept c
              JOIN ${this.vocabSchemaName}.concept_name_embeddings e USING (concept_id)
              left join synonym_scores sy on sy.concept_id = c.concept_id
              ${filterWhereClause}
            ),
          search_scores as (
            select
              ${columnsToSelect}${columns.length === 0 ? ", " : ""}
              syn_exact_score,
              (
                ${this.semanticRatio} * GREATEST(embd_score, 0) +
                (1 - ${this.semanticRatio}) *
                COALESCE(fts_score / (fts_score + ${this.bm25SaturationK}), 0)
              ) as hybrid_score
            from
              sem_fts_scores
          )
        `;
        queryParams = [searchText, escapedSearchText, textEmbedding];
      } else {
        // FTS-only: raw concept BM25 here; synonym BM25 is merged in the final
        // select via getBestBm25Score, and syn_exact_score via LEFT JOIN.
        searchScores = `
          search_scores as (
            select
              ${columnsToSelect}${columns.length === 0 ? ", " : ""}
              ${this.fts_concept_identifier}.match_bm25(concept_id, $1) as concept_bm25
            from
              ${this.vocabSchemaName}.concept c
          )
        `;
        queryParams = [searchText, escapedSearchText];
      }

      const finalScores =
        this.semanticRatio > 0
          ? `
        select
          *,
          (
            COALESCE(ss.hybrid_score, 0) * ${this.hybridBoostScale}
            + c.exact_match_score
            + COALESCE(ss.syn_exact_score, 0)
            + c.standard_boost
          ) as score
        from
          concept_with_scores c
        left join search_scores ss
          on ss.concept_id = c.concept_id
        WHERE (
          ss.hybrid_score IS NOT NULL
          OR c.exact_match_score > 0
          OR ss.syn_exact_score > 0
        )
        ${filterWhereClause ? ` AND ${filterWhereClause.substring(7)}` : ""}
        order by score desc
      `
          : `
        select
          *,
          (
            COALESCE(${this.getBestBm25Score(
              "ss.concept_bm25",
              "sy.syn_bm25",
            )}, 0)
            + c.exact_match_score
            + COALESCE(sy.syn_exact_score, 0)
            + c.standard_boost
          ) as score
        from
          concept_with_scores c
        join search_scores ss
          on ss.concept_id = c.concept_id
        left join synonym_scores sy
          on sy.concept_id = c.concept_id
        WHERE (
          ss.concept_bm25 IS NOT NULL
          OR sy.syn_bm25 IS NOT NULL
          OR c.exact_match_score > 0
          OR sy.syn_exact_score > 0
        )
        ${filterWhereClause ? ` AND ${filterWhereClause.substring(7)}` : ""}
        order by score desc
      `;

      const finalQuery = `
        with fts as (
          ${conceptWithScores}
          ${searchScores}
          ${finalScores}
        )
      `;
      return [finalQuery, queryParams];
    }
  };

  public generateFilterWhereClause(filters: Filters): string {
    const conceptClassIdFilter = filters.conceptClassId.map((filterValue) => {
      return `c.concept_class_id = '${filterValue}'`;
    });
    const domainIdFilter = filters.domainId.map((filterValue) => {
      return `c.domain_id = '${filterValue}'`;
    });
    const standardConceptFilter = filters.standardConcept.map((filterValue) => {
      if (filterValue === "S") return `c.standard_concept = 'S'`;
      else return `c.standard_concept != 'S'`;
    });
    const vocabularyIdFilter = filters.vocabularyId.map((filterValue) => {
      return `c.vocabulary_id = '${filterValue}'`;
    });
    const validityFilter = filters.validity.map((filterValue) => {
      if (filterValue === "Valid") {
        return `c.valid_end_date >= current_date`;
      } else {
        return `c.valid_end_date < current_date`;
      }
    });

    const filterList = [
      individualFilterWhereOR(conceptClassIdFilter),
      individualFilterWhereOR(domainIdFilter),
      individualFilterWhereOR(standardConceptFilter),
      individualFilterWhereOR(vocabularyIdFilter),
      individualFilterWhereOR(validityFilter),
    ].filter(Boolean); // Remove empty strings from array

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
    const client = this.getTrexConnection();
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
    const client = this.getTrexConnection();
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
    conceptColumnName: "concept_name" | "concept_id" | "concept_code",
  ): Promise<any> {
    const client = this.getTrexConnection();
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
    searchConceptIds: number[],
  ): Promise<IConceptRecommended[]> {
    const client = this.getTrexConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
      const sql = `
        select concept_id_1, concept_id_2, relationship_id from ${
          this.vocabSchemaName
        }.concept_recommended WHERE concept_id_1 IN (${searchConceptIds.join(
          ", ",
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
    searchConceptIds: number[],
  ): Promise<IConceptAncestor[]> {
    const client = this.getTrexConnection();
    // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
    // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
    // https://github.com/OHDSI/Data2Evidence/issues/1057
    try {
      const sql = `
      select ancestor_concept_id, descendant_concept_id, min_levels_of_separation, max_levels_of_separation from ${
        this.vocabSchemaName
      }.concept_ancestor WHERE ancestor_concept_id IN (${searchConceptIds.join(
        ", ",
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
    conceptRelationshipType: "Maps to",
  ): Promise<IConceptRelationship[]> {
    const client = this.getTrexConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
      // https://github.com/OHDSI/Data2Evidence/issues/1057
      const sql = `
        select concept_id_1, concept_id_2, relationship_id, valid_start_date, valid_end_date, invalid_reason from ${
          this.vocabSchemaName
        }.concept_relationship WHERE concept_id_2 IN (${searchConceptIds.join(
          ", ",
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
    searchConceptId: number,
  ): Promise<IConceptHierarchy[]> {
    const client = this.getTrexConnection();
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
    maxDepth: number,
  ): Promise<IConceptHierarchy[]> {
    const client = this.getTrexConnection();
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

  private getTrexConnection = () => {
    return new TrexConnection(
      this.databaseCode,
      this.schemaName,
      this.vocabSchemaName,
      this.resultsSchemaName,
    );
  };
}

class TrexConnection {
  private readonly conn: any;

  constructor(
    databaseCode: string,
    schemaName: string,
    vocabSchemaName: string,
    resultsSchemaName: string,
  ) {
    try {
      const dbm = Trex.databaseManager();
      const conn = dbm.getConnection(
        databaseCode,
        schemaName,
        vocabSchemaName,
        resultsSchemaName,
        {
          duckdb: (e: unknown) => e,
        }, // Dummy function which returns itself, originally used for translation function
      );

      this.conn = conn;
    } catch (err) {
      console.error("Error getting trex connection, ", err);
      throw err;
    }
  }

  async query<R extends any = any, I = any>(
    sql: string,
    params: any[] = [],
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.conn.execute(
        sql,
        params.map((e) => {
          return { value: e };
        }),
        (err, res) => {
          if (err) {
            return reject(err);
          }

          // Map results to row object which cachedbDao expects
          // TODO: Remove mapping when we decide to remove cachedb connection option
          resolve({ rows: res, rowCount: res.length ?? 0 });
        },
      );
    });
  }

  async end() {
    this.conn.close();
  }
}
