import { QueryGenSvc } from "../../src/svc/QueryGenSvc";
import { Utils } from "../../src/qe/sql_generator2/Utils";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

describe("QueryGenSvc HANA edge-case regressions (issue #2234)", () => {
    function makeSvc(pluginOptionalParams: any = {}) {
        const svc = new QueryGenSvc(
            "plugin",
            {
                uniquePatientTempTableName: "TMP_PATIENTS",
            },
            {},
            {
                getFactTablePlaceholder: () => "fact",
            },
            {},
            {
                insert: true,
                createCohort: false,
                ...pluginOptionalParams,
            },
            "1",
            "hana"
        );
        (svc as any).uniquePatientTempTableName = "TMP_PATIENTS";
        return svc;
    }

    function countCteNames(queryString: string) {
        const matches = Array.from(
            queryString.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\(/g),
            (match) => match[1]
        );
        const counts = new Map<string, number>();
        matches.forEach((name) => {
            counts.set(name, (counts.get(name) || 0) + 1);
        });
        return counts;
    }

    it("avoids duplicate PatientRequest0 CTE in single-request pCount path (EC-2)", () => {
        const svc = makeSvc();
        const nql = {} as any;

        spyOn(Utils, "getContextSQLParts").and.returnValue({
            withClause:
                'WITH PatientRequestEntryExit AS (SELECT 1), PatientRequest0 AS (SELECT 2)',
            body: new QueryObject("SELECT * FROM PatientRequest0", [], true),
        });
        spyOn(Utils, "getContextSQL").and.returnValue(
            new QueryObject(
                'SELECT COUNT(DISTINCT(PatientRequest0."patient.attributes.pcount.0")) FROM PatientRequest0',
                [],
                true
            )
        );
        spyOn(Utils, "hasMultiRequest").and.returnValue(false);

        const result = (svc as any).getPCountQueryObject(nql);
        const queryString = result.queryString as string;
        const cteCounts = countCteNames(queryString);

        expect(queryString).toContain("PatientRequestsResult AS");
        expect(queryString).toContain("FROM PatientRequestsResult");
        expect(cteCounts.get("PatientRequest0")).toBe(1);
    });

    it("keeps HANA insert path as INSERT INTO ... WITH ... SELECT", () => {
        const svc = makeSvc({ insert: true, createCohort: false });
        const nql = {
            generateSQL: () => {},
        } as any;
        const confHelper = {
            getColumn: (name: string) => {
                if (name === "fact") {
                    return "FACT";
                }
                if (name === "fact.PATIENT_ID") {
                    return "PATIENT_ID";
                }
                return name;
            },
        } as any;

        spyOn(Utils, "getContextSQLParts").and.returnValue({
            withClause: "WITH PatientRequestEntryExit AS (SELECT 1)",
            body: new QueryObject(
                'SELECT "patient.attributes.pcount.0" FROM PatientRequest0',
                [],
                true
            ),
        });

        const query = (svc as any).appendPluginSpecificQueries(nql, confHelper);
        const queryString = query.queryString as string;
        const insertIdx = queryString.indexOf("INSERT INTO TMP_PATIENTS");
        const withIdx = queryString.indexOf("WITH PatientRequestEntryExit AS");
        const selectIdx = queryString.indexOf('SELECT "pTable".*');

        expect(insertIdx).toBeGreaterThan(-1);
        expect(withIdx).toBeGreaterThan(insertIdx);
        expect(selectIdx).toBeGreaterThan(withIdx);
        expect(queryString.indexOf("( WITH ")).toBe(-1);
        expect(queryString.indexOf("(WITH ")).toBe(-1);
    });

    it("keeps createCohort path unhoisted (no injected WITH clause)", () => {
        const svc = makeSvc({ insert: false, createCohort: true });
        const nql = {
            generateSQL: () => {},
        } as any;
        const confHelper = {
            getColumn: (name: string) => name,
        } as any;

        spyOn(Utils, "getContextSQL").and.returnValue(
            new QueryObject(
                'SELECT "patient.attributes.pcount.0" FROM PatientRequest0',
                [],
                true
            )
        );

        const query = (svc as any).appendPluginSpecificQueries(nql, confHelper);
        const queryString = query.queryString as string;

        expect(queryString).not.toContain("WITH PatientRequestEntryExit AS");
        expect(queryString).toContain("FROM (");
    });
});
