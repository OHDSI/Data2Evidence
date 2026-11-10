import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import pako from "pako";
import studyDbCredentialMiddleware from "./StudyDbCredential";
import { env } from "../env";

const zlibBase64 = (o: unknown) =>
    btoa(String.fromCharCode(...pako.deflate(JSON.stringify(o))));

const base64Url = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// Unsigned tokens. The middleware only decodes them; the gateway checks signatures.
const makeToken = (payload: Record<string, unknown>) =>
    `Bearer ${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(payload)}.sig`;
const userToken = makeToken({ sub: "user-1" });
const clientCredToken = makeToken({ sub: "service-1", authType: "azure-ad" });

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
                {
                    id: "other-dataset",
                    tokenStudyCode: "other-token",
                    databaseName: "other",
                    databaseCode: "other",
                    schemaName: "other_cdm",
                },
            ],
        },
        dbCredentials: {
            analyticsCredentials: {
                default: defaultCredential,
                db: { dialect: "postgresql", schema: "cdm", code: "db" },
                other: { dialect: "postgresql", schema: "other_cdm", code: "other" },
            },
        },
        ...overrides,
    }) as any;

// Stubs the portal calls: getStudies() and the PA config in addConfigMetadataToReq.
// Records each requested URL. The tests do not use the network.
const withPortalStub = async (fn: (urls: string[]) => Promise<void>) => {
    const urls: string[] = [];
    const g = globalThis as any;
    const previousTrex = g.Trex;
    const previousRoutes = (env as any).SERVICE_ROUTES;
    (env as any).SERVICE_ROUTES = { portalServer: "http://portal" };
    g.Trex = {
        tokioChannel: () => ({
            get: async (url: string) => {
                urls.push(url);
                if (url.includes("/dataset/list/systemadmin")) {
                    return { data: makeReq().studiesDbMetadata.studies };
                }
                return {
                    data: {
                        meta: {
                            configId: "c",
                            configVersion: "1",
                            dependentConfig: { configId: "d", configVersion: "1" },
                        },
                    },
                };
            },
        }),
    };
    try {
        await fn(urls);
    } finally {
        g.Trex = previousTrex;
        (env as any).SERVICE_ROUTES = previousRoutes;
    }
};

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
    "requires a top-level datasetId when a zlib-encoded body mriquery names one",
    async () => {
        const req = makeReq({
            body: { mriquery: zlibBase64({ datasetId: "known-dataset" }) },
        });
        const err = (await run(req)) as { status?: number; message?: string };

        assertEquals(err?.status, 400);
        assertStringIncludes(err?.message ?? "", "datasetId is required");
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "requires a top-level datasetId when a plain-JSON body mriquery names one",
    async () => {
        const req = makeReq({
            body: { mriquery: JSON.stringify({ datasetId: "known-dataset" }) },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 400);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "requires a top-level datasetId when a query mriquery names one",
    async () => {
        const req = makeReq({
            query: { mriquery: zlibBase64({ datasetId: "known-dataset" }) },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 400);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "uses the top-level datasetId when the mriquery names another known dataset",
    async () => {
        await withPortalStub(async (urls) => {
            const req = makeReq({
                query: {
                    datasetId: "known-dataset",
                    mriquery: zlibBase64({ datasetId: "other-dataset" }),
                },
            });
            const nextArg = await run(req);

            assertEquals(nextArg, undefined);
            assertEquals(req.selectedstudyDbMetadata.id, "known-dataset");
            assertEquals(req.dbCredentials.studyAnalyticsCredential.schema, "cdm");
            assertEquals(urls.length, 1);
            assertStringIncludes(urls[0], "datasetId=known-dataset");
            assertEquals(req.paConfigId, "c");
        });
    }
);

Deno.test(
    "uses the top-level body datasetId when a body mriquery names an unknown dataset",
    async () => {
        await withPortalStub(async (urls) => {
            const req = makeReq({
                body: {
                    datasetId: "known-dataset",
                    mriquery: JSON.stringify({ datasetId: "someone-elses-dataset" }),
                },
            });
            const nextArg = await run(req);

            assertEquals(nextArg, undefined);
            assertEquals(req.selectedstudyDbMetadata.id, "known-dataset");
            assertEquals(req.dbCredentials.studyAnalyticsCredential.schema, "cdm");
            assertStringIncludes(urls[0], "datasetId=known-dataset");
        });
    }
);

Deno.test(
    "resolves a tokenStudyCode to the canonical dataset id",
    async () => {
        await withPortalStub(async (urls) => {
            const req = makeReq({
                query: {
                    datasetId: "known-token",
                    mriquery: zlibBase64({ datasetId: "known-token" }),
                },
            });
            const nextArg = await run(req);

            assertEquals(nextArg, undefined);
            assertEquals(req.selectedstudyDbMetadata.id, "known-dataset");
            assertStringIncludes(urls[0], "datasetId=known-dataset");
            assertEquals(req.paConfigId, "c");
        });
    }
);

Deno.test(
    "rejects an unknown top-level datasetId with 403 when an mriquery names a known one",
    async () => {
        const req = makeReq({
            query: {
                datasetId: "someone-elses-dataset",
                mriquery: zlibBase64({ datasetId: "known-dataset" }),
            },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 403);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "reads the body datasetId for a client-credentials request with a body mriquery",
    async () => {
        await withPortalStub(async (urls) => {
            const req = makeReq({
                headers: { "auth-type": "azure-ad", authorization: clientCredToken },
                body: {
                    datasetId: "known-token",
                    mriquery: JSON.stringify({ datasetId: "someone-elses-dataset" }),
                },
            });
            const nextArg = await run(req);

            assertEquals(nextArg, undefined);
            assertEquals(req.selectedstudyDbMetadata.id, "known-dataset");
            assert(urls.some((u) => u.includes("/dataset/list/systemadmin")));
        });
    }
);

Deno.test(
    "requires a top-level datasetId for a client-credentials request with an mriquery",
    async () => {
        const req = makeReq({
            headers: { "auth-type": "azure-ad", authorization: clientCredToken },
            query: { mriquery: zlibBase64({ datasetId: "known-token" }) },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 400);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "uses the client-credentials branch for the header and a client-credentials token",
    async () => {
        await withPortalStub(async (urls) => {
            const req = makeReq({
                headers: { "auth-type": "azure-ad", authorization: clientCredToken },
                query: { datasetId: "someone-elses-dataset" },
            });
            const nextArg = await run(req);

            // The client-credentials branch has no 403 for an unknown dataset.
            assertEquals(nextArg, undefined);
            assert(urls.some((u) => u.includes("/dataset/list/systemadmin")));
        });
    }
);

Deno.test(
    "uses the user branch for the auth-type header with a user token",
    async () => {
        const req = makeReq({
            headers: { "auth-type": "azure-ad", authorization: userToken },
            query: { datasetId: "someone-elses-dataset" },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 403);
        assertEquals(req.dbCredentials.studyAnalyticsCredential, undefined);
    }
);

Deno.test(
    "uses the user branch for the auth-type header without a token",
    async () => {
        const req = makeReq({
            headers: { "auth-type": "shared-azure-ad" },
            query: { datasetId: "someone-elses-dataset" },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 403);
    }
);

Deno.test(
    "uses the user branch for a client-credentials token without the header",
    async () => {
        const req = makeReq({
            headers: { authorization: clientCredToken },
            query: { datasetId: "someone-elses-dataset" },
        });
        const err = (await run(req)) as { status?: number };

        assertEquals(err?.status, 403);
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
