import {
    CohortType,
    CohortDefinitionTableType,
    QueryObjectType,
    ANALYTICS_DB_DIALECTS,
} from "../../types";
import { Logger, QueryObject as qo } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import QueryObject = qo.QueryObject;
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import { pipeline } from "node:stream/promises";
import { Transform, Writable } from "node:stream";
import { promisify } from "node:util";


const logger = CreateLogger("analytics-log");

export class CohortEndpoint {
    private constructor(
        public connection: ConnectionInterface,
        public schemaName: string,
        public dialect: string
    ) {}

    public static async createCohortEndpoint(
        connection: ConnectionInterface,
        schemaName: string,
        dialect: string,
        authMode: string
    ): Promise<CohortEndpoint> {
        let cohortResultsSchemaName;
        if (dialect === ANALYTICS_DB_DIALECTS.HANA && authMode === "JWT") {
            const checkCohortTablesExist =
                QueryObject.format(`SELECT TABLE_NAME FROM TABLES WHERE 
                                                    SCHEMA_NAME='${connection.cohortSchemaName}' AND 
                                                    TABLE_NAME IN ('COHORT','COHORT_DEFINITION');`);
            const tables = await checkCohortTablesExist.executeQuery(
                connection
            );

            if (
                !tables.data.some((table) => table["TABLE_NAME"] === "COHORT")
            ) {
                const createCohortQuery =
                    QueryObject.format(`CREATE TABLE "${connection.cohortSchemaName}".COHORT  (
                                            cohort_definition_id integer NOT NULL,
                                            subject_id integer NOT NULL,
                                            cohort_start_date date NOT NULL,
                                            cohort_end_date date NOT NULL );`);
                await createCohortQuery.executeUpdate(connection);
            }

            if (
                !tables.data.some(
                    (table) => table["TABLE_NAME"] === "COHORT_DEFINITION"
                )
            ) {
                const createCohortDefinitionQuery =
                    QueryObject.format(`CREATE TABLE "${connection.cohortSchemaName}".COHORT_DEFINITION (
                            cohort_definition_id                INTEGER            NOT NULL,
                            cohort_definition_name            VARCHAR(255)    NOT NULL,
                            cohort_definition_description        TEXT    NULL,
                            definition_type_concept_id        INTEGER            NOT NULL,
                            cohort_definition_syntax            TEXT    NULL,
                            subject_concept_id                INTEGER            NOT NULL,
                            cohort_initiation_date            DATE            NULL
                            );`);
                await createCohortDefinitionQuery.executeUpdate(connection);
            }

            // For hana if auth mode is JWT, override schemaName to use researcher schema instead of results schema.
            cohortResultsSchemaName = connection.cohortSchemaName;
        } else {
            cohortResultsSchemaName = schemaName;
        }

        return new CohortEndpoint(connection, cohortResultsSchemaName, dialect);
    }

    private createCohortQuery(
        selectQueryString: string,
        queryParams: Object
    ): [string, (string | number)[]] {
        let queryValues: (string | number)[] = [];

        for (const key in queryParams) {
            switch (key.toUpperCase()) {
                case "ID":
                    selectQueryString += `WHERE cd.COHORT_DEFINITION_ID = %s`;
                    queryValues.push(queryParams[key]);
                    break;
                case "DATE":
                    selectQueryString += `WHERE TO_DATE(cd.COHORT_INITIATION_DATE) = TO_DATE(%s)`;
                    queryValues.push(queryParams[key]);
                    break;
                case "SYNTAX":
                    // COHORT_DEFINITION_SYNTAX column type text, has to be converted to NVARCHAR.
                    const filterableKeys = [
                        "datasetId",
                        "bookmarkId",
                        "atlasCohortDefinitionId",
                    ];
                    let syntaxFilterSql = "";
                    const syntaxFilter =
                        "TO_NVARCHAR(cd.COHORT_DEFINITION_SYNTAX) LIKE %s";
                    for (const filterKey of filterableKeys) {
                        if (queryParams[key][filterKey]) {
                            if (syntaxFilterSql === "") {
                                // First occurence, add WHERE clause
                                syntaxFilterSql += `WHERE ${syntaxFilter}`;
                            } else {
                                // Else not first occurence, add AND operator
                                syntaxFilterSql += ` AND ${syntaxFilter}`;
                            }
                            queryValues.push(
                                `%${queryParams[key][filterKey]}%`
                            );
                        }
                    }
                    selectQueryString += syntaxFilterSql;
                    break;
                default:
                    break;
            }
        }

        return [selectQueryString, queryValues];
    }

    /**
     * Helper function to execute cohort queries
     * @param {QueryObject} query - queryobject
     * @param {boolean} [isWriteAction=false] - If isWriteAction is true, will execute sql query on both cache and source db. If not, will only execute sql query on cache
     */
    private async executeCohortQuery(
        query: any,
        isWriteAction: boolean = false
    ) {
        if (
            this.connection.constructor.name === "TrexConnection" &&
            this.dialect !== ANALYTICS_DB_DIALECTS.BIGQUERY // If bigquery, execute cohort queries on cache instead of sourcedb
        ) {
            if (isWriteAction) {
                // Additionally execute query on sourcedb
                // Clone and manipulate query to execute on srcdb so that original query is unaffected
                const queryClone = Object.create(Object.getPrototypeOf(query));
                Object.assign(queryClone, structuredClone(query));
                queryClone.queryString = queryClone.queryString.replaceAll(
                    this.schemaName,
                    `${this.connection.writeConn.__database}__srcdb.${this.schemaName}`
                );
                await queryClone.executeQueryOnWriteConnection(this.connection);
            }
            return await query.executeQueryOnWriteConnection(this.connection);
        } else {
            return await query.executeQuery(this.connection);
        }
    }

    private replaceSchemaAliasWithCohortSchema(sql: string) {
        sql = sql.replace(
            /\$\$SCHEMA\$\$.COHORT/g,
            `${this.schemaName}.COHORT`
        );
        sql = sql.replace(
            /\$\$SCHEMA\$\$.COHORT_DEFINITION/g,
            `${this.schemaName}.COHORT_DEFINITION`
        );

        return sql;
    }

    public async queryCohorts(
        queryParams: Object,
        offset?: number,
        limit?: number,
        excludePatientIds?: boolean
    ) {
        const baseQueryString = `
            SELECT 
                cd.COHORT_DEFINITION_ID AS "COHORT_DEFINITION_ID",
                cd.COHORT_DEFINITION_NAME AS "COHORT_DEFINITION_NAME",
                TO_NVARCHAR(cd.COHORT_DEFINITION_DESCRIPTION) AS "COHORT_DEFINITION_DESCRIPTION",
                cd.COHORT_INITIATION_DATE AS "COHORT_INITIATION_DATE",
                TO_NVARCHAR(cd.COHORT_DEFINITION_SYNTAX) AS "COHORT_DEFINITION_SYNTAX",
                COUNT(DISTINCT c.SUBJECT_ID) AS "count"
            FROM ${this.schemaName}.COHORT_DEFINITION cd
            LEFT JOIN ${this.schemaName}.COHORT c 
                ON cd.COHORT_DEFINITION_ID = c.COHORT_DEFINITION_ID
        `;

        let cohortArray = [];

        try {
            let [selectQueryString, queryParameters] = this.createCohortQuery(
                baseQueryString,
                queryParams
            );
            selectQueryString += `
            GROUP BY 
                cd.COHORT_DEFINITION_ID,
                cd.COHORT_DEFINITION_NAME,
                TO_NVARCHAR(cd.COHORT_DEFINITION_DESCRIPTION),
                cd.COHORT_INITIATION_DATE,
                TO_NVARCHAR(cd.COHORT_DEFINITION_SYNTAX)
                `;

            // Add limit and/or offset keyword if is it included
            if (limit) {
                queryParameters.push(limit);
                selectQueryString += ` LIMIT %l`;
                if (offset) {
                    queryParameters.push(offset);
                    selectQueryString += ` OFFSET %l`;
                }
            }

            const selectQuery = QueryObject.format(
                selectQueryString,
                ...queryParameters
            );

            const selectQueryResult = await this.executeCohortQuery(
                selectQuery
            );

            const processingCohort = async (
                cohortDefObj,
                excludePatientIds?: boolean
            ) => {
                //For each cohort definition, query cohort table for list of patient ids
                const patientIds = excludePatientIds
                    ? undefined
                    : await this.queryPatientIds(
                          cohortDefObj.COHORT_DEFINITION_ID
                      );
                return <CohortType>{
                    id: cohortDefObj.COHORT_DEFINITION_ID,
                    patientIds,
                    name: cohortDefObj.COHORT_DEFINITION_NAME,
                    description: cohortDefObj.COHORT_DEFINITION_DESCRIPTION,
                    creationTimestamp: cohortDefObj.COHORT_INITIATION_DATE,
                    syntax: cohortDefObj.COHORT_DEFINITION_SYNTAX,
                    patientCount: cohortDefObj.count,
                };
            };

            const processInBatch = async (
                items: any[],
                limit: number,
                fn: (item: any) => Promise<any>
            ) => {
                let results = [];
                for (let start = 0; start < items.length; start += limit) {
                    const end =
                        start + limit > items.length
                            ? items.length
                            : start + limit;
                    const slicedResults = await Promise.all(
                        items
                            .slice(start, end)
                            .map(
                                async (item) =>
                                    await processingCohort(
                                        item,
                                        excludePatientIds
                                    )
                            )
                    );
                    results = [...results, ...slicedResults];
                }
                return results;
            };

            cohortArray = await processInBatch(
                selectQueryResult.data,
                10,
                processingCohort
            );

            return cohortArray;
        } catch (err) {
            logger.error(`Failed to query cohort with data: ${queryParams}`);
            throw err;
        }
    }

    // Get count of cohort definitions
    public async queryCohortDefinitionCount(queryParams: Object) {
        let baseQueryString = `SELECT COUNT(*) as count FROM ${this.schemaName}.COHORT_DEFINITION cd
        `;

        try {
            const [selectQueryString, queryParameters] = this.createCohortQuery(
                baseQueryString,
                queryParams
            );
            const selectQuery = QueryObject.format(
                selectQueryString,
                ...queryParameters
            );

            const selectQueryResult = await this.executeCohortQuery(
                selectQuery
            );
            if (selectQueryResult.data[0]) {
                return selectQueryResult.data[0].COUNT;
            } else {
                return 0;
            }
        } catch (err) {
            logger.error(`Failed to query cohort definition counts`);
            throw err;
        }
    }

    // Get cohort definition via cohort definition id
    public async getCohortDefinition(cohortDefinitionId: string) {
        const queryString = `
        SELECT
            COHORT_DEFINITION_ID,
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID,
            COHORT_INITIATION_DATE
        FROM
            ${this.schemaName}.COHORT_DEFINITION
        WHERE
            COHORT_DEFINITION_ID = %s;
        `;

        try {
            const query = QueryObject.format(queryString, cohortDefinitionId);
            const result = await this.executeCohortQuery(query);
            return result;
        } catch (err) {
            logger.error(
                `Failed to get cohort definition with id: ${cohortDefinitionId}`
            );
            throw err;
        }
    }

    // Save cohort definition to db
    public async saveCohortDefinitionToDb(
        cohortDefinition: CohortDefinitionTableType
    ) {
        let queryString = `
        INSERT INTO ${this.schemaName}.COHORT_DEFINITION (
            COHORT_DEFINITION_ID,
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            COHORT_INITIATION_DATE,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID
            )
        VALUES (
            (SELECT COALESCE(MAX(COHORT_DEFINITION_ID),0)+1 FROM ${this.schemaName}.COHORT_DEFINITION),
            %s, %s, %s, %s, %s, %s
            )`;

        try {
            const query = QueryObject.format(
                queryString,
                cohortDefinition.name,
                cohortDefinition.description,
                cohortDefinition.creationTimestamp,
                cohortDefinition.definitionTypeConceptId,
                cohortDefinition.syntax,
                cohortDefinition.subjectConceptId
            );
            const result = await this.executeCohortQuery(query, true);
            return result;
        } catch (err) {
            logger.error(
                `Failed to insert cohort definition with data: ${cohortDefinition}`
            );
            throw err;
        }
    }

    // Update cohort definition to db
    public async updateCohortDefinitionToDb(
        cohortDefinition: CohortDefinitionTableType
    ) {
        const queryString = `
        UPDATE ${this.schemaName}.COHORT_DEFINITION SET (
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID
            )
        = (%s, %s, %s, %s, %s)
        WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(
                queryString,
                cohortDefinition.name,
                cohortDefinition.description,
                cohortDefinition.definitionTypeConceptId,
                cohortDefinition.syntax,
                cohortDefinition.subjectConceptId,
                cohortDefinition.id
            );
            const result = await this.executeCohortQuery(query, true);
            return result;
        } catch (err) {
            logger.error(
                `Failed to update cohort definition with data: ${cohortDefinition}`
            );
            throw err;
        }
    }

    // Rename cohort definition to db
    public async renameCohortDefinitionToDb(
        cohortDefinitionId: number,
        name: string
    ) {
        let queryString = `
        UPDATE ${this.schemaName}.COHORT_DEFINITION SET (
            COHORT_DEFINITION_NAME
            )
        = (%s)
        WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(
                queryString,
                name,
                cohortDefinitionId
            );
            await this.executeCohortQuery(query, true);
        } catch (err) {
            logger.error(
                `Failed to rename cohort definition with id: ${cohortDefinitionId}`
            );
            throw err;
        }
    }

    public async saveCohortToDb(
        cohortDefinitionId: number,
        cohort: CohortType,
        queryObject: QueryObjectType
    ) {
        try {
            const partialInsertQuery = QueryObject.formatDict(
                queryObject.queryString,
                { cohortDefinitionId }
            );
            const insertQuery = new QueryObject(
                this.replaceSchemaAliasWithCohortSchema(
                    partialInsertQuery.queryString
                ),
                [
                    ...queryObject.parameterPlaceholders,
                    ...partialInsertQuery.parameterPlaceholders,
                ]
            );
            const rowCount = await this.executeCohortQuery(insertQuery, true);
            return rowCount;
        } catch (err) {
            logger.error(
                `Failed to insert cohort with data: ${JSON.stringify(cohort)}`
            );
            // Cleanup previously inserted cohort definition and cohort rows
            await this.deleteCohortDefinitionFromDb(cohortDefinitionId);
            await this.deleteCohortFromDb(cohortDefinitionId);
            throw err;
        }
    }

    // Currently only for Hana
    // Create a readable stream from the source query and a writable stream to the target table, with transformation in between
    public async streamCohortToDb(
        cohortDefinitionId: number,
        cohort: CohortType,
        queryObject: QueryObjectType
    ) {
        try {
            const partialInsertQuery = QueryObject.formatDict(
                queryObject.queryString,
                { cohortDefinitionId }
            );
            const insertQuery = new QueryObject(
                this.replaceSchemaAliasWithCohortSchema(
                    partialInsertQuery.queryString
                ),
                [
                    ...queryObject.parameterPlaceholders,
                    ...partialInsertQuery.parameterPlaceholders,
                ]
            );

            // 1. Create a readable stream of Patient Ids from the source query
            const { data } = await insertQuery.executeStreamQuery<NodeJS.ReadableStream>(
                                    this.connection,
                                    this.schemaName
                                );
            
            // 2. Transform: Batching logic with backpressure support
            const insertCohortQueryInBatches = `INSERT INTO ${this.schemaName}.COHORT 
                                                    (COHORT_DEFINITION_ID, SUBJECT_ID, COHORT_START_DATE, COHORT_END_DATE) VALUES 
                                                    (${cohortDefinitionId}, ?, ?, ?)`;
            const bulkInsert = promisify(this.connection.executeBulkInsert.bind(this.connection));
            const batcher = new Transform({
            objectMode: true,
            async transform(row, encoding, callback) {
                this.batch = this.batch || [];
                // console.log(row.SUBJECT_ID)
                this.batch.push([row.SUBJECT_ID, row.COHORT_START_DATE, row.COHORT_END_DATE]);
        
                if (this.batch.length >= 10000) {
                    try {
                        await bulkInsert(
                            insertCohortQueryInBatches,
                            this.batch
                        );
                        //
                        this.batch = [];
                        callback();
                    } catch (err) {
                        callback(err);
                    }
                } else {
                    callback();
                }
            },
            async flush(callback) {
                // Insert remaining rows at the end of the stream
                if (this.batch && this.batch.length > 0) {
                    try {
                        await bulkInsert(
                            insertCohortQueryInBatches,
                            this.batch
                        );
                        callback();
                    } catch (err) {
                        callback(err);
                    }
                } else {
                    callback();
                }
            }
            });
        
            // 3. Execute the pipeline
            // pipeline handles error propagation and stream cleanup automatically
            await pipeline(data, batcher);
            
        } catch (err) {
            logger.error(
                `Failed to insert cohort with data: ${JSON.stringify(cohort)}`
            );
            // Cleanup previously inserted cohort definition and cohort rows
            await this.deleteCohortDefinitionFromDb(cohortDefinitionId);
            await this.deleteCohortFromDb(cohortDefinitionId);
            throw err;
        }
    }

    public async deleteCohortDefinitionFromDb(cohortId: number) {
        // Delete from cohort definition table
        let queryString = `DELETE FROM ${this.schemaName}.COHORT_DEFINITION WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(queryString, cohortId);
            const result = await this.executeCohortQuery(query, true);
            return result;
        } catch (err) {
            logger.error(`Failed to delete cohort with ID: ${cohortId}`);
            throw err;
        }
    }

    public async deleteCohortFromDb(cohortId: number) {
        // Delete from cohort table
        let queryString = `DELETE FROM ${this.schemaName}.COHORT WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(queryString, cohortId);
            const result = await this.executeCohortQuery(query, true);
            return result;
        } catch (err) {
            logger.error(`Failed to delete cohort with ID: ${cohortId}`);
            throw err;
        }
    }

    // Get patient list based on cohort definition ID
    async queryPatientIds(cohortDefinitionId: string): Promise<string[]> {
        let selectQueryString = `SELECT SUBJECT_ID FROM ${this.schemaName}.COHORT
        WHERE COHORT_DEFINITION_ID=%s
        `;
        try {
            const selectQuery = QueryObject.format(
                selectQueryString,
                cohortDefinitionId
            );

            const selectQueryResult = await this.executeCohortQuery(
                selectQuery
            );
            // Extract subject ids from array of objects
            let patientIds;
            if (selectQueryResult.data instanceof Array) {
                patientIds = selectQueryResult.data.map((obj) => {
                    if ("subject_id" in obj) {
                        return obj.subject_id;
                    } else if ("SUBJECT_ID" in obj) {
                        return obj.SUBJECT_ID;
                    }
                });
            }
            return patientIds;
        } catch (err) {
            logger.error(
                `Failed to query cohort definition id with id: ${cohortDefinitionId}`
            );
            throw err;
        }
    }

    // Get ID of cohort definition based on incoming cohort object
    public async queryCohortDefinitionId(
        cohortDefinition: CohortDefinitionTableType
    ): Promise<number> {
        let selectQueryString = `SELECT COHORT_DEFINITION_ID AS "COHORT_DEFINITION_ID" FROM ${this.schemaName}.COHORT_DEFINITION 
        WHERE COHORT_DEFINITION_NAME=%s AND 
        TO_DATE(COHORT_INITIATION_DATE)=TO_DATE(%s) AND 
        TO_NVARCHAR(COHORT_DEFINITION_SYNTAX)=%s
        `;
        const sqlParams = [
            cohortDefinition.name,
            cohortDefinition.creationTimestamp,
            cohortDefinition.syntax,
        ];

        // Add description clause only if description is not null
        if (cohortDefinition.description !== null) {
            selectQueryString +=
                " AND TO_NVARCHAR(COHORT_DEFINITION_DESCRIPTION)=%s";
            sqlParams.push(cohortDefinition.description);
        }

        try {
            const selectQuery = QueryObject.format(
                selectQueryString,
                ...sqlParams
            );
            const selectQueryResult = await this.executeCohortQuery(
                selectQuery
            );
            let cohortDefinitionId =
                selectQueryResult.data[0].COHORT_DEFINITION_ID;

            return cohortDefinitionId;
        } catch (err) {
            logger.error(
                `Failed to query cohort definition id with data: ${cohortDefinition}`
            );
            throw err;
        }
    }

    public async checkIfSchemaCanMaterializeCohort(): Promise<boolean> {
        // Checks if the schema has the required tables to materialize cohorts
        // To successfully materialize cohort, schema must have the following tables
        // 1. cohort
        // 2. cohort_definition

        let sql, sqlParams;
        if (this.connection.constructor.name === "TrexConnection") {
            sql = `
                    select
                        count(1) AS COUNT_TABLES
                    from
                        information_schema.tables
                    where
                        table_catalog = %s
                        and table_schema = %s
                        and table_name in ('cohort', 'cohort_definition');
                    `;
            sqlParams = [
                this.connection.connection.__database, // Check against cache file instead of source db
                this.schemaName,
            ];
        } else {
            sql = `
                    SELECT
                        COUNT(1) AS COUNT_TABLES
                    FROM
                        SYS.TABLES
                    WHERE
                        SCHEMA_NAME = %s
                        AND TABLE_NAME IN ('COHORT', 'COHORT_DEFINITION');
                    `;
            sqlParams = [this.schemaName];
        }
        try {
            const query = QueryObject.format(sql, ...sqlParams);
            const result = await this.executeCohortQuery(query);
            if (result.data[0]) {
                // Result must be 2 for function to return true, meaning that both cohort and cohort definition tables exist
                return result.data[0].COUNT_TABLES === 2;
            } else {
                return false;
            }
        } catch (err) {
            logger.error(`Failed to check if schema can materialize cohort`);
            throw err;
        }
    }
}
