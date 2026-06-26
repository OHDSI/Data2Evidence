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
