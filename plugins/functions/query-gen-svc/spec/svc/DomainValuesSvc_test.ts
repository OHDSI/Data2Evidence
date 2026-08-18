import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
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

describe("DomainValuesSvc reference-path row limit (project#31)", () => {
    const baseConfig = { chartOptions: { minCohortSize: 0 } };

    const procedureConfig = (extraAttrProps = {}) => ({
        ...baseConfig,
        patient: {
            interactions: {
                proc: {
                    attributes: {
                        procedureconceptcode: {
                            name: [{ lang: "", value: "Procedure source concept code" }],
                            type: "text",
                            expression: "@REF.CONCEPT_CODE",
                            referenceExpression: "@REF.CONCEPT_CODE",
                            referenceFilter:
                                "@REF.DOMAIN_ID = 'Procedure' AND CAST (@REF.CONCEPT_NAME AS VARCHAR) LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'",
                            order: 0,
                            useRefValue: true,
                            useRefText: true,
                            ...extraAttrProps,
                        },
                    },
                },
            },
        },
    });

    const PATH = "patient.interactions.proc.attributes.procedureconceptcode";

    it("caps the reference query with the default limit when the caller sends none", async () => {
        const svc = new DomainValuesSvc(procedureConfig(), PATH, undefined, "");
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIMIT 100");
    });

    it("caps the reference query with the requested limit", async () => {
        const svc = new DomainValuesSvc(procedureConfig(), PATH, 25, "");
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIMIT 25");
    });

    it("caps the reference query with the attribute suggestionLimit", async () => {
        const svc = new DomainValuesSvc(
            procedureConfig({ suggestionLimit: 42 }),
            PATH,
            undefined,
            ""
        );
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIMIT 42");
    });

    it("puts the limit after ORDER BY", async () => {
        const svc = new DomainValuesSvc(procedureConfig(), PATH, 10, "");
        const result = await svc.generateQuery();
        const sql = result.queryString.toUpperCase();

        expect(sql.indexOf("ORDER BY")).toBeLessThan(sql.indexOf("LIMIT"));
    });

    it("keeps the limit when a search string is given", async () => {
        const svc = new DomainValuesSvc(procedureConfig(), PATH, 10, "hyper");
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIKE_REGEXPR");
        expect(result.queryString.toUpperCase()).toContain("LIMIT 10");
    });

    it("ignores a limit that is not a positive integer", async () => {
        for (const badLimit of ["10; DROP TABLE CONCEPT", "abc", -5, 0, 2.5, null]) {
            const svc = new DomainValuesSvc(procedureConfig(), PATH, badLimit, "");
            const result = await svc.generateQuery();

            expect(result.queryString.toUpperCase()).toContain("LIMIT 100");
            expect(result.queryString.toUpperCase()).not.toContain("DROP TABLE");
        }
    });

    const CODE_SEARCH_FILTER =
        "@REF.DOMAIN_ID = 'Condition' AND (@REF.CONCEPT_NAME LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'" +
        " OR @REF.CONCEPT_CODE LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'" +
        " OR REPLACE_REGEXPR ('\\.' IN @REF.CONCEPT_CODE WITH '') LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i')";

    it("removes every empty-search copy inside an OR group and keeps the domain filter", async () => {
        const svc = new DomainValuesSvc(
            procedureConfig({ referenceFilter: CODE_SEARCH_FILTER }),
            PATH,
            undefined,
            ""
        );
        const result = await svc.generateQuery();
        const sql = result.queryString.toUpperCase();

        expect(result.queryString).not.toContain("__EMPTY_SEARCH__");
        expect(sql).toContain("DOMAIN_ID = 'CONDITION'");
        expect(sql).not.toContain("LIKE_REGEXPR");
        expect(sql).not.toContain("CONCEPT_CODE WITH");
        expect(sql).toContain("LIMIT 100");
    });

    it("keeps the whole OR group when a search string is given", async () => {
        const svc = new DomainValuesSvc(
            procedureConfig({ referenceFilter: CODE_SEARCH_FILTER }),
            PATH,
            undefined,
            "I10"
        );
        const result = await svc.generateQuery();
        const sql = result.queryString.toUpperCase();

        expect(sql).toContain("DOMAIN_ID = 'CONDITION'");
        expect(sql).toContain("R.CONCEPT_NAME LIKE_REGEXPR 'I10'");
        expect(sql).toContain("R.CONCEPT_CODE LIKE_REGEXPR 'I10'");
        expect(sql).toContain("REPLACE_REGEXPR");
        expect(sql).toContain("LIMIT 100");
    });

    it("clamps the limit to panelOptions.domainValuesLimit", async () => {
        const config = { ...procedureConfig(), panelOptions: { domainValuesLimit: 50 } };
        const svc = new DomainValuesSvc(config, PATH, 999999999, "");
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIMIT 50");
    });

    it("keeps a limit that is below panelOptions.domainValuesLimit", async () => {
        const config = { ...procedureConfig(), panelOptions: { domainValuesLimit: 50 } };
        const svc = new DomainValuesSvc(config, PATH, 25, "");
        const result = await svc.generateQuery();

        expect(result.queryString.toUpperCase()).toContain("LIMIT 25");
    });

    it("inlines the limit instead of leaving a bound parameter placeholder", async () => {
        const svc = new DomainValuesSvc(procedureConfig(), PATH, 10, "");
        const result = await svc.generateQuery();

        expect(result.queryString).not.toMatch(/\{[0-9a-f-]{8,}\}/i);
    });
});
