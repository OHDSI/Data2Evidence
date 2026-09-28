import { DomainValuesSvc } from "../../src/svc/DomainValuesSvc";

describe("DomainValuesSvc empty-search handling", () => {
    const baseConfig = { chartOptions: { minCohortSize: 0 } };

    const cohortConfig = {
        ...baseConfig,
        patient: {
            interactions: {
                cohort: {
                    attributes: {
                        cohortdefinitionid: {
                            name: [{ lang: "", value: "Cohort Definition" }],
                            type: "text",
                            expression: "@COHORT.cohort_definition_id",
                            referenceExpression: "@RESULT_COHORT_DEF.COHORT_DEFINITION_ID",
                            referenceFilter: "CONTAINS (@RESULT_COHORT_DEF.cohort_definition_name, '%@SEARCH_QUERY%', FUZZY (0.5))",
                            order: 0,
                            useRefValue: true,
                            useRefText: true,
                        },
                    },
                },
            },
        },
    };

    it("removes the entire WHERE clause for a lone CONTAINS empty-search predicate", async () => {
        const svc = new DomainValuesSvc(
            cohortConfig,
            "patient.interactions.cohort.attributes.cohortdefinitionid",
            100,
            ""
        );
        const result = await svc.generateQuery();

        expect(result.queryString).not.toContain("__EMPTY_SEARCH__");
        expect(result.queryString.toUpperCase()).not.toContain(" WHERE ");
        expect(result.queryString).toContain("FROM");
        expect(result.queryString).toContain("ORDER BY");
    });

    it("keeps a non-empty CONTAINS predicate in the generated SQL", async () => {
        const svc = new DomainValuesSvc(
            cohortConfig,
            "patient.interactions.cohort.attributes.cohortdefinitionid",
            100,
            "2"
        );
        const result = await svc.generateQuery();

        expect(result.queryString).not.toContain("__EMPTY_SEARCH__");
        expect(result.queryString).toContain("WHERE");
        expect(result.queryString).toContain("'%2%'");
    });

    it("preserves scoping predicates when only the search predicate is empty", async () => {
        const genderConfig = {
            ...baseConfig,
            patient: {
                attributes: {
                    genderconceptid: {
                        name: [{ lang: "", value: "Gender concept id" }],
                        type: "text",
                        expression: "@PATIENT.\"GENDER_CONCEPT_ID\"",
                        referenceFilter: "@REF.DOMAIN_ID = 'Gender' AND @REF.STANDARD_CONCEPT = 'S' AND CAST (@REF.CONCEPT_ID AS VARCHAR) LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'",
                        referenceExpression: "@REF.CONCEPT_ID",
                        order: 0,
                        useRefValue: true,
                        useRefText: true,
                    },
                },
            },
        };

        const svc = new DomainValuesSvc(
            genderConfig,
            "patient.attributes.genderconceptid",
            100,
            ""
        );
        const result = await svc.generateQuery();

        expect(result.queryString).not.toContain("__EMPTY_SEARCH__");
        expect(result.queryString).toContain("WHERE");
        expect(result.queryString.toUpperCase()).toContain("DOMAIN_ID = 'GENDER'");
        expect(result.queryString.toUpperCase()).toContain("STANDARD_CONCEPT = 'S'");
        expect(result.queryString.toUpperCase()).not.toContain("LIKE_REGEXPR");
    });
});

describe("DomainValuesSvc join construction for dim-level attribute tables", () => {
    // A dim-level attribute table is a satellite hanging off a dim table, declared in that dim's
    // `attributeTables`. It carries no PATIENT_ID, so it is reachable only through its dim, which in
    // turn joins the fact table. getStandardJoin closes over those dependencies while iterating a
    // snapshot of its placeholder set, so the dim it adds mid-walk is never revisited. Without an
    // explicit push of the fact table at that point, the fact table is left out of the FROM clause
    // while the SELECT still emits COUNT(DISTINCT P."PATIENT_ID") — SQL referencing an alias that was
    // never joined, which the database rejects.
    //
    // minCohortSize MUST be > 0 here. The gr_cnt term, and therefore the fact-table reference, is only
    // emitted when a threshold is set; with 0 the defect is invisible. That is why the specs above,
    // which use 0, cannot catch it.
    const dimAttributeConfig = {
        chartOptions: { minCohortSize: 1 },
        advancedSettings: {
            tableTypePlaceholderMap: {
                factTable: { placeholder: "@PATIENT", attributeTables: [] },
                dimTables: [
                    {
                        placeholder: "@DIM",
                        hierarchy: true,
                        time: true,
                        oneToN: true,
                        attributeTables: [{ placeholder: "@DIMATTR", oneToN: true }],
                    },
                ],
            },
            tableMapping: {
                "@PATIENT": '$$SCHEMA$$."FACT_TABLE"',
                "@PATIENT.PATIENT_ID": '"PATIENT_ID"',
                "@DIM": '$$SCHEMA$$."DIM_TABLE"',
                "@DIM.PATIENT_ID": '"PATIENT_ID"',
                "@DIM.INTERACTION_ID": '"DIM_ID"',
                "@DIMATTR": '$$SCHEMA$$."DIM_ATTRIBUTE_TABLE"',
                "@DIMATTR.INTERACTION_ID": '"DIM_ID"',
            },
        },
        patient: {
            interactions: {
                dimension: {
                    defaultFilter: "1=1",
                    attributes: {
                        dimattrvalue: {
                            name: [{ lang: "", value: "Dim attribute value" }],
                            type: "text",
                            expression: '@DIMATTR."ATTRIBUTE_VALUE"',
                            order: 0,
                        },
                        dimvalue: {
                            name: [{ lang: "", value: "Dim value" }],
                            type: "text",
                            expression: '@DIM."DIM_VALUE"',
                            order: 1,
                        },
                    },
                },
            },
        },
    };

    const squash = (sql: string) => sql.replace(/\s+/g, " ").trim();

    const generate = async (attributeKey: string) => {
        const svc = new DomainValuesSvc(
            dimAttributeConfig,
            `patient.interactions.dimension.attributes.${attributeKey}`,
            100,
            ""
        );
        return squash((await svc.generateQuery()).queryString);
    };

    it("joins the fact table through PATIENT_ID for an attribute on a dim-level attribute table", async () => {
        const sql = await generate("dimattrvalue");

        // the fact table is present, and the dim joins to it on PATIENT_ID
        expect(sql).toContain('$$SCHEMA$$."FACT_TABLE" P');
        expect(sql).toContain('INNER JOIN $$SCHEMA$$."DIM_TABLE" I ON I."PATIENT_ID"=P."PATIENT_ID"');
        // the attribute table joins to its dim on INTERACTION_ID
        expect(sql).toContain(
            'INNER JOIN $$SCHEMA$$."DIM_ATTRIBUTE_TABLE" C ON C."DIM_ID"=I."DIM_ID"'
        );
    });

    it("never references the fact alias without joining the fact table", async () => {
        const sql = await generate("dimattrvalue");

        // gr_cnt counts the fact alias; if that term is emitted, the fact table must be in the FROM
        // clause. This is the assertion that fails if the fact-table push is removed.
        expect(sql).toContain('COUNT(DISTINCT P. "PATIENT_ID") as "gr_cnt"');
        if (/COUNT\(DISTINCT P\./.test(sql)) {
            expect(sql).toContain('$$SCHEMA$$."FACT_TABLE" P');
        }
    });

    it("produces the same fact join for a plain dim attribute", async () => {
        const sql = await generate("dimvalue");

        expect(sql).toContain('$$SCHEMA$$."FACT_TABLE" P');
        expect(sql).toContain('INNER JOIN $$SCHEMA$$."DIM_TABLE" I ON I."PATIENT_ID"=P."PATIENT_ID"');
        // a dim attribute needs no attribute table
        expect(sql).not.toContain('"DIM_ATTRIBUTE_TABLE"');
    });
});
