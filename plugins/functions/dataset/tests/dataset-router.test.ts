import "./_setup.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import { findHandler } from "../../_shared/testing/router-helpers.ts";
import { DatasetRouter } from "../router.ts";
import { AnalyticsSvcAPI } from "../api/AnalyticsSvcAPI.ts";
import { DbCredentialsAPI } from "../api/DbCredentialsAPI.ts";
import { FhirGatewayAPI } from "../api/FhirGatewayAPI.ts";
import { JobPluginsAPI } from "../api/JobpluginsAPI.ts";
import { PortalAPI } from "../api/PortalAPI.ts";

const METADATA_PATH = "/cdm-schema/snapshot/metadata";
const COHORTS_PATH = "/cohorts";
const AUTH = { authorization: "Bearer test-token" };

function handlerFor(method: string, path: string) {
  return findHandler(new DatasetRouter().router, method, path);
}

// Guards the test harness itself. Every API-client constructor throws
// "No url is set for X" when its SERVICE_ROUTES key is absent, and the router's
// handlers swallow that throw into a generic 500 — which would make the
// error-handling tests below pass for entirely the wrong reason.
Deno.test("_setup SERVICE_ROUTES satisfies every API client the router constructs", () => {
  new AnalyticsSvcAPI("Bearer t");
  new PortalAPI("Bearer t");
  new JobPluginsAPI("Bearer t");
  new FhirGatewayAPI("Bearer t");
  new DbCredentialsAPI("Bearer t");
});

Deno.test("metadata endpoint returns 400 when datasetId is missing", async () => {
  const req = createMockRequest({ query: {}, headers: AUTH });
  const { res, captured } = createMockResponse();

  await handlerFor("get", METADATA_PATH)(req, res);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, "datasetId is required");
});

Deno.test("metadata endpoint returns 400 when datasetId is repeated in the query string", async () => {
  // Express parses ?datasetId=a&datasetId=b into an array, not a string.
  const req = createMockRequest({
    query: { datasetId: ["a", "b"] },
    headers: AUTH,
  });
  const { res, captured } = createMockResponse();

  await handlerFor("get", METADATA_PATH)(req, res);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, "datasetId query param is invalid");
});

Deno.test("metadata endpoint returns 200 with the metadata payload", async () => {
  const apiStub = stub(
    AnalyticsSvcAPI.prototype,
    "getCdmSchemaSnapshotMetadata",
    (datasetId: string) => {
      // Proves the handler forwarded the query param rather than the test
      // merely reaching some other 200 path.
      assertEquals(datasetId, "dataset-1");
      return Promise.resolve({ cdmVersion: "5.4" });
    },
  );

  try {
    const req = createMockRequest({
      query: { datasetId: "dataset-1" },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await handlerFor("get", METADATA_PATH)(req, res);

    assertEquals(apiStub.calls.length, 1);
    assertEquals(captured.statusCode, 200);
    assertEquals(captured.jsonCalled, true);
    assertEquals(captured.body, { cdmVersion: "5.4" });
  } finally {
    apiStub.restore();
  }
});

Deno.test("metadata endpoint returns 500 when the analytics call fails", async () => {
  const apiStub = stub(
    AnalyticsSvcAPI.prototype,
    "getCdmSchemaSnapshotMetadata",
    () => Promise.reject(new Error("analytics down")),
  );

  try {
    const req = createMockRequest({
      query: { datasetId: "dataset-1" },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await handlerFor("get", METADATA_PATH)(req, res);

    assertEquals(apiStub.calls.length, 1);
    assertEquals(captured.statusCode, 500);
    assertEquals(captured.body, "Error when getting CDM schema snapshot metadata");
  } finally {
    apiStub.restore();
  }
});

// The auth case. Documents a real gap: AnalyticsSvcAPI's constructor throws on
// a missing token, and in the metadata handler it is constructed OUTSIDE the
// try block (router.ts:64, try opens at :66), so the rejection escapes the
// handler to Express rather than becoming a clean 4xx response.
Deno.test("metadata endpoint rejects instead of returning 401 when the auth header is absent", async () => {
  const req = createMockRequest({ query: { datasetId: "dataset-1" }, headers: {} });
  const { res, captured } = createMockResponse();

  await assertRejects(
    () => Promise.resolve(handlerFor("get", METADATA_PATH)(req, res)),
    Error,
    "No token passed for Analytics API!",
  );

  // Nothing was ever written to the response.
  assertEquals(captured.statusCode, null);
  assertEquals(captured.jsonCalled, false);
  assertEquals(captured.sendCalled, false);
});

// Contrast with the metadata route: /cohorts constructs the same client INSIDE
// its try block (router.ts:93), so the identical input is reported as a 500
// instead of escaping. Two routes on the same router, two different failure
// modes for a missing Authorization header. Characterized, not endorsed.
Deno.test("cohorts endpoint reports a missing Authorization header as 500, not 401", async () => {
  const req = createMockRequest({ query: { datasetId: "dataset-1" }, headers: {} });
  const { res, captured } = createMockResponse();

  await handlerFor("get", COHORTS_PATH)(req, res);

  assertEquals(captured.statusCode, 500);
  assertEquals(captured.body, "Error when getting cohorts");
});
