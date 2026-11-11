import { assertEquals, assertRejects } from "@std/assert";
import pako from "pako";
import { createEndpointFromRequest } from "./CreatePluginEndpoint";

const zlibBase64 = (o: unknown) =>
    btoa(String.fromCharCode(...pako.deflate(JSON.stringify(o))));

const base64Url = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// getUser only decodes the token. The signature is not checked.
const userToken = `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({ sub: "user-1" })}.sig`;

// The mriquery names a different known dataset than the selected one.
const mriquery = zlibBase64({
    cohortDefinition: {
        configData: { configId: "c", configVersion: "1" },
        cards: { content: [] },
    },
    datasetId: "other-dataset",
});

const makeReq = (overrides: Record<string, unknown> = {}) =>
    ({
        headers: { authorization: `Bearer ${userToken}` },
        query: { mriquery },
        body: {},
        dbConnections: {
            analyticsConnection: { dialect: "POSTGRES", schemaName: "cdm" },
        },
        studiesDbMetadata: {
            studies: [
                { id: "known-dataset", schemaName: "cdm" },
                { id: "other-dataset", schemaName: "other_cdm" },
            ],
        },
        selectedstudyDbMetadata: { id: "known-dataset", schemaName: "cdm" },
        ...overrides,
    }) as any;

Deno.test("returns the selected dataset, not the mriquery dataset", async () => {
    const { datasetId, cohortDefinition } = await createEndpointFromRequest(makeReq());

    assertEquals(datasetId, "known-dataset");
    assertEquals(cohortDefinition.configData.configId, "c");
});

Deno.test("rejects the request when no dataset is selected", async () => {
    await assertRejects(
        () => createEndpointFromRequest(makeReq({ selectedstudyDbMetadata: undefined })),
        Error,
        "Schema name undefined"
    );
});
