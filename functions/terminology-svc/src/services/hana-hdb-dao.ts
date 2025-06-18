import * as hdb from "hdb";
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

export class HanaHDBDao {
  private readonly jwt: string;
  private readonly vocabSchemaName: string;
  private readonly databaseCode: string;

  constructor(jwt: string, vocabSchemaName: string, databaseCode: string) {
    this.jwt = jwt;
    this.vocabSchemaName = vocabSchemaName;
    this.databaseCode = databaseCode;
    if (!jwt) {
      throw new Error("No token passed for CachedbHanaDAO!");
    }
  }

  private asyncExec(
    client: any,
    sql: string,
    params: (string | number)[] = []
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

  async getConcepts(
    pageNumber = 0,
    rowsPerPage: number,
    searchText = "",
    filters: Filters
  ) {
    const client = await this.getHanaHDBConnection();
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
      // searchTexts has to be in sql statement now as cachedb does not support array sql parameter types
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
        }
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
    conceptColumnName: "concept_name" | "concept_id" | "concept_code"
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
    searchConceptIds: number[]
  ): Promise<IConceptRecommended[]> {
    const client = await this.getHanaHDBConnection();
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
      const result = (await this.asyncExec(
        client,
        sql
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
    searchConceptIds: number[]
  ): Promise<IConceptAncestor[]> {
    const client = await this.getHanaHDBConnection();
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
      const result = (await this.asyncExec(
        client,
        sql
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
    conceptRelationshipType: "Maps to"
  ): Promise<IConceptRelationship[]> {
    const client = await this.getHanaHDBConnection();
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
    searchConceptId: number
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
    maxDepth: number
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
        this.mapHanaConceptsHierarchy(result)
      );

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
            this.mapHanaConceptsHierarchy(result)
          );

          await getAncestors(
            this.mapHanaConceptsHierarchy(result).map((e) => e.concept_id),
            depth + 1,
            maxDepth
          );
        }
      };

      await getAncestors(
        this.mapHanaConceptsHierarchy(result).map((e) => e.concept_id),
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

  // Map IHanaConceptHierarchy to IConceptHierarchy type
  private mapHanaConceptsHierarchy = (
    conceptsHierarchy: IHanaConceptHierarchy[]
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
        Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])
      );
    });
  };

  private getHanaHDBConnection = () => {
    return new Promise((resolve, reject) => {
      try {
        // Get database credentials based on database code
        const { values: datasetDatabaseCredential } = env[
          "DATABASE_CREDENTIALS"
        ].find(
          (databaseCredential) =>
            databaseCredential.values.code === this.databaseCode
        );

        const credentials = {
          host: datasetDatabaseCredential.host,
          port: datasetDatabaseCredential.port,
          databaseName: datasetDatabaseCredential.databaseName,
          validate_certificate: datasetDatabaseCredential.db_extra.validateCertificate,
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
          if (this.jwt) {
            const thirdPartyToken = decode(this.jwt.replace(/bearer /i, ""))[
              "thirdPartyToken"
            ];

            credentials["token"] = thirdPartyToken;
            credentials['SESSIONVARIABLE:APPLICATION'] = `${env.PROJECT_NAME}-concepts`;
            credentials['SESSIONVARIABLE:APPLICATIONUSER'] = decode(thirdPartyToken).oid;
          } else {
            throw new Error(
              "Intermediary IDP token doesnt exist for HANA JWT Authentication!"
            );
          }
        } else {
          // Add user and password to credentials
          credentials["user"] = datasetDatabaseCredential.credentials.readUser;
          credentials["password"] =
            datasetDatabaseCredential.credentials.readPassword;
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
              `After connection creation, DB connection state: ${client.readyState}`
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
