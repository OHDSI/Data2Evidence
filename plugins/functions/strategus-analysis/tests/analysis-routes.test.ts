import "./_setup.ts";
import { assertEquals } from "@std/assert";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import { findHandler } from "../../_shared/testing/router-helpers.ts";
import StrategusAnalysisRouter from "../src/analysis/routes.ts";

function routerWithService(overrides: Record<string, unknown>) {
  const instance = new StrategusAnalysisRouter();
  instance.strategusAnalysisService = {
    ...instance.strategusAnalysisService,
    ...overrides,
  } as never;
  return instance;
}

Deno.test("GET /:studyId returns 400 when studyId is empty", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "get", "/:studyId");
  const req = createMockRequest({ params: { studyId: "" }, headers: {} });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, { message: "Missing required field: studyId" });
});

Deno.test("GET / returns 404 when a datasetId filter matches nothing", async () => {
  const instance = routerWithService({
    getAnalysisByDatasetId: () => Promise.resolve(null),
  });
  const handler = findHandler(instance.router, "get", "/");
  const req = createMockRequest({
    query: { datasetId: "unknown-dataset" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 404);
  assertEquals(captured.body, { message: "Analysis not found for this dataset" });
});

Deno.test("GET / returns 200 with the full list when no filter is supplied", async () => {
  const instance = routerWithService({
    getAllAnalysis: () => Promise.resolve([{ id: "a1" }]),
  });
  const handler = findHandler(instance.router, "get", "/");
  const req = createMockRequest({
    query: {},
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 200);
  assertEquals(captured.body, [{ id: "a1" }]);
});

Deno.test("GET / converts a service failure into a 500 without leaking the error", async () => {
  const instance = routerWithService({
    getAllAnalysis: () => Promise.reject(new Error("database exploded")),
  });
  const handler = findHandler(instance.router, "get", "/");
  const req = createMockRequest({
    query: {},
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 500);
  assertEquals(captured.body, {
    message: "An error occurred while fetching all analysis specifications",
  });
});
