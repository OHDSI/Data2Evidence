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
  hasSearchTerm: boolean
): string {
  const defaultOrder = hasSearchTerm ? "ORDER BY score DESC" : "ORDER BY concept_name ASC";
  if (!sortBy) return defaultOrder;
  if (!(ALLOWED_SORT_COLUMNS as readonly string[]).includes(sortBy)) return defaultOrder;
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
  // Calibration constants for the hybrid score.
  //
  // bm25SaturationK shapes the normalization curve fts_score / (fts_score + k).
  // A smaller k makes BM25 saturate toward 1 faster, so even a moderately good
  // FTS hit already contributes near-maximum signal.
  //
  // hybridBoostScale multiplies the normalized [0,1] hybrid score so it can be
  // summed alongside the discrete boosts (exact_match, syn_exact, standard).
  // It is kept below 500 so the ranking invariants hold:
  //   - exact concept_name (1000) and prefix match (800) always outrank pure
  //     semantic hits
  //   - exact synonym (600) and synonym prefix (500) likewise outrank them
  //   - but a hybrid hit still beats standard_boost (100) on its own, which
  //     is what recovers token-disjoint matches such as
  //     "high blood sugar" -> "Hyperglycemia"
  // TODO: these constants could be tuned based on distributional analysis of the actual BM25 and embedding scores
  private readonly bm25SaturationK = 5; // Means BM25 scores around 5 contribute a strong signal of ~0.5 after normalization
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

  // ===========================================================================
  // concept_synonym mechanism
  //
  // A concept has one canonical concept_name plus zero-to-many concept_synonym
  // rows holding alternate labels, abbreviations, and translations. Searching
  // only against concept_name silently drops recall whenever a user types one
  // of those alternates, so every search path here folds synonym evidence into
  // the score alongside the concept_name evidence.
  //
  // The mechanism rests on two per-concept signals, both produced by the
  // synonym_scores CTE below by max-aggregating across all synonym rows that
  // belong to a concept:
  //
  //   syn_exact_score - discrete exact/prefix boost (600 / 500), scaled below
  //                     the concept_name boost (1000 / 800) so that a
  //                     canonical-name match always outranks a synonym match
  //                     of the same string.
  //   syn_bm25        - best BM25 score from the synonym FTS index, folded
  //                     into the concept-level fts_score via
  //                     GREATEST(concept_bm25, syn_bm25). To the downstream
  //                     hybrid calibration a synonym-only FTS hit therefore
  //                     looks identical to a concept_name FTS hit.
  //
  // Both the optimized search path (getOptimizedSearchQuery) and the facet
  // base query (getDuckdbFtsBaseQuery) build on this CTE, so synonym recall
  // stays consistent between the result list and the facet counts.
  // ===========================================================================

  // Per-concept synonym signals: best exact-match boost across this concept's
  // synonym rows + best BM25 across those rows. Used to "compensate" recall when
  // a concept's canonical concept_name doesn't match but one of its alternate
  // names does. Three positional params expected: searchText (exact),
  // searchText (starts-with), searchText (BM25).
  private getSynonymScoresCTE = (): string => `
    synonym_scores as (
      select
        cs.concept_id,
        MAX(CASE
          WHEN LOWER(cs.concept_synonym_name) = LOWER(?) THEN 600
          WHEN LOWER(cs.concept_synonym_name) LIKE LOWER(?) || '%' THEN 500
          ELSE 0
        END) as syn_exact_score,
        MAX(${this.fts_concept_synonym_identifier}.match_bm25(cs.fts_document_identifier_id, ?)) as syn_bm25
      from
        ${this.vocabSchemaName}.concept_synonym cs
      group by cs.concept_id
      having syn_exact_score > 0 OR syn_bm25 is not null
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
      const orderByClause = buildOrderByClause(sortBy, sortOrder, searchText !== "");

      const conceptsSql = `
      ${duckdbFtsBaseQuery}
      select *
          from fts
          ${orderByClause}
          LIMIT ? OFFSET ?;
      `;

      const offset = pageNumber * rowsPerPage;
      const conceptsSqlParams = [...duckdbFtsBaseQueryParams, rowsPerPage, offset];
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
      const [baseQuery, baseParams] =
        this.getOptimizedSearchQuery(searchText, textEmbedding, filters);

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
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";

      // Facet base query, hybrid: includes a concept if either its concept_name
      // or any synonym matches FTS. fts_score uses the strongest BM25 signal
      // across both tables before hybrid normalization.
      return [
        `
      with synonym_scores as (
        select cs.concept_id,
          MAX(${this.fts_concept_synonym_identifier}.match_bm25(cs.fts_document_identifier_id, ?)) as syn_bm25
        from ${this.vocabSchemaName}.concept_synonym cs
        group by cs.concept_id
        having syn_bm25 is not null
      ),
      sem_fts_scores as (
        select
          ${columnsToSelect},
          ${this.getBestBm25Score(
            `${this.fts_concept_identifier}.match_bm25(c.concept_id, ?)`,
            "sy.syn_bm25",
          )} as fts_score,
          array_cosine_similarity(concept_name_embedding, string_split(?, ',')::FLOAT[384]) as embd_score
        from
          ${this.vocabSchemaName}.concept c
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
        [searchText, searchText, textEmbedding],
      ];
    } else {
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";
      // Facet base query, FTS-only: same idea, simpler shape. Alias `score` is
      // referenced in WHERE (DuckDB allows this) to avoid a second match_bm25.
      return [
        `
      with synonym_scores as (
        select cs.concept_id,
          MAX(${this.fts_concept_synonym_identifier}.match_bm25(cs.fts_document_identifier_id, ?)) as syn_bm25
        from ${this.vocabSchemaName}.concept_synonym cs
        group by cs.concept_id
        having syn_bm25 is not null
      ),
      fts as (
        select
          ${columnsToSelect},
          ${this.getBestBm25Score(
            `${this.fts_concept_identifier}.match_bm25(c.concept_id, ?)`,
            "sy.syn_bm25",
          )} as score
        from
          ${this.vocabSchemaName}.concept c
          left join synonym_scores sy on sy.concept_id = c.concept_id
          ${duckdbFtsWhereClause}
          order by score desc
        )
      `,
        [searchText, searchText],
      ];
    }
  };

  /**
   * Build the hybrid search SQL used by the /concept search endpoint.
   *
   * The per-concept score is an additive sum of one continuous "relevance"
   * term and three discrete "label-quality" boosts. Rows are kept only when
   * at least one of these signals fires, and ordered by total score desc.
   *
   *   score = hybrid_part
   *         + exact_match_score   -- on concept_name
   *         + syn_exact_score     -- on concept_synonym (max over rows)
   *         + standard_boost      -- on standard_concept = 'S'
   *
   * Discrete boosts (chosen so canonical labels dominate alternates):
   *
   *   exact_match_score = 1000  if LOWER(concept_name) = LOWER(query)
   *                       800   if concept_name starts with query
   *                       0     otherwise
   *
   *   syn_exact_score   = max over this concept's synonym rows of
   *                       600   if LOWER(syn) = LOWER(query)
   *                       500   if syn starts with query
   *                       0     otherwise
   *
   *   standard_boost    = 100   if standard_concept = 'S', else 0
   *
   * Relevance term — two flavors depending on semanticRatio:
   *
   *   fts_score = GREATEST(concept_bm25, syn_bm25)
   *               -- best BM25 across the concept_name FTS index and the
   *               -- synonym FTS index, so a synonym-only FTS hit ranks
   *               -- identically to a concept_name FTS hit
   *
   *   semanticRatio = 0  (FTS-only):
   *     hybrid_part = COALESCE(fts_score, 0)
   *
   *   semanticRatio > 0 (hybrid):
   *     hybrid_part = hybridBoostScale * (
   *                     semanticRatio       * sem_norm
   *                   + (1 - semanticRatio) * fts_norm
   *                   )
   *
   *     Score normalization — the two relevance signals start on totally
   *     different scales, so each is mapped onto [0, 1] before they are
   *     mixed by the convex combination semanticRatio / (1 - semanticRatio):
   *
   *       Semantic: embedding_cos_sim lives in [-1, 1].
   *                 sem_norm = MAX(embedding_cos_sim, 0)
   *                 -- clamping negatives to 0 means a vector pointing
   *                    away from the query contributes nothing rather
   *                    than subtracting from the score.
   *                 sem_norm in [0, 1].
   *
   *       FTS:      fts_score lives in [0, +inf), unbounded above.
   *                 fts_norm = fts_score / (fts_score + bm25SaturationK)
   *                 -- a Michaelis-Menten-style saturation curve, monotone
   *                    in fts_score, with fts_norm = 0.5 at fts_score = k.
   *                    Smaller k means BM25 saturates faster (a moderate
   *                    hit already contributes near-1).
   *                 fts_norm in [0, 1).
   *
   *     The bracket is therefore in [0, 1], and hybrid_part is bounded by
   *     hybridBoostScale — the cap that the ranking invariants below rely on.
   *
   * Ranking invariants enforced by the constants
   * (hybridBoostScale = 400, bm25SaturationK = 5):
   *
   *   - concept_name exact (1000) / prefix (800) always outrank any pure
   *     hybrid hit, which is bounded by ~400.
   *   - synonym exact (600) / prefix (500) outrank pure hybrid hits as
   *     well, but lose to a concept_name match for the same string.
   *   - pure hybrid hits still beat standard_boost (100) alone, which is
   *     what lets token-disjoint queries surface via embedding similarity
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
      // CTE chain (rendered inside `with fts as (...)`):
      //   synonym_scores  -> per-concept synonym signals (exact boost + BM25)
      //   concept_with_scores -> concept_name exact/starts-with + standard boost
      //   sem_fts_scores  -> only when semanticRatio > 0; merges the strongest
      //                      concept/synonym BM25 into fts_score before normalization
      //   search_scores   -> final fts/embedding combination per concept
      //   (final select) -> sums boost + effective BM25, keeps any-signal rows
      const synonymCte = this.getSynonymScoresCTE();

      const conceptWithScores = `
        with ${synonymCte},
        concept_with_scores as (
          select
            ${columnsToSelect}${columns.length === 0 ? ", " : ""}
            -- Exact match scoring (highest priority)
            CASE
              WHEN LOWER(concept_name) = LOWER(?) THEN 1000
              WHEN LOWER(concept_name) LIKE LOWER(?) || '%' THEN 800
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

      if (this.semanticRatio > 0) {
        // Hybrid: fold the strongest concept/synonym BM25 into fts_score before
        // normalization so synonym-only matches rank as FTS hits too.
        searchScores = `
          sem_fts_scores as (
            select
              ${columnsToSelect}${columns.length === 0 ? ", " : ""}
              ${this.getBestBm25Score(
                `${this.fts_concept_identifier}.match_bm25(concept_id, ?)`,
                "sy.syn_bm25",
              )} as fts_score,
              array_cosine_similarity(concept_name_embedding, string_split(?, ',')::FLOAT[384]) as embd_score,
              sy.syn_exact_score as syn_exact_score
            from
              ${this.vocabSchemaName}.concept c
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
                (fts_score / (fts_score + ${this.bm25SaturationK}))
              ) as search_score
            from
              sem_fts_scores
          )
        `;
        queryParams = [
          searchText, // synonym exact
          searchText, // synonym starts-with
          searchText, // synonym BM25
          searchText, // concept exact
          searchText, // concept starts-with
          searchText, // concept BM25
          textEmbedding, // embedding
        ];
      } else {
        searchScores = `
          search_scores as (
            select
              ${columnsToSelect}${columns.length === 0 ? ", " : ""}
              ${this.fts_concept_identifier}.match_bm25(concept_id, ?) as search_score
            from
              ${this.vocabSchemaName}.concept c
          )
        `;
        queryParams = [
          searchText, // synonym exact
          searchText, // synonym starts-with
          searchText, // synonym BM25
          searchText, // concept exact
          searchText, // concept starts-with
          searchText, // concept BM25
        ];
      }

      // For hybrid, search_scores already merges synonym BM25 into search_score
      // and forwards syn_exact_score, so we don't re-join synonym_scores here.
      // For non-hybrid, search_score is raw concept BM25; combine it with
      // syn_bm25 in the final score, and pick up syn_exact_score via LEFT JOIN.
      const finalScores =
        this.semanticRatio > 0
          ? `
        select
          *,
          (
            COALESCE(ss.search_score, 0) * ${this.hybridBoostScale}
            + c.exact_match_score
            + COALESCE(ss.syn_exact_score, 0)
            + c.standard_boost
          ) as score
        from
          concept_with_scores c
        join search_scores ss
          on ss.concept_id = c.concept_id
        WHERE (
          ss.search_score IS NOT NULL
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
              "ss.search_score",
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
          ss.search_score IS NOT NULL
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
