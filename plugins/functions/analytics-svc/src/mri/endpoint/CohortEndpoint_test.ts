import * as assert from "@std/assert";
import { QueryObject as qo } from "@alp/alp-base-utils";
import { CohortEndpoint } from "./CohortEndpoint.ts";
import type { CohortDefinitionTableType } from "../../types.ts";

type FormattedQuery = {
    queryString?: string;
    parameterPlaceholders?: { key: string; value: unknown; type: string }[];
};

const QueryObject = qo.QueryObject;
const SCHEMA = "CDM_RESULTS";

// The creationTimestamp is an old date. The update must not use it.
const cohortDefinition: CohortDefinitionTableType = {
    id: 42,
    name: "My cohort",
    description: "A description",
    creationTimestamp: "2000-01-01",
    definitionTypeConceptId: "0",
    subjectConceptId: 0,
    syntax: '{"datasetId":"dataset-1","bookmarkId":"bmk-1"}',
};

const today = () => new Date().toISOString().split("T")[0];

// The UPDATE statement without COHORT_INITIATION_DATE.
const updateQueryStringWithoutDate = `
        UPDATE ${SCHEMA}.COHORT_DEFINITION SET (
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID
            )
        = (%s, %s, %s, %s, %s)
        WHERE COHORT_DEFINITION_ID = %s`;

// QueryObject.format gives each parameter a random GUID key.
// Replace each key with its position so that the test can compare queries.
const normalize = (query: FormattedQuery) => {
    let queryString = query.queryString ?? "";
    const parameters = (query.parameterPlaceholders ?? []).map(
        (p, index) => {
            queryString = queryString.replace(p.key, `{p${index}}`);
            return { value: p.value, type: p.type };
        }
    );
    return { queryString, parameters };
};

// An endpoint without a database connection. The stub records each query.
const createEndpoint = () => {
    const executed: { query: FormattedQuery; isWriteAction: boolean }[] = [];
    // deno-lint-ignore no-explicit-any
    const endpoint = new (CohortEndpoint as any)(
        {},
        SCHEMA,
        "postgresql",
        "db-code",
        "dataset-type"
    );
    // deno-lint-ignore require-await
    endpoint.executeCohortQuery = async (
        query: FormattedQuery,
        isWriteAction = false
    ) => {
        executed.push({ query, isWriteAction });
        return {};
    };
    return { endpoint: endpoint as CohortEndpoint, executed };
};

Deno.test("updateCohortDefinitionToDb without updateInitiationDate does not set COHORT_INITIATION_DATE", async () => {
    const { endpoint, executed } = createEndpoint();

    await endpoint.updateCohortDefinitionToDb(cohortDefinition);

    assert.assertEquals(executed.length, 1);
    assert.assertEquals(executed[0].isWriteAction, true);
    const actual = normalize(executed[0].query);
    assert.assertFalse(actual.queryString.includes("COHORT_INITIATION_DATE"));
    const expected = normalize(
        QueryObject.format(
            updateQueryStringWithoutDate,
            cohortDefinition.name,
            cohortDefinition.description,
            cohortDefinition.definitionTypeConceptId,
            cohortDefinition.syntax,
            cohortDefinition.subjectConceptId,
            cohortDefinition.id
        )
    );
    assert.assertEquals(actual, expected);
});

Deno.test("updateCohortDefinitionToDb with updateInitiationDate false does not set COHORT_INITIATION_DATE", async () => {
    const withoutArgument = createEndpoint();
    const withFalse = createEndpoint();

    await withoutArgument.endpoint.updateCohortDefinitionToDb(cohortDefinition);
    await withFalse.endpoint.updateCohortDefinitionToDb(cohortDefinition, false);

    assert.assertEquals(
        normalize(withFalse.executed[0].query),
        normalize(withoutArgument.executed[0].query)
    );
});

Deno.test("updateCohortDefinitionToDb with updateInitiationDate sets COHORT_INITIATION_DATE to the current date", async () => {
    const { endpoint, executed } = createEndpoint();

    const before = today();
    await endpoint.updateCohortDefinitionToDb(cohortDefinition, true);
    const after = today();

    assert.assertEquals(executed.length, 1);
    assert.assertEquals(executed[0].isWriteAction, true);
    const actual = normalize(executed[0].query);
    assert.assertEquals(
        actual.queryString,
        `
        UPDATE ${SCHEMA}.COHORT_DEFINITION SET (
            COHORT_DEFINITION_NAME,
            COHORT_DEFINITION_DESCRIPTION,
            DEFINITION_TYPE_CONCEPT_ID,
            COHORT_DEFINITION_SYNTAX,
            SUBJECT_CONCEPT_ID,
            COHORT_INITIATION_DATE
            )
        = ({p0}, {p1}, {p2}, {p3}, {p4}, {p5})
        WHERE COHORT_DEFINITION_ID = {p6}`
    );

    // The date can change between "before" and "after" at midnight UTC.
    // Then the test accepts either date.
    const date = actual.parameters[5].value;
    assert.assert(
        date === before || date === after,
        `expected ${before} or ${after}, got ${date}`
    );
    assert.assertNotEquals(date, cohortDefinition.creationTimestamp);

    // The date uses the same "text" type as the INSERT in saveCohortDefinitionToDb.
    assert.assertEquals(actual.parameters, [
        { value: cohortDefinition.name, type: "text" },
        { value: cohortDefinition.description, type: "text" },
        { value: cohortDefinition.definitionTypeConceptId, type: "text" },
        { value: cohortDefinition.syntax, type: "text" },
        { value: cohortDefinition.subjectConceptId, type: "text" },
        { value: date, type: "text" },
        { value: cohortDefinition.id, type: "text" },
    ]);
});
