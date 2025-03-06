import {
    CohortType,
    CohortDefinitionTableType,
    QueryObjectType,
} from "../../types";
import { Logger, QueryObject as qo } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import QueryObject = qo.QueryObject;
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;

const logger = CreateLogger("analytics-log");

export class CohortEndpoint {
    constructor(
        public connection: ConnectionInterface,
        public schemaName: string
    ) {}

    private getInsertSyntaxQuery(): string {
        return `JOIN
        (SELECT DISTINCT * FROM 
        (SELECT TO_NVARCHAR(COHORT_DEFINITION_SYNTAX) AS syntax FROM $$SCHEMA$$.COHORT_DEFINITION cd) as cd_syntax
        WHERE syntax LIKE %s AND syntax LIKE %s) as cdd
        ON syntax=TO_NVARCHAR(COHORT_DEFINITION_SYNTAX)`;
    }

    private createCohortQuery(
        selectQueryString: string,
        queryParams: Object,
        offset?: number,
        limit?: number
    ) {
        let queryValues = [];

        for (const key in queryParams) {
            switch (key.toUpperCase()) {
                case "ID":
                    selectQueryString += `WHERE COHORT_DEFINITION_ID = %s`;
                    queryValues.push(queryParams[key]);
                    break;
                case "DATE":
                    selectQueryString += `WHERE TO_DATE(COHORT_INITIATION_DATE) = TO_DATE(%s)`;
                    queryValues.push(queryParams[key]);
                    break;
                case "SYNTAX":
                    // query by bookmark id
                    // COHORT_DEFINITION_SYNTAX column type text, has to be converted to NVARCHAR.
                    selectQueryString += this.getInsertSyntaxQuery();
                    queryValues.push(`%${queryParams[key].datasetId}%`);
                    queryValues.push(`%${queryParams[key].bookmarkId}%`);
                    break;
                default:
                    break;
            }
        }

        // Add limit and/or offset keyword if is it included
        if (limit) {
            queryValues.push(limit);
            selectQueryString += `LIMIT %l`;
            if (offset) {
                queryValues.push(offset);
                selectQueryString += `OFFSET %l`;
            }
        }

        return QueryObject.format(selectQueryString, ...queryValues);
    }

    public async queryCohorts(
        queryParams: Object,
        offset?: number,
        limit?: number
    ) {
        let selectQueryString = `SELECT 
        COHORT_DEFINITION_ID AS "COHORT_DEFINITION_ID",
        COHORT_DEFINITION_NAME AS "COHORT_DEFINITION_NAME",
        TO_VARCHAR(COHORT_DEFINITION_DESCRIPTION) AS "COHORT_DEFINITION_DESCRIPTION",
        COHORT_INITIATION_DATE AS "COHORT_INITIATION_DATE",
        TO_NVARCHAR(COHORT_DEFINITION_SYNTAX) AS "COHORT_DEFINITION_SYNTAX"
        FROM $$SCHEMA$$.COHORT_DEFINITION
        `;

        let cohortArray = [];

        try {
            const selectQuery = this.createCohortQuery(
                selectQueryString,
                queryParams,
                offset,
                limit
            );

            let selectQueryResult = await selectQuery.executeQuery(
                this.connection
            );

            const processingCohort = async (cohortObj) => {
            //For each cohort definition, query cohort table for list of patient ids
                let patientIds = await this.queryPatientIds(
                    cohortObj.COHORT_DEFINITION_ID
                );
                return <CohortType>{
                    id: cohortObj.COHORT_DEFINITION_ID,
                    patientIds,
                    name: cohortObj.COHORT_DEFINITION_NAME,
                    description: cohortObj.COHORT_DEFINITION_DESCRIPTION,
                    creationTimestamp: cohortObj.COHORT_INITIATION_DATE,
                    syntax: cohortObj.COHORT_DEFINITION_SYNTAX,
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
                            .map(async (item) => await processingCohort(item))
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
        let selectQueryString = `SELECT COUNT(*) as count FROM $$SCHEMA$$.COHORT_DEFINITION
        `;

        try {
            const selectQuery = this.createCohortQuery(
                selectQueryString,
                queryParams
            );

            let selectQueryResult = await selectQuery.executeQuery(
                this.connection
            );
            return selectQueryResult.data[0].COUNT;
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
            $$SCHEMA$$.COHORT_DEFINITION
        WHERE
            COHORT_DEFINITION_ID = %s;
        `;

        try {
            const query = QueryObject.format(queryString, cohortDefinitionId);
            const result = await query.executeQuery(this.connection);
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
        INSERT INTO $$SCHEMA$$.COHORT_DEFINITION (
            COHORT_DEFINITION_ID,
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            COHORT_INITIATION_DATE,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID
            )
        VALUES (
            (SELECT COALESCE(MAX(COHORT_DEFINITION_ID),0)+1 FROM $$SCHEMA$$.COHORT_DEFINITION),
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
            let result = await query.executeQuery(this.connection);
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
        UPDATE $$SCHEMA$$.COHORT_DEFINITION SET (
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            COHORT_INITIATION_DATE,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID
            )
        = (%s, %s, %s, %s, %s, %s)
        WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(
                queryString,
                cohortDefinition.name,
                cohortDefinition.description,
                cohortDefinition.creationTimestamp,
                cohortDefinition.definitionTypeConceptId,
                cohortDefinition.syntax,
                cohortDefinition.subjectConceptId,
                cohortDefinition.id
            );
            const result = await query.executeQuery(this.connection);
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
        UPDATE $$SCHEMA$$.COHORT_DEFINITION SET (
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
            await query.executeQuery(this.connection);
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
                partialInsertQuery.queryString,
                [
                    ...queryObject.parameterPlaceholders,
                    ...partialInsertQuery.parameterPlaceholders,
                ]
            );
            const rowCount = await insertQuery.executeQuery(this.connection);
            return rowCount;
        } catch (err) {
            logger.error(`Failed to insert cohort with data: ${cohort}`);
            // Cleanup previously inserted cohort definition and cohort rows
            await this.deleteCohortDefinitionFromDb(cohortDefinitionId);
            await this.deleteCohortFromDb(cohortDefinitionId);
            throw err;
        }
    }

    public async deleteCohortDefinitionFromDb(cohortId: number) {
        // Delete from cohort definition table
        let queryString = `DELETE FROM $$SCHEMA$$.COHORT_DEFINITION WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(queryString, cohortId);
            let result = await query.executeQuery(this.connection);
            return result;
        } catch (err) {
            logger.error(`Failed to delete cohort with ID: ${cohortId}`);
            throw err;
        }
    }

    public async deleteCohortFromDb(cohortId: number) {
        // Delete from cohort table
        let queryString = `DELETE FROM $$SCHEMA$$.COHORT WHERE COHORT_DEFINITION_ID = %s`;

        try {
            const query = QueryObject.format(queryString, cohortId);
            let result = await query.executeQuery(this.connection);
            return result;
        } catch (err) {
            logger.error(`Failed to delete cohort with ID: ${cohortId}`);
            throw err;
        }
    }

    // Get patient list based on cohort definition ID
    async queryPatientIds(cohortDefinitionId: string): Promise<string[]> {
        let selectQueryString = `SELECT SUBJECT_ID FROM $$SCHEMA$$.COHORT
        WHERE COHORT_DEFINITION_ID=%s
        `;
        try {
            const selectQuery = QueryObject.format(
                selectQueryString,
                cohortDefinitionId
            );
            let selectQueryResult = await selectQuery.executeQuery(
                this.connection
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
        let selectQueryString = `SELECT COHORT_DEFINITION_ID AS "COHORT_DEFINITION_ID" FROM $$SCHEMA$$.COHORT_DEFINITION 
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
                " AND TO_VARCHAR(COHORT_DEFINITION_DESCRIPTION)=%s";
            sqlParams.push(cohortDefinition.description);
        }

        try {
            const selectQuery = QueryObject.format(
                selectQueryString,
                ...sqlParams
            );
            let selectQueryResult = await selectQuery.executeQuery(
                this.connection
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
}
