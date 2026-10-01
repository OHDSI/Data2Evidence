import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import studyDbCredentialMiddleware from "./StudyDbCredential";

const defaultCredential = {
    dialect: "postgresql",
    schema: "default_schema",
    code: "default",
};

const makeReq = (overrides: Record<string, unknown> = {}) =>
    ({
        url: "/analytics-svc/api/services/population/json/patientcount",
        originalUrl: "/analytics-svc/api/services/population/json/patientcount",
        headers: {},
        query: {},
        body: {},
        studiesDbMetadata: {
            studies: [
                {
                    id: "known-dataset",
                    tokenStudyCode: "known-token",
                    databaseName: "db",
                    databaseCode: "db",
                    schemaName: "cdm",
                },
            ],
        },
        dbCredentials: {
            analyticsCredentials: { default: defaultCredential },
        },
        ...overrides,
    }) as any;

const run = async (req: any) => {
    let nextArg: unknown = "not-called";
    await studyDbCredentialMiddleware(req, {}, (arg?: unknown) => {
        nextArg = arg;
    });
    return nextArg;
};

Deno.test(
    "rejects a user request naming a dataset that is not a known study",
    async () => {
        const req = makeReq({ query: { datasetId: "someone-elses-dataset" } });
        const err = (await run(req)) as { status?: number; message?: string };

        assert(err instanceof Error);
        assertEquals(err.status, 403);
        assertStringIncludes(err.message, "Unknown or inaccessible dataset");
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "rejects an unknown dataset carried in the request body",
    async () => {
        const req = makeReq({ body: { datasetId: "someone-elses-dataset" } });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 403);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "falls back to the default connection when no dataset is named",
    async () => {
        const req = makeReq({ url: "/alpdb/schema/exists" });
        const nextArg = await run(req);

        assertEquals(nextArg, undefined);
        assertEquals(
            req.dbCredentials.studyAnalyticsCredential,
            defaultCredential
        );
    }
);
