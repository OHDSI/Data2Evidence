import { Utils } from "../../src/qe/sql_generator2/Utils";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

describe("Utils.formMultipleEntryExitParts (issue #2234)", () => {
    function makeQO(sqlText: string, placeholders: any[] = []): QueryObject {
        return new QueryObject(sqlText, placeholders, true);
    }

    it("returns a WITH clause that begins with the keyword WITH", () => {
        const peeQO = makeQO("SELECT pid, MIN(d) AS entry, MAX(d) AS exit FROM PEE_source");
        const pr0QO = makeQO('SELECT "patient.attributes.pcount.0" FROM cohort_source');

        const { withClause } = Utils.formMultipleEntryExitParts([peeQO, pr0QO]);

        expect(withClause.trimStart().startsWith("WITH ")).toBe(true);
        expect(withClause).toContain("PatientRequestEntryExit");
        expect(withClause).toContain("PatientRequest0");
    });

    it("returns a body that does NOT contain a WITH clause (it must be hoisted out)", () => {
        const peeQO = makeQO("SELECT pid, MIN(d) AS entry, MAX(d) AS exit FROM PEE_source");
        const pr0QO = makeQO('SELECT "patient.attributes.pcount.0" FROM cohort_source');

        const { body } = Utils.formMultipleEntryExitParts([peeQO, pr0QO]);

        expect(body.queryString.indexOf("WITH ")).toBe(-1);
        expect(body.queryString).toContain("INNER JOIN");
        expect(body.queryString).toContain("PatientRequestEntryExit");
        expect(body.queryString).toContain("PatientRequest0");
    });

    it("does not nest a WITH inside parentheses (HANA-incompatible shape)", () => {
        const peeQO = makeQO("SELECT pid, MIN(d) AS entry, MAX(d) AS exit FROM PEE_source");
        const pr0QO = makeQO('SELECT "patient.attributes.pcount.0" FROM cohort_source');

        const { withClause, body } = Utils.formMultipleEntryExitParts([peeQO, pr0QO]);
        const combined = `${withClause} ${body.queryString}`;

        // The first WITH must be at the start (after trimming).
        expect(combined.trimStart().startsWith("WITH ")).toBe(true);
        // No second WITH anywhere — there is only one WITH in the whole statement.
        const firstWith = combined.indexOf("WITH ");
        const secondWith = combined.indexOf("WITH ", firstWith + 1);
        expect(secondWith).toBe(-1);
    });

    it("merges parameter placeholders from all contextList items into the body", () => {
        const peePlaceholder = { key: "{pee-key}", value: "pee-val", type: "text" };
        const pr0Placeholder = { key: "{pr0-key}", value: "pr0-val", type: "text" };
        const peeQO = makeQO("SELECT pid FROM PEE_source WHERE x = {pee-key}", [peePlaceholder]);
        const pr0QO = makeQO("SELECT pid FROM cohort_source WHERE y = {pr0-key}", [pr0Placeholder]);

        const { body } = Utils.formMultipleEntryExitParts([peeQO, pr0QO]);

        const keys = body.parameterPlaceholders.map((p) => p.key);
        expect(keys).toContain("{pee-key}");
        expect(keys).toContain("{pr0-key}");
    });
});

describe("Utils.getContextSQL (regression — combined output unchanged)", () => {
    function makeQO(sqlText: string, placeholders: any[] = []): QueryObject {
        return new QueryObject(sqlText, placeholders, true);
    }

    // The combined queryString returned by getContextSQL must remain
    // observationally equivalent to "<withClause> <body.queryString>" so
    // existing callers (e.g. cohortCompare) continue to work unchanged.
    it("formMultipleEntryExitParts pieces together to the legacy combined shape", () => {
        const peeQO = makeQO("SELECT pid, MIN(d) AS entry, MAX(d) AS exit FROM PEE_source");
        const pr0QO = makeQO('SELECT "patient.attributes.pcount.0" FROM cohort_source');

        const { withClause, body } = Utils.formMultipleEntryExitParts([peeQO, pr0QO]);
        const combined = `${withClause} ${body.queryString}`;

        // Sanity: combined contains both the CTE definitions and the JOIN body.
        expect(combined).toContain("PatientRequestEntryExit AS");
        expect(combined).toContain("PatientRequest0 AS");
        expect(combined).toContain("INNER JOIN");
    });
});
