import { assertEquals } from "@std/assert";
import type { IWebAPICohortDefinition } from "../api/WebAPI.ts";

Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({
    webapi: "http://localhost:33001/WebAPI",
    analytics: "http://localhost:33001",
  }),
);

const rawGetResponse: IWebAPICohortDefinition = {
  id: 101,
  name: "Raw WebAPI Cohort",
  description: "No mapping expected",
  hasWriteAccess: false,
  tags: [],
  expressionType: "SIMPLE_EXPRESSION",
  expression: "{}",
  modifiedBy: { id: 1, login: "modifier", name: "Modifier User" },
  createdBy: { id: 2, login: "creator", name: "Creator User" },
  createdDate: "2026-06-19T16:30:00.000Z",
  modifiedDate: "2026-06-19T16:31:00.000Z",
};

const rawCreateResponse: IWebAPICohortDefinition = {
  id: 202,
  name: "Created Cohort",
  description: "",
  hasWriteAccess: true,
  tags: [],
  expressionType: "CUSTOM_SQL",
  expression: "SELECT * FROM PERSON",
  modifiedBy: { id: 1, login: "modifier", name: "Modifier User" },
  createdBy: { id: 2, login: "creator", name: "Creator User" },
  createdDate: "2026-06-19T16:32:00.000Z",
  modifiedDate: "2026-06-19T16:32:00.000Z",
};

const rawUpdateResponse: IWebAPICohortDefinition = {
  id: 303,
  name: "Updated Cohort",
  description: "Updated",
  hasWriteAccess: true,
  tags: [],
  expressionType: "EXTERNAL_SOURCED",
  expression: '{"external":true}',
  modifiedBy: { id: 1, login: "modifier", name: "Modifier User" },
  createdBy: { id: 2, login: "creator", name: "Creator User" },
  createdDate: "2026-06-19T16:33:00.000Z",
  modifiedDate: "2026-06-19T16:34:00.000Z",
};

const webApiCallLog = {
  get: [] as string[],
  post: [] as string[],
  put: [] as string[],
  delete: [] as string[],
};
const analyticsCallLog = {
  get: [] as string[],
  delete: [] as string[],
};
let shouldFailWebApiPost = false;
let shouldFailAnalyticsGet = false;

globalThis.fetch = async (
  input: URL | Request | string,
  init?: RequestInit,
) => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
    ? input.toString()
    : input.url;
  const method = init?.method?.toUpperCase() ?? "GET";

  if (!url.startsWith("http://localhost:33001/WebAPI/cohortdefinition")) {
    return new Response("not-found", { status: 404 });
  }

  if (method === "GET") {
    webApiCallLog.get.push(url);
    return Response.json(rawGetResponse);
  }

  if (method === "POST") {
    if (shouldFailWebApiPost) {
      throw new Error("webapi-post-failed");
    }
    webApiCallLog.post.push(url);
    return Response.json(rawCreateResponse);
  }

  if (method === "PUT") {
    webApiCallLog.put.push(url);
    return Response.json(rawUpdateResponse);
  }

  if (method === "DELETE") {
    webApiCallLog.delete.push(url);
    return new Response(null, { status: 204 });
  }

  return new Response("method-not-allowed", { status: 405 });
};

// @ts-ignore Trex global is provided by runtime; mocked for unit tests.
globalThis.Trex = {
  tokioChannel: (channel: string) => {
    if (channel === "d2e-functions/analytics-svc") {
      return {
        get: async (url: string) => {
          if (shouldFailAnalyticsGet) {
            throw new Error("analytics-get-failed");
          }
          analyticsCallLog.get.push(url);
          return { data: { data: [{ id: 77 }] } };
        },
        delete: async (url: string) => {
          analyticsCallLog.delete.push(url);
          return { data: null as unknown };
        },
      };
    }

    throw new Error(`Unexpected channel requested in test: ${channel}`);
  },
};

const {
  getCohortDefinition,
  createCohortDefinition,
  updateCohortDefinition,
  deleteCohortDefinition,
} = await import("./cohortdefinition.service.ts");

const resetLogs = () => {
  webApiCallLog.get = [];
  webApiCallLog.post = [];
  webApiCallLog.put = [];
  webApiCallLog.delete = [];
  analyticsCallLog.get = [];
  analyticsCallLog.delete = [];
  shouldFailWebApiPost = false;
  shouldFailAnalyticsGet = false;
};

Deno.test("getCohortDefinition returns raw WebAPI response without mapping", async () => {
  resetLogs();
  const result = await getCohortDefinition("Bearer token", "dataset-id", 101);
  assertEquals(result, rawGetResponse);
  assertEquals(webApiCallLog.get.length, 1);
  assertEquals(
    webApiCallLog.get[0],
    "http://localhost:33001/WebAPI/cohortdefinition/101",
  );
});

Deno.test("createCohortDefinition returns raw WebAPI response without mapping", async () => {
  resetLogs();
  const result = await createCohortDefinition("Bearer token", "dataset-id", {
    id: 1000,
    name: "Create Request",
    description: "Create Description",
    expressionType: "SIMPLE_EXPRESSION",
    expression: { ConceptSets: [] as unknown[] },
    createdBy: null,
    createdDate: null,
    modifiedBy: null,
    modifiedDate: null,
    tags: [] as string[],
  });

  assertEquals(result, rawCreateResponse);
  assertEquals(webApiCallLog.post.length, 1);
  assertEquals(
    webApiCallLog.post[0],
    "http://localhost:33001/WebAPI/cohortdefinition/",
  );
});

Deno.test("createCohortDefinition propagates WebAPI errors explicitly", async () => {
  resetLogs();
  shouldFailWebApiPost = true;
  let caughtError: unknown;
  try {
    await createCohortDefinition("Bearer token", "dataset-id", {
      id: 1001,
      name: "Create Request Error",
      description: "Create Description",
      expressionType: "SIMPLE_EXPRESSION",
      expression: { ConceptSets: [] as unknown[] },
      createdBy: null,
      createdDate: null,
      modifiedBy: null,
      modifiedDate: null,
      tags: [] as string[],
    });
  } catch (error) {
    caughtError = error;
  }
  assertEquals((caughtError as Error).message, "webapi-post-failed");
});

Deno.test("updateCohortDefinition returns raw WebAPI response without mapping", async () => {
  resetLogs();
  const result = await updateCohortDefinition(
    "Bearer token",
    "dataset-id",
    303,
    {
      id: 999,
      name: "Update Request",
      description: "Update Description",
      expressionType: "SIMPLE_EXPRESSION",
      expression: { ConceptSets: [{ id: 1 }] as Array<Record<string, unknown>> },
      createdBy: null,
      createdDate: null,
      modifiedBy: null,
      modifiedDate: null,
      tags: [] as string[],
    },
  );

  assertEquals(result, rawUpdateResponse);
  assertEquals(webApiCallLog.put.length, 1);
  assertEquals(
    webApiCallLog.put[0],
    "http://localhost:33001/WebAPI/cohortdefinition/303",
  );
});

Deno.test("deleteCohortDefinition preserves cleanup flow and calls WebAPI delete", async () => {
  resetLogs();
  await deleteCohortDefinition("Bearer token", "dataset-id", 404);

  assertEquals(analyticsCallLog.get.length, 1);
  assertEquals(analyticsCallLog.delete.length, 1);
  assertEquals(webApiCallLog.delete.length, 1);
  assertEquals(
    webApiCallLog.delete[0],
    "http://localhost:33001/WebAPI/cohortdefinition/404",
  );
});

Deno.test("deleteCohortDefinition fail-open on analytics lookup error and still deletes in WebAPI", async () => {
  resetLogs();
  shouldFailAnalyticsGet = true;
  await deleteCohortDefinition("Bearer token", "dataset-id", 405);

  assertEquals(analyticsCallLog.get.length, 0);
  assertEquals(analyticsCallLog.delete.length, 0);
  assertEquals(webApiCallLog.delete.length, 1);
  assertEquals(
    webApiCallLog.delete[0],
    "http://localhost:33001/WebAPI/cohortdefinition/405",
  );
});
