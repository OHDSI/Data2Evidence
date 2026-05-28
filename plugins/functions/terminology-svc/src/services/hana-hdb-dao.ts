import * as hdb from "hdb";
import pg from "pg";
import { decode } from "jsonwebtoken";
import {
  Filters,
  IConceptRelationship,
  IDuckdbConcept,
  IConceptRecommended,
  IHanaConceptRecommended,
  IConceptAncestor,
  IHanaConceptAncestor,
  IHanaConcept,
  IHanaConceptRelationship,
  IConcept,
  IConceptHierarchy,
  IHanaConceptHierarchy,
} from "../types.ts";
import { env } from "../env.ts";
import { individualFilterWhereOR } from "./cachedb.ts";
import { ALLOWED_SORT_COLUMNS } from "../controllers/validators/conceptSchemas.ts";
import { getGTEEmbedding } from "../utils/helperUtil.ts";

const HANA_TOPK = env.HANA_HYBRID_TOPK;
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;
function assertSafeIdentifier(name: string, value: string) {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(
      `Invalid ${name}: must match ${SAFE_IDENTIFIER} (alphanumerics and underscore only), got ${JSON.stringify(value)}`,
    );
  }
}

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

// Data access layer for HANA-backed terminology lookups. One instance is
// constructed per request — it carries the JWT plus schema context
export class HanaHDBDao {
  private readonly jwt: string;
  private readonly vocabSchemaName: string;
  private readonly databaseCode: string;
  private readonly semanticRatio: number;
  private readonly schemaName: string;

  constructor(
    jwt: string,
    vocabSchemaName: string,
    databaseCode: string,
    semanticRatio: number = 0,
    schemaName: string = "",
  ) {
    if (!jwt) {
      throw new Error("No token passed for HanaHDBDao!");
    }
    assertSafeIdentifier("databaseCode", databaseCode);
    assertSafeIdentifier("vocabSchemaName", vocabSchemaName);
    // schemaName is "" for non-hybrid callers; only validate when actually set.
    if (schemaName !== "") assertSafeIdentifier("schemaName", schemaName);

    this.jwt = jwt;
    this.vocabSchemaName = vocabSchemaName;
    this.databaseCode = databaseCode;
    this.semanticRatio = semanticRatio;
    this.schemaName = schemaName;
  }

  private getTrexConnection = async () => {
    // Original dbm.getConnection routed to the HANA engine for HANA datasets, which can't run DuckDB hybrid SQL
    // TREX__SQL__* are optional in env.ts because terminology-svc deployments
    // without HANA hybrid search don't need them.
    const required = {
      TREX__SQL__HOST: env.TREX__SQL__HOST,
      TREX__SQL__PORT: env.TREX__SQL__PORT,
      TREX__SQL__USER: env.TREX__SQL__USER,
      TREX__SQL__PASSWORD: env.TREX__SQL__PASSWORD,
      TREX__SQL__DBNAME: env.TREX__SQL__DBNAME,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      throw new Error(
        `HANA hybrid search requires the following env vars: ${missing.join(", ")}. ` +
          `Add them to the terminology-svc env block in plugins/functions/package.json.`,
      );
    }
    const client = new pg.Client({
      host: required.TREX__SQL__HOST,
      port: Number(required.TREX__SQL__PORT),
      user: required.TREX__SQL__USER,
      password: required.TREX__SQL__PASSWORD,
      database: required.TREX__SQL__DBNAME,
    });

    try {
      await client.connect();
      await client.query(
        `ATTACH IF NOT EXISTS '/usr/src/data/cache/${this.databaseCode}.db' AS "${this.databaseCode}"`,
      );
    } catch (err) {
      try {
        await client.end();
      } catch (_) {
        // best-effort: client may already be in an error state
      }
      throw err;
    }
    return {
      query: async (sql: string, params: any[] = []) => {
        const res = await client.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? 0 };
      },
      end: () => client.end(),
    };
  };

  private asyncExec(
    client: any,
    sql: string,
    params: (string | number)[] = [],
  ) {
    return new Promise((resolve, reject) => {
      client.prepare(sql, function (err, statement) {
        if (err) {
          console.error("Prepare error:", err);
          reject(err);
        }
        statement.exec(params, function (err, rows) {
          if (err) {
            console.error("Execute error:", err);
            reject(err);
          }
          resolve(rows);
        });
      });
    });
  }

  // Public entry: paged, filtered concept search. Routes to hybrid (union or rerank, picked by env.HANA_HYBRID_MODE) when semanticRatio>0, the user typed a search term, and the sort is by score; otherwise it runs the plain HANA FTS path with the supplied sortBy/sortOrder.
  async getConcepts(
    pageNumber = 0,
    rowsPerPage: number,
    searchText = "",
    filters: Filters,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const isHybridEligible =
      this.semanticRatio > 0 &&
      searchText !== "" &&
      (!sortBy || sortBy === "score");

    const client = await this.getHanaHDBConnection();
    try {
      if (isHybridEligible) {
        if (env.HANA_HYBRID_MODE === "union") {
          return await this.getConceptsHybridUnion(
            client,
            pageNumber,
            rowsPerPage,
            searchText,
            filters,
          );
        }
        return await this.getConceptsHybridRerank(
          client,
          pageNumber,
          rowsPerPage,
          searchText,
          filters,
        );
      }

      const [hanaFtsBaseQuery, hanaFtsBaseQueryParams] =
        this.getHanaFtsBaseQuery(searchText, filters);
      const orderByClause = buildOrderByClause(
        sortBy,
        sortOrder,
        searchText !== "",
      );

      const conceptsSql = `
      ${hanaFtsBaseQuery}
      select *
          from fts
          ${orderByClause}
          LIMIT ? OFFSET ?;
          `;

      const offset = pageNumber * rowsPerPage;
      const conceptsSqlParams = [
        ...hanaFtsBaseQueryParams,
        rowsPerPage,
        offset,
      ];

      const countSql = `${hanaFtsBaseQuery} select count(concept_id) as count from fts`;
      const countSqlParams = hanaFtsBaseQueryParams;
      const sqlPromises = [
        this.asyncExec(client, conceptsSql, conceptsSqlParams),
        this.asyncExec(client, countSql, countSqlParams),
      ] as const;
      const results = await Promise.all(sqlPromises);
      const data = {
        hits: this.mapHanaConcepts(results[0]),
        totalHits: results[1][0] ? parseInt(results[1][0].COUNT) : 0,
      };
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  // Hybrid mode "rerank": HANA FTS picks the candidate set, then DuckDB
  // re-orders it by a normalized blend of FTS score and embedding distance.
  private async getConceptsHybridRerank(
    hanaClient: any,
    pageNumber: number,
    rowsPerPage: number,
    searchText: string,
    filters: Filters,
  ) {
    const trexClient = await this.getTrexConnection();
    try {
      const filterWhere = this.generateFilterWhereClause(filters);
      const ftsAndFilter = filterWhere
        ? filterWhere.replace("WHERE", "AND")
        : "";

      const ftsSql = `
        SELECT concept_id, SCORE() as fts_score
        FROM ${this.vocabSchemaName}.concept
        WHERE CONTAINS(*, ?, FUZZY(${env.HANA_FTS_FUZZY}))
        ${ftsAndFilter}
        ORDER BY SCORE() DESC
        LIMIT ${HANA_TOPK}
      `;
      const ftsRows = (await this.asyncExec(hanaClient, ftsSql, [
        `*${searchText}*`,
      ])) as Array<{ CONCEPT_ID: number; FTS_SCORE: number }>;

      // totalHits = min(trueCount, HANA_TOPK)
      const totalHits = ftsRows.length;
      if (totalHits === 0) return { hits: [], totalHits: 0 };

      const embedding = (await getGTEEmbedding(searchText)).join(",");
      const valuesClause = ftsRows
        .map((r) => `(${r.CONCEPT_ID}, ${r.FTS_SCORE})`)
        .join(",");

      const offset = pageNumber * rowsPerPage;
      // Rerank hybrid score on the FTS candidate set:
      //   hybrid_score = α · norm(embd_score) + (1 − α) · norm(fts_score)
      // where
      //   α               = this.semanticRatio          (0..1, from hybridSearchConfig)
      //   embd_score      = array_cosine_similarity(cached_embedding, query_embedding)
      //   fts_score       = HANA SCORE() over CONTAINS(*, ?, FUZZY(env.HANA_FTS_FUZZY))
      //   norm(x)         = (x − min(x)) / (max(x) − min(x))  over the FTS candidate set
      // Pipeline: HANA FTS → fts_input → join cached embeddings → min-max normalize
      //           → blend by α → ORDER BY hybrid_score DESC → LIMIT/OFFSET
      const duckdbSql = `
        WITH fts_input(concept_id, fts_score) AS (VALUES ${valuesClause}),
             with_embd AS (
               SELECT
                 f.concept_id,
                 f.fts_score,
                 array_cosine_similarity(
                   e.concept_name_embedding,
                   string_split('${embedding}', ',')::FLOAT[384]
                 ) AS embd_score
               FROM fts_input f
               LEFT JOIN "${this.databaseCode}"."${this.schemaName}".concept_name_embeddings e USING (concept_id)
             ),
             stats AS (
               SELECT
                 min(embd_score) AS min_e, max(embd_score) AS max_e,
                 min(fts_score)  AS min_f, max(fts_score)  AS max_f
               FROM with_embd
             ),
             scored AS (
               SELECT
                 w.concept_id,
                 (
                   ${this.semanticRatio} * COALESCE(
                     (w.embd_score - s.min_e) / NULLIF(s.max_e - s.min_e, 0), 0
                   )
                   + (1 - ${this.semanticRatio}) * COALESCE(
                     (w.fts_score  - s.min_f) / NULLIF(s.max_f - s.min_f, 0), 0
                   )
                 ) AS hybrid_score
               FROM with_embd w CROSS JOIN stats s
             )
        SELECT concept_id
        FROM scored
        ORDER BY hybrid_score DESC NULLS LAST
        LIMIT ${rowsPerPage} OFFSET ${offset}
      `;
      const ranked = await trexClient.query(duckdbSql);
      const rankedIds: number[] = ranked.rows.map((r: any) => r.concept_id);
      if (rankedIds.length === 0) return { hits: [], totalHits };

      const fullRowsSql = `
        SELECT concept_id, concept_name, domain_id, vocabulary_id,
               concept_class_id, standard_concept, concept_code,
               valid_start_date, valid_end_date, invalid_reason
        FROM ${this.vocabSchemaName}.concept
        WHERE concept_id IN (${rankedIds.join(",")})
      `;
      const fullRows = (await this.asyncExec(hanaClient, fullRowsSql)) as any[];

      // hdb returns CONCEPT_ID as a string while DuckDB returns concept_id
      // as a number — normalize both sides to number so the lookup hits.
      const byId = new Map<number, any>();
      for (const row of fullRows) byId.set(Number(row.CONCEPT_ID), row);
      const orderedRows = rankedIds
        .map((id) => byId.get(Number(id)))
        .filter((r) => r !== undefined);

      return {
        hits: this.mapHanaConcepts(orderedRows),
        totalHits,
      };
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await trexClient.end();
    }
  }

  // Hybrid mode "union": run FTS on HANA and a top-K cosine scan on DuckDB
  // independently, filter-check the semantic side on HANA (the cache only
  // carries concept_id + embedding, so filter columns live on HANA), then
  // FULL OUTER JOIN the two filtered candidate sets and blend scores.
  // Both sides feed scoring already filtered, which is what makes totalHits
  // and OFFSET/LIMIT correct.
  private async getConceptsHybridUnion(
    hanaClient: any,
    pageNumber: number,
    rowsPerPage: number,
    searchText: string,
    filters: Filters,
  ) {
    const trexClient = await this.getTrexConnection();
    try {
      const filterWhere = this.generateFilterWhereClause(filters);
      const ftsAndFilter = filterWhere
        ? filterWhere.replace("WHERE", "AND")
        : "";

      const ftsSql = `
        SELECT concept_id, SCORE() as fts_score
        FROM ${this.vocabSchemaName}.concept
        WHERE CONTAINS(*, ?, FUZZY(${env.HANA_FTS_FUZZY}))
        ${ftsAndFilter}
        ORDER BY SCORE() DESC
        LIMIT ${HANA_TOPK}
      `;
      const ftsRows = (await this.asyncExec(hanaClient, ftsSql, [
        `*${searchText}*`,
      ])) as Array<{ CONCEPT_ID: number; FTS_SCORE: number }>;

      const embedding = (await getGTEEmbedding(searchText)).join(",");

      // Top-K cosine on DuckDB. Unfiltered here because the HANA cache only
      // stores concept_id + concept_name_embedding — filter columns aren't
      // available in DuckDB, so we filter-check this set on HANA below.
      const semTopKSql = `
        SELECT
          e.concept_id,
          array_cosine_similarity(
            e.concept_name_embedding,
            string_split('${embedding}', ',')::FLOAT[384]
          ) AS embd_score
        FROM "${this.databaseCode}"."${this.schemaName}".concept_name_embeddings e
        ORDER BY embd_score DESC
        LIMIT ${env.HANA_HYBRID_TOPK}
      `;
      const semTopK = await trexClient.query(semTopKSql);

      // Apply user filters to the semantic candidates via a HANA round-trip,
      // so the union below contains only filter-passing concepts on both
      // sides. Skip the round-trip when no filters are set.
      let semKept: Array<{ concept_id: number; embd_score: number }> = [];
      if (semTopK.rows.length > 0) {
        if (!filterWhere) {
          semKept = semTopK.rows.map((r: any) => ({
            concept_id: Number(r.concept_id),
            embd_score: Number(r.embd_score),
          }));
        } else {
          const semIds = semTopK.rows.map((r: any) => Number(r.concept_id));
          const filterCheckSql = `
            SELECT concept_id
            FROM ${this.vocabSchemaName}.concept
            WHERE concept_id IN (${semIds.join(",")})
            ${ftsAndFilter}
          `;
          const passed = (await this.asyncExec(
            hanaClient,
            filterCheckSql,
          )) as Array<{ CONCEPT_ID: string }>;
          const passedSet = new Set(passed.map((r) => Number(r.CONCEPT_ID)));
          semKept = semTopK.rows
            .filter((r: any) => passedSet.has(Number(r.concept_id)))
            .map((r: any) => ({
              concept_id: Number(r.concept_id),
              embd_score: Number(r.embd_score),
            }));
        }
      }

      if (ftsRows.length === 0 && semKept.length === 0) {
        return { hits: [], totalHits: 0 };
      }

      const ftsValues =
        ftsRows.length > 0
          ? ftsRows.map((r) => `(${r.CONCEPT_ID}, ${r.FTS_SCORE})`).join(",")
          : "(NULL::INTEGER, NULL::DOUBLE)";
      const semValues =
        semKept.length > 0
          ? semKept.map((r) => `(${r.concept_id}, ${r.embd_score})`).join(",")
          : "(NULL::INTEGER, NULL::DOUBLE)";

      // Union hybrid score over (filtered FTS hits) ⋃ (filtered top-K cosine):
      //   hybrid_score = α · norm(embd_score) + (1 − α) · norm(fts_score)
      // where
      //   α               = this.semanticRatio          (0..1, from hybridSearchConfig)
      //   candidates      = filtered_FTS_hits ∪ filtered_sem_topk
      //   fts_score (FTS-miss row)  = 0   ┐ filled by COALESCE before normalization,
      //   embd_score (sem-miss row) = 0   ┘ so the missing side contributes nothing
      //   norm(x)         = (x − min(x)) / (max(x) − min(x))  over the unioned set
      // Both inputs are already filter-checked, so count(*) OVER () matches
      // the filtered totalHits and pagination is over filtered ranks.
      const offset = pageNumber * rowsPerPage;
      const duckdbSql = `
        WITH fts_input(concept_id, fts_score) AS (VALUES ${ftsValues}),
             sem_input(concept_id, embd_score) AS (VALUES ${semValues}),
             combined AS (
               SELECT
                 COALESCE(f.concept_id, s.concept_id) AS concept_id,
                 COALESCE(f.fts_score, 0) AS fts_score,
                 COALESCE(s.embd_score, 0) AS embd_score
               FROM fts_input f
               FULL OUTER JOIN sem_input s USING (concept_id)
               WHERE COALESCE(f.concept_id, s.concept_id) IS NOT NULL
             ),
             stats AS (
               SELECT
                 min(embd_score) AS min_e, max(embd_score) AS max_e,
                 min(fts_score)  AS min_f, max(fts_score)  AS max_f
               FROM combined
             ),
             scored AS (
               SELECT
                 c.concept_id,
                 (
                   ${this.semanticRatio} * COALESCE(
                     (c.embd_score - s.min_e) / NULLIF(s.max_e - s.min_e, 0), 0
                   )
                   + (1 - ${this.semanticRatio}) * COALESCE(
                     (c.fts_score  - s.min_f) / NULLIF(s.max_f - s.min_f, 0), 0
                   )
                 ) AS hybrid_score
               FROM combined c CROSS JOIN stats s
             )
        SELECT concept_id, count(*) OVER () AS total_hits
        FROM scored
        ORDER BY hybrid_score DESC NULLS LAST
        LIMIT ${rowsPerPage} OFFSET ${offset}
      `;
      const ranked = await trexClient.query(duckdbSql);
      const rankedIds: number[] = ranked.rows.map((r: any) => r.concept_id);
      const totalHits = ranked.rows[0]
        ? parseInt(ranked.rows[0].total_hits)
        : 0;
      if (rankedIds.length === 0) return { hits: [], totalHits };

      // No filter needed here — both candidate sides were already
      // filter-checked above, so every rankedId is guaranteed to pass.
      const fullRowsSql = `
        SELECT concept_id, concept_name, domain_id, vocabulary_id,
               concept_class_id, standard_concept, concept_code,
               valid_start_date, valid_end_date, invalid_reason
        FROM ${this.vocabSchemaName}.concept
        WHERE concept_id IN (${rankedIds.join(",")})
      `;
      const fullRows = (await this.asyncExec(hanaClient, fullRowsSql)) as any[];

      // hdb returns CONCEPT_ID as a string while DuckDB returns concept_id
      // as a number — normalize both sides to number so the lookup hits.
      const byId = new Map<number, any>();
      for (const row of fullRows) byId.set(Number(row.CONCEPT_ID), row);
      const orderedRows = rankedIds
        .map((id) => byId.get(Number(id)))
        .filter((r) => r !== undefined);

      return {
        hits: this.mapHanaConcepts(orderedRows),
        totalHits,
      };
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await trexClient.end();
    }
  }

  // Returns the full concept_id list matching filter+search, no pagination.
  // Used by callers that need every ID (e.g. concept-set generation, export).
  async getConceptIds(searchText = "", filters: Filters): Promise<number[]> {
    const client = await this.getHanaHDBConnection();
    try {
      const [baseQuery, baseParams] = this.getHanaFtsBaseQuery(
        searchText,
        filters,
      );
      const sql = `${baseQuery} select concept_id as id from fts`;
      const result = (await this.asyncExec(client, sql, baseParams)) as {
        ID: string;
      }[];
      return result.map((row) => parseInt(row.ID));
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getConceptsCount(searchText = "", filters: Filters): Promise<number> {
    const client = await this.getHanaHDBConnection();
    try {
      const [hanaFtsBaseQuery, hanaFtsBaseQueryParams] =
        this.getHanaFtsBaseQuery(searchText, filters);

      const countSql = `${hanaFtsBaseQuery} select count(concept_id) as count from fts`;
      const countSqlParams = hanaFtsBaseQueryParams;
      const results = await this.asyncExec(client, countSql, countSqlParams);
      return results[0] ? parseInt(results[0].COUNT) : 0;
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
  ): Promise<IDuckdbConcept | null> {
    if (searchTexts.length === 0) {
      return {
        hits: [],
        totalHits: 0,
      };
    }

    const client = await this.getHanaHDBConnection();
    try {
      const invalidReasonWhereClause = includeInvalid
        ? ""
        : `AND invalid_reason IS NULL `;

      const sql = `
        select *
        from ${this.vocabSchemaName}.concept
        WHERE
        concept_id IN (${searchTexts.join(", ")})
        ${invalidReasonWhereClause}
        `;
      // TODO: Move searchTexts as a sql parameter instead of being in the sql statement itself.
      // searchTexts has to be in sql statement now as trex-sql does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const result = (await this.asyncExec(client, sql)) as IHanaConcept[];
      if (result) {
        const data = {
          hits: this.mapHanaConcepts(result),
          totalHits: result.length,
        };
        return data;
      } else {
        return null;
      }
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
    const facetColumns = {
      conceptClassId: "concept_class_id",
      domainId: "domain_id",
      standardConcept: "standard_concept",
      vocabularyId: "vocabulary_id",
      validity: "valid_end_date",
    };

    const getFacetSql = (column: string): string => {
      return `
            select
              ${column},
              COUNT(${column}) as count
            from
              fts
            GROUP BY
              ${column};
          `;
    };
    const getValidityFacetSql = (column: string): string => {
      return `
            select
              valid_end_date,
              count(a.valid_end_date) as count
            from
              (
                SELECT
                  CASE
                    WHEN ${column} >= current_date THEN 'Valid'
                    ELSE 'Invalid'
                  end AS valid_end_date
                FROM
                  fts
              ) as a
            GROUP BY
              a.valid_end_date;
          `;
    };

    const client = await this.getHanaHDBConnection();
    try {
      const facetPromises = Object.values(facetColumns).map(
        (column: string) => {
          const [hanaFtsBaseQuery, hanaFtsBaseQueryParams] =
            this.getHanaFtsBaseQuery(searchText, filters, [column]);
          let facetSql;
          if (column === "valid_end_date") {
            facetSql = getValidityFacetSql(column);
          } else {
            facetSql = getFacetSql(column);
          }
          const sql = `
            ${hanaFtsBaseQuery}
            ${facetSql}
          `;
          const sqlParams = hanaFtsBaseQueryParams;
          return this.asyncExec(client, sql, sqlParams);
        },
      );

      const results = await Promise.all(facetPromises).then((data) => {
        return data.map((result) => {
          return this.lowercaseArrayObjectKeys(result);
        });
      });

      // Map data to match existing concept.service logic which works with meilisearch search results
      const filterOptions = Object.entries(facetColumns).reduce<{
        [index: string]: any;
      }>(
        (
          accumulator1: { [index: string]: { [index: string]: number } },
          [facetKey, facetColumn],
          index: number,
        ) => {
          const result = results[index];
          const fields = [facetColumn, "count"];

          accumulator1[facetKey] = result.reduce(
            (
              accumulator2: { [index: string]: number },
              { [fields[0]]: facetColumn, [fields[1]]: count }: any,
            ) => {
              accumulator2[facetColumn] = Number(count);
              return accumulator2;
            },
            {},
          );
          return accumulator1;
        },
        {},
      );
      // concept is a derived value, not from duckdb fts index search
      filterOptions["concept"] = (() => {
        const standardConcepts = filterOptions["standardConcept"];
        const standardConceptsCount = standardConcepts["S"] || 0;

        const totalConceptsCount = Object.values(standardConcepts).reduce(
          (accumulator: number, value) => accumulator + Number(value),
          0,
        );

        const nonStandardConceptsCount =
          totalConceptsCount - standardConceptsCount;
        return {
          Standard: standardConceptsCount,
          "Non-standard": nonStandardConceptsCount,
        };
      })();
      return filterOptions;
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }
  }

  private getHanaFtsBaseQuery = (
    searchText: string,
    filters: Filters,
    columns: string[] = [],
  ): [string, string[]] => {
    const filterWhereClause = this.generateFilterWhereClause(filters);

    const columnsToSelect = columns.length === 0 ? "*" : columns.join(", ");

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
    } else {
      // Widen recall by also matching against concept_synonym. SCORE() reflects
      // the CONTAINS in its own subquery, so we run two separate CONTAINS
      // probes, UNION ALL their (concept_id, score) rows, then MAX-aggregate
      // per concept_id. The aggregated score joins back to concept for
      // projection and filter application.
      const qualifiedColumns = columns.length === 0
        ? "c.*"
        : columns.map((col) => `c.${col}`).join(", ");
      return [
        `
        with all_matches as (
          select concept_id, SCORE() as match_score
          from ${this.vocabSchemaName}.concept
          WHERE CONTAINS (*, (?), FUZZY(${env.HANA_FTS_FUZZY}, 'similarCalculationMode=substringsearch'))
          union all
          select concept_id, SCORE() as match_score
          from ${this.vocabSchemaName}.concept_synonym
          WHERE CONTAINS (concept_synonym_name, (?), FUZZY(${env.HANA_FTS_FUZZY}, 'similarCalculationMode=substringsearch'))
        ),
        matched_concepts as (
          select concept_id, MAX(match_score) as score
          from all_matches
          group by concept_id
        ),
        fts as (
          select
            ${qualifiedColumns},
            m.score
          from
            ${this.vocabSchemaName}.concept c
            join matched_concepts m on m.concept_id = c.concept_id
            ${filterWhereClause}
            order by score desc
          )
        `,
        // similarCalculationMode=substringsearch makes fuzzy match work on a
        // subpart of the indexed text, so the previous *...* wildcards are
        // redundant. Double-quote-wrap searchText to keep multi-word phrases
        // as one token.
        [`"${searchText}"`, `"${searchText}"`],
      ];
    }
  };

  private generateFilterWhereClause(filters: Filters): string {
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
    const todayDate = today.toISOString().slice(0, 10).replace("T", " ");
    const validityFilter = filters.validity.map((filterValue) => {
      if (filterValue === "Valid") {
        return `valid_end_date >= '${todayDate}'`;
      } else {
        return `valid_end_date < '${todayDate}'`;
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

  async getConceptRelationships(conceptId: number): Promise<any> {
    const client = await this.getHanaHDBConnection();
    try {
      const sql = `
      select *
          from ${this.vocabSchemaName}.concept_relationship
          WHERE concept_id_1=?
          `;
      const result = await this.asyncExec(client, sql, [conceptId]);

      const data = {
        hits: this.lowercaseArrayObjectKeys(result),
        totalHits: result.length,
      };
      return data;
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }
  }

  async getRelationships(relationshipIds: string[]): Promise<any> {
    if (relationshipIds.length === 0) {
      return {
        hits: [],
        totalHits: 0,
      };
    }

    const client = await this.getHanaHDBConnection();
    try {
      const sql = `
      select *
          from ${this.vocabSchemaName}.relationship
          WHERE relationship_id IN (${relationshipIds
            .map((rid) => `'${rid}'`)
            .join(", ")})
          `;
      const result = await this.asyncExec(client, sql);
      const data = {
        hits: this.lowercaseArrayObjectKeys(result),
        totalHits: result.length,
      };
      return data;
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }
  }

  async getExactConcept(
    conceptName: string | number,
    conceptColumnName: "concept_name" | "concept_id" | "concept_code",
  ): Promise<any> {
    const client = await this.getHanaHDBConnection();
    try {
      const sql = `
        select concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason from ${this.vocabSchemaName}.concept WHERE ${conceptColumnName}=? AND standard_concept='S';
            `;
      const result = await this.asyncExec(client, sql, [conceptName]);
      return this.lowercaseArrayObjectKeys(result) ?? [];
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }
  }

  async getExactConceptRecommended(
    searchConceptIds: number[],
  ): Promise<IConceptRecommended[]> {
    const client = await this.getHanaHDBConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
        select concept_id_1, concept_id_2, relationship_id from ${
          this.vocabSchemaName
        }.concept_recommended WHERE concept_id_1 IN (${searchConceptIds.join(
          ", ",
        )});
      `;
      const result = (await this.asyncExec(
        client,
        sql,
      )) as IHanaConceptRecommended[];
      return this.mapHanaConceptsRecommended(result) ?? [];
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
    const client = await this.getHanaHDBConnection();
    // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
    // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
    // https://github.com/alp-os/internal/issues/1411
    try {
      const sql = `
      select ancestor_concept_id, descendant_concept_id, min_levels_of_separation, max_levels_of_separation from ${
        this.vocabSchemaName
      }.concept_ancestor WHERE ancestor_concept_id IN (${searchConceptIds.join(
        ", ",
      )});
      `;
      const result = (await this.asyncExec(
        client,
        sql,
      )) as IHanaConceptAncestor[];
      return this.mapHanaConceptsAncestor(result) ?? [];
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
    const client = await this.getHanaHDBConnection();
    try {
      // TODO: Move searchConceptIds as a sql parameter instead of being in the sql statement itself.
      // searchConceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const sql = `
        select concept_id_1, concept_id_2, relationship_id, valid_start_date, valid_end_date, invalid_reason from ${
          this.vocabSchemaName
        }.concept_relationship WHERE concept_id_2 IN (${searchConceptIds.join(
          ", ",
        )}) AND relationship_id = ? AND invalid_reason IS NULL;
            `;

      const result = (await this.asyncExec(client, sql, [
        conceptRelationshipType,
      ])) as IHanaConceptRelationship[];
      return this.mapHanaConceptsRelationship(result);
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
    const client = await this.getHanaHDBConnection();
    try {
      const sql = `
        select
          ca.*,
          -1 as DEPTH,
          c.concept_id,
          c.concept_name,
          c.vocabulary_id,
          c.concept_class_id
        from
          ${this.vocabSchemaName}.concept_ancestor ca
        join ${this.vocabSchemaName}.concept c on
          c.concept_id = ca.ancestor_concept_id
        where
          ca.min_levels_of_separation = 1
          and ca.ancestor_concept_id = ?;
            `;

      const result = (await this.asyncExec(client, sql, [
        searchConceptId,
      ])) as IHanaConceptHierarchy[];
      return this.mapHanaConceptsHierarchy(result);
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
    const client = await this.getHanaHDBConnection();
    let conceptAncestors: IConceptHierarchy[] = [];

    try {
      // Recursively get concept ancesters for concept hierarchy
      // Get self
      const sql = `
                    SELECT
                      0 AS DEPTH,
                      ca.ancestor_concept_id AS ANCESTOR_CONCEPT_ID,
                      ca.descendant_concept_id AS DESCENDANT_CONCEPT_ID,
                      c.concept_id AS CONCEPT_ID,
                      c.concept_name AS CONCEPT_NAME,
                      c.vocabulary_id AS VOCABULARY_ID,
                      c.concept_class_id AS CONCEPT_CLASS_ID
                    FROM
                    ${this.vocabSchemaName}.concept_ancestor ca
                    JOIN 
                      ${this.vocabSchemaName}.concept c ON c.concept_id = ca.ancestor_concept_id
                    WHERE
                      ca.descendant_concept_id = ?
                      AND ca.min_levels_of_separation = 0
                    ORDER BY 
                      CONCEPT_ID, ANCESTOR_CONCEPT_ID, DESCENDANT_CONCEPT_ID;
                    `;
      const result = (await this.asyncExec(client, sql, [
        searchConceptId,
      ])) as IHanaConceptHierarchy[];
      conceptAncestors = conceptAncestors.concat(
        this.mapHanaConceptsHierarchy(result),
      );

      const getAncestors = async (
        conceptIds: number[],
        depth: number,
        maxDepth: number,
      ) => {
        if (maxDepth < depth || conceptIds.length === 0) {
          return [];
        } else {
          // TODO: Move conceptIds as a sql parameter instead of being in the sql statement itself.
          // conceptIds has to be in sql statement now as trex-sql does not support array sql parameter types
          // https://github.com/alp-os/internal/issues/1411
          const sql = `
                    SELECT
                      ${depth} + 1 AS DEPTH,
                      ca.ancestor_concept_id AS ANCESTOR_CONCEPT_ID,
                      ca.descendant_concept_id AS DESCENDANT_CONCEPT_ID,
                      c.concept_id AS CONCEPT_ID,
                      c.concept_name AS CONCEPT_NAME,
                      c.vocabulary_id AS VOCABULARY_ID,
                      c.concept_class_id AS CONCEPT_CLASS_ID
                    FROM
                      ${this.vocabSchemaName}.concept_ancestor ca
                    JOIN 
                      ${
                        this.vocabSchemaName
                      }.concept c ON c.concept_id = ca.ancestor_concept_id
                    WHERE
                      ca.descendant_concept_id IN (${conceptIds.join(", ")}) AND
                      ca.min_levels_of_separation = 1
                    ORDER BY 
                      CONCEPT_ID, ANCESTOR_CONCEPT_ID, DESCENDANT_CONCEPT_ID;
                      `;
          const result = (await this.asyncExec(client, sql, [
            searchConceptId,
          ])) as IHanaConceptHierarchy[];
          conceptAncestors = conceptAncestors.concat(
            this.mapHanaConceptsHierarchy(result),
          );

          await getAncestors(
            this.mapHanaConceptsHierarchy(result).map((e) => e.concept_id),
            depth + 1,
            maxDepth,
          );
        }
      };

      await getAncestors(
        this.mapHanaConceptsHierarchy(result).map((e) => e.concept_id),
        0,
        maxDepth,
      );

      return conceptAncestors;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      await client.end();
    }
  }

  // Map IHanaConcept to IConcept type
  private mapHanaConcepts = (concepts: IHanaConcept[]): IConcept[] => {
    const mappedConcepts = concepts.map((concept) => {
      return {
        concept_id: parseInt(concept.CONCEPT_ID),
        concept_name: concept.CONCEPT_NAME,
        domain_id: concept.DOMAIN_ID,
        vocabulary_id: concept.VOCABULARY_ID,
        concept_class_id: concept.CONCEPT_CLASS_ID,
        standard_concept: concept.STANDARD_CONCEPT,
        concept_code: concept.CONCEPT_CODE,
        invalid_reason: concept.INVALID_REASON ?? "",
        valid_start_date: Date.parse(concept.VALID_START_DATE),
        valid_end_date: Date.parse(concept.VALID_END_DATE),
      };
    });
    return mappedConcepts;
  };

  // Map IHanaConceptRecommended to IConceptRecommended type
  private mapHanaConceptsRecommended = (
    conceptsRecommended: IHanaConceptRecommended[],
  ): IConceptRecommended[] => {
    const mappedConcepts = conceptsRecommended.map((conceptRecommended) => {
      return {
        concept_id_1: parseInt(conceptRecommended.CONCEPT_ID_1),
        concept_id_2: parseInt(conceptRecommended.CONCEPT_ID_2),
        relationship_id: conceptRecommended.RELATIONSHIP_ID,
      };
    });
    return mappedConcepts;
  };

  // Map IHanaConceptAncestor to IConceptAncestor type
  private mapHanaConceptsAncestor = (
    conceptsAncestor: IHanaConceptAncestor[],
  ): IConceptAncestor[] => {
    const mappedConcepts = conceptsAncestor.map((conceptAncestor) => {
      return {
        ancestor_concept_id: parseInt(conceptAncestor.ANCESTOR_CONCEPT_ID),
        descendant_concept_id: parseInt(conceptAncestor.DESCENDANT_CONCEPT_ID),
        min_levels_of_separation: parseInt(
          conceptAncestor.MIN_LEVELS_OF_SEPARATION,
        ),
        max_levels_of_separation: parseInt(
          conceptAncestor.MAX_LEVELS_OF_SEPARATION,
        ),
      };
    });
    return mappedConcepts;
  };

  // Map IHanaConceptRelationship to IConceptRelationship type
  private mapHanaConceptsRelationship = (
    conceptsRelationship: IHanaConceptRelationship[],
  ): IConceptRelationship[] => {
    const mappedConcepts = conceptsRelationship.map((conceptRelationship) => {
      return {
        concept_id_1: parseInt(conceptRelationship.CONCEPT_ID_1),
        concept_id_2: parseInt(conceptRelationship.CONCEPT_ID_2),
        relationship_id: conceptRelationship.RELATIONSHIP_ID,
        valid_start_date: Date.parse(conceptRelationship.VALID_START_DATE),
        valid_end_date: Date.parse(conceptRelationship.VALID_END_DATE),
        invalid_reason: conceptRelationship.INVALID_REASON,
      };
    });
    return mappedConcepts;
  };

  // Map IHanaConceptHierarchy to IConceptHierarchy type
  private mapHanaConceptsHierarchy = (
    conceptsHierarchy: IHanaConceptHierarchy[],
  ): IConceptHierarchy[] => {
    const mappedConcepts = conceptsHierarchy.map((conceptHierarchy) => {
      return {
        ancestor_concept_id: parseInt(conceptHierarchy.ANCESTOR_CONCEPT_ID),
        descendant_concept_id: parseInt(conceptHierarchy.DESCENDANT_CONCEPT_ID),
        depth: parseInt(conceptHierarchy.DEPTH),
        concept_id: parseInt(conceptHierarchy.CONCEPT_ID),
        concept_name: conceptHierarchy.CONCEPT_NAME,
        vocabulary_id: conceptHierarchy.VOCABULARY_ID,
        concept_class_: conceptHierarchy.CONCEPT_CLASS_,
      };
    });
    return mappedConcepts;
  };

  private lowercaseArrayObjectKeys = (objectArray: any[]) => {
    return objectArray.map((obj) => {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
      );
    });
  };

  private injectSessionVariablesToCredentials = (
    credentials: any,
    token: string,
  ) => {
    credentials["token"] = token;
    credentials["SESSIONVARIABLE:APPLICATION"] = `${env.PROJECT_NAME}-concepts`;
    credentials["SESSIONVARIABLE:APPLICATIONUSER"] =
      decode(token).email ?? decode(token).sub; // Fallback to sub from logto token if thirdparty token isnt present
  };

  private getHanaHDBConnection = () => {
    return new Promise((resolve, reject) => {
      try {
        // Get database credentials based on database code
        const { values: datasetDatabaseCredential } = env[
          "DATABASE_CREDENTIALS"
        ].find(
          (databaseCredential) =>
            databaseCredential.values.code === this.databaseCode,
        );

        const credentials = {
          host: datasetDatabaseCredential.host,
          port: datasetDatabaseCredential.port,
          databaseName: datasetDatabaseCredential.databaseName,
          validate_certificate:
            datasetDatabaseCredential.db_extra.validateCertificate,
          pooling: datasetDatabaseCredential.db_extra.pooling,
          autoCommit: datasetDatabaseCredential.db_extra.autoCommit,
          useTLS: datasetDatabaseCredential.db_extra.useTLS,
          hostname_in_certificate:
            datasetDatabaseCredential.db_extra.hostnameInCertificate,
          dialect: datasetDatabaseCredential.dialect,
          authentication_mode: datasetDatabaseCredential.authentication_mode,
        };

        if (credentials.authentication_mode === "JWT") {
          // Add token to credentials
          const thirdPartyToken = decode(this.jwt.replace(/bearer /i, ""))[
            "thirdPartyToken"
          ];
          if (thirdPartyToken) {
            this.injectSessionVariablesToCredentials(
              credentials,
              thirdPartyToken,
            );
          } else {
            throw new Error(
              "Intermediary IDP token doesnt exist for HANA JWT Authentication!",
            );
          }
        } else {
          // Add user and password to credentials
          credentials["user"] = datasetDatabaseCredential.credentials.readUser;
          credentials["password"] =
            datasetDatabaseCredential.credentials.readPassword;

          const token =
            decode(this.jwt.replace(/bearer /i, ""))["thirdPartyToken"] ??
            this.jwt.replace(/bearer /i, "");
          this.injectSessionVariablesToCredentials(credentials, token);
        }

        const client = hdb.createClient(credentials);
        client.on("error", (err: any) => {
          console.error("Network connection error", err);
        });
        client.connect(function (err: any) {
          if (err) {
            reject(err);
          } else {
            console.log(
              `After connection creation, DB connection state: ${client.readyState}`,
            );
            resolve(client);
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  };
}
