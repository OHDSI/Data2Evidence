import { assertEquals } from "@std/assert";
import { resolveDcResultsSchema } from "./dcResultsSchema";

const base = {
    isTrexConnection: true,
    useSourceConnection: true,
    databaseCode: "demo_database",
    resultsSchema: "demo_cdm_results",
};

Deno.test("source-connection runs over trex read from the source catalog", () => {
    assertEquals(
        resolveDcResultsSchema(base),
        "demo_database__srcdb.demo_cdm_results"
    );
});

Deno.test("legacy trex runs keep the unqualified cache schema", () => {
    assertEquals(
        resolveDcResultsSchema({
            ...base,
            useSourceConnection: false,
            resultsSchema: "demo_cdm_dc_1234",
        }),
        "demo_cdm_dc_1234"
    );
});

Deno.test("non-trex connections address the source database directly", () => {
    assertEquals(
        resolveDcResultsSchema({ ...base, isTrexConnection: false }),
        "demo_cdm_results"
    );
});

Deno.test("a missing database code cannot form a catalog prefix", () => {
    assertEquals(
        resolveDcResultsSchema({ ...base, databaseCode: undefined }),
        "demo_cdm_results"
    );
});
