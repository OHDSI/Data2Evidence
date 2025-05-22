// @ts-types="npm:@types/pg"
import pg from "pg";
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
  DatasetDialects,
  IConceptHierarchy,
} from "../types.ts";
import { env } from "../env.ts";

export class CachedbHanaDAO {
  private readonly jwt: string;
  private readonly datasetId: string;
  private readonly vocabSchemaName: string;

  constructor(jwt: string, datasetId: string, vocabSchemaName: string) {
    this.jwt = jwt;
    this.datasetId = datasetId;
    this.vocabSchemaName = vocabSchemaName;
    if (!jwt) {
      throw new Error("No token passed for CachedbHanaDAO!");
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
      const [hanaFtsBaseQuery, hanaFtsBaseQueryParams] =
        this.getHanaFtsBaseQuery(searchText, filters);
      const conceptsSql = `
      ${hanaFtsBaseQuery}
      select *
          from fts
          limit ? OFFSET ?;
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
        client.query<IHanaConcept>(conceptsSql, conceptsSqlParams),
        client.query<{ COUNT: string }>(countSql, countSqlParams),
      ] as const;
      const results = await Promise.all(sqlPromises);
      const data = {
        hits: this.mapHanaConcepts(results[0].rows),
        totalHits: results[1] ? parseInt(results[1].rows[0].COUNT) : 0,
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
  ): Promise<IDuckdbConcept | null> {
    if (searchTexts.length === 0) {
      return {
        hits: [],
        totalHits: 0,
      };
    }

    const client = this.getCachedbConnection(this.jwt, this.datasetId);
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
      // searchTexts has to be in sql statement now as cachedb does not support array sql parameter types
      // https://github.com/alp-os/internal/issues/1411
      const result = await client.query<IHanaConcept>(sql);
      if (result) {
        const data = {
          hits: this.mapHanaConcepts(result.rows),
          totalHits: result.rowCount ?? 0,
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
          return client.query(sql, sqlParams);
        }
      );

      const results = await Promise.all(facetPromises).then(
        (data: { rows: string[] }[]) => {
          return data.map((result) => {
            return this.lowercaseArrayObjectKeys(result.rows);
          });
        }
      );

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

  private getHanaFtsBaseQuery = (
    searchText: string,
    filters: Filters,
    columns: string[] = []
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
      return [
        `
      with fts as (
        select
          ${columnsToSelect},
          SCORE() as score
        from
          ${this.vocabSchemaName}.concept
          WHERE CONTAINS (*, (?), FUZZY(${env.HANA_FTS_FUZZY}))
          ${filterWhereClause.replace("WHERE", "AND")}
          order by score desc
        )
      `,
        // Surround searchText with asteriks for greedy search
        [`*${searchText}*`],
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

  async getConceptRelationships(conceptId: number): Promise<any> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
      select *
          from ${this.vocabSchemaName}.concept_relationship
          WHERE concept_id_1=$1
          `;
      const result = await client.query(sql, [conceptId]);

      const data = {
        hits: this.lowercaseArrayObjectKeys(result.rows),
        totalHits: result.rowCount,
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

    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
      select *
          from ${this.vocabSchemaName}.relationship
          WHERE relationship_id IN (${relationshipIds
            .map((rid) => `'${rid}'`)
            .join(", ")})
          `;
      const result = await client.query(sql, [relationshipIds]);
      const data = {
        hits: this.lowercaseArrayObjectKeys(result.rows),
        totalHits: result.rowCount,
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
    conceptColumnName: "concept_name" | "concept_id" | "concept_code"
  ): Promise<any> {
    const client = this.getCachedbConnection(this.jwt, this.datasetId);
    try {
      const sql = `
        select concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason from ${this.vocabSchemaName}.concept WHERE ${conceptColumnName}=? AND standard_concept='S';
            `;
      const result = await client.query(sql, [conceptName]);
      return this.lowercaseArrayObjectKeys(result.rows) ?? [];
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
      const result = await client.query<IHanaConceptRecommended>(sql);
      return this.mapHanaConceptsRecommended(result.rows) ?? [];
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
      const result = await client.query<IHanaConceptAncestor>(sql);
      return this.mapHanaConceptsAncestor(result.rows) ?? [];
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
      const result = await client.query<IHanaConceptRelationship>(sql, [
        conceptRelationshipType,
      ]);
      return this.mapHanaConceptsRelationship(result.rows);
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
    let conceptAncestors: IConceptHierarchy[] = [];

    try {
      // Recursively get concept ancesters for concept hierarchy
      // Get self
      const sql = `
                    SELECT
                      0 AS depth,
                      ca.ancestor_concept_id,
                      ca.descendant_concept_id,
                      c.concept_id,
                      c.concept_name,
                      c.vocabulary_id,
                      c.concept_class_id
                    FROM
                    ${this.vocabSchemaName}.concept_ancestor ca
                    JOIN 
                      ${this.vocabSchemaName}.concept c ON c.concept_id = ca.ancestor_concept_id
                    WHERE
                      ca.descendant_concept_id = ?
                      AND ca.min_levels_of_separation = 0
                    ORDER BY 
                      concept_id, ancestor_concept_id, descendant_concept_id;
                    `;
      const result = await client.query<IConceptHierarchy>(sql, [
        searchConceptId,
      ]);
      conceptAncestors = conceptAncestors.concat(result.rows);

      const getAncestors = async (
        conceptIds: number[],
        depth: number,
        maxDepth: number
      ) => {
        if (maxDepth < depth || conceptIds.length === 0) {
          return [];
        } else {
          // TODO: Move conceptIds as a sql parameter instead of being in the sql statement itself.
          // conceptIds has to be in sql statement now as cachedb does not support array sql parameter types
          // https://github.com/alp-os/internal/issues/1411
          const sql = `
                    SELECT
                      ${depth} + 1 AS depth,
                      ca.ancestor_concept_id,
                      ca.descendant_concept_id,
                      c.concept_id,
                      c.concept_name,
                      c.vocabulary_id,
                      c.concept_class_id
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
                      concept_id, ancestor_concept_id, descendant_concept_id;
                      `;
          const result = await client.query<IConceptHierarchy>(sql);
          conceptAncestors = conceptAncestors.concat(result.rows);

          await getAncestors(
            result.rows.map((e) => e.concept_id),
            depth + 1,
            maxDepth
          );
        }
      };

      await getAncestors(
        result.rows.map((e) => e.concept_id),
        0,
        maxDepth
      );

      return conceptAncestors;
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
        database: `A|${DatasetDialects.HANA}|read|${datasetId}`,
        connectionTimeoutMillis: 30000,
      });
      client.connect();
      return client;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

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
    conceptsRecommended: IHanaConceptRecommended[]
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
    conceptsAncestor: IHanaConceptAncestor[]
  ): IConceptAncestor[] => {
    const mappedConcepts = conceptsAncestor.map((conceptAncestor) => {
      return {
        ancestor_concept_id: parseInt(conceptAncestor.ANCESTOR_CONCEPT_ID),
        descendant_concept_id: parseInt(conceptAncestor.DESCENDANT_CONCEPT_ID),
        min_levels_of_separation: parseInt(
          conceptAncestor.MIN_LEVELS_OF_SEPARATION
        ),
        max_levels_of_separation: parseInt(
          conceptAncestor.MAX_LEVELS_OF_SEPARATION
        ),
      };
    });
    return mappedConcepts;
  };

  // Map IHanaConceptRelationship to IConceptRelationship type
  private mapHanaConceptsRelationship = (
    conceptsRelationship: IHanaConceptRelationship[]
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

  private lowercaseArrayObjectKeys = (objectArray: any[]) => {
    return objectArray.map((obj) => {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])
      );
    });
  };
}
