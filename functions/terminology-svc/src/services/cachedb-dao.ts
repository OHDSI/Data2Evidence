// @ts-types="npm:@types/pg"
import pg from "pg";
import { pipeline } from "transformers";

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
      const [duckdbFtsBaseQuery, duckdbFtsBaseQueryParams] =
        this.getDuckdbFtsBaseQuery(searchText, filters);
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
        : `AND invalid_reason = '' `;

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

    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const facetPromises = Object.values(facetColumns).map(
        (column: string) => {
          const [duckdbFtsBaseQuery, duckdbFtsBaseQueryParams] =
            this.getDuckdbFtsBaseQuery(searchText, filters, [column]);
          let facetSql;
          if (column === "valid_end_date") {
            facetSql = getValidityFacetSql(column);
          } else {
            facetSql = getFacetSql(column);
          }
          const sql = `
            ${duckdbFtsBaseQuery}
            ${facetSql}
          `;
          const sqlParams = duckdbFtsBaseQueryParams;
          return client.query(sql, sqlParams);
        }
      );

      const results = await Promise.all(facetPromises).then(function (
        data: { rows: string[] }[]
      ) {
        return data.map((result) => {
          return result.rows;
        });
      });

      // Map data to match existing concept.service logic which works with meilisearch search results
      const filterOptions = Object.entries(facetColumns).reduce<{
        [index: string]: any;
      }>(
        (
          accumulator1: { [index: string]: { [index: string]: number } },
          [facetKey, facetColumn],
          index: number
        ) => {
          const result = results[index];
          const fields = [facetColumn, "count"];

          accumulator1[facetKey] = result.reduce(
            (
              accumulator2: { [index: string]: number },
              { [fields[0]]: facetColumn, [fields[1]]: count }: any
            ) => {
              accumulator2[facetColumn] = Number(count);
              return accumulator2;
            },
            {}
          );
          return accumulator1;
        },
        {}
      );
      // concept is a derived value, not from duckdb fts index search
      filterOptions["concept"] = (() => {
        const standardConcepts = filterOptions["standardConcept"];
        const standardConceptsCount = standardConcepts["S"] || 0;

        const totalConceptsCount = Object.values(standardConcepts).reduce(
          (accumulator: number, value) => accumulator + Number(value),
          0
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

  private getGTEEmbedding = async (searchText: string): Promise<number[]> => {
    const pipe = await pipeline("feature-extraction", "Supabase/gte-small");
    const output = await pipe(searchText, {
      pooling: "mean",
      normalize: true,
    });
    const embedding = Array.from(output.data) as number[];
    console.log("GTEembedding", embedding);
    return embedding;
  };

  private embeddingCache: Map<string, any> = new Map();
  // To solve the async of getGTEEmbedding
  async precomputeEmbedding(searchText: string): Promise<void> {
    if (!this.embeddingCache.has(searchText)) {
      const embedding = await this.getGTEEmbedding(searchText);
      this.embeddingCache.set(searchText, embedding);
    }
  }

  private getDuckdbFtsBaseQuery = (
    searchText: string,
    filters: Filters,
    columns: string[] = []
  ): [string, any[]] => {
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
      const duckdbFtsWhereClause = filterWhereClause
        ? `${filterWhereClause} AND score is not null`
        : "WHERE score is not null ";
      let textEmbedding = this.embeddingCache.get(searchText);
      return [
        `
      with cal_score as (
        select 
          ${columnsToSelect},
          ${this.vocabSchemaName}.fts_main_concept.match_bm25(concept_id, ?) as fts_score,
          array_cosine_distance(concept_name_embedding, ?::FLOAT[384]) as embd_score
        from
          ${this.vocabSchemaName}.concept
          ${duckdbFtsWhereClause} 
        ),
      fts as (
        select 
          cal_score.${columnsToSelect},
          (${this.semanticRatio} * (embd_score + 1) / (select max(embd_score)+1 from cal_score) + (1-${this.semanticRatio}) * fts_score / (select max(fts_score) from cal_score)) as hybrid_score
        from 
            cal_score
        order by hybrid_score desc
      )
      `,
        [searchText, textEmbedding],
      ];
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
