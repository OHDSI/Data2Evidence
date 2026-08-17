import "./_setup.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import { findHandlerChain } from "../../_shared/testing/router-helpers.ts";
import { AnalyticsSvcAPI } from "../src/api/AnalyticsAPI.ts";
import { PortalServerAPI } from "../src/api/PortalServerAPI.ts";
import { PrefectAPI } from "../src/api/PrefectAPI.ts";
import { DqdController } from "../src/controllers/DqdController.ts";
import { DqdService } from "../src/services/DqdService.ts";

const VALID_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_UUID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const AUTH = { authorization: "Bearer test-token" };

/**
 * Run a route's full middleware chain (validators first, then the handler),
 * stopping early if a middleware responds instead of calling next().
 */
async function runChain(
  chain: Array<(req: unknown, res: unknown, next: unknown) => unknown>,
  req: unknown,
  res: unknown,
  captured: { statusCode: number | null; jsonCalled: boolean; sendCalled: boolean },
) {
  for (const middleware of chain) {
    let advanced = false;
    await middleware(req, res, () => {
      advanced = true;
    });
    if (!advanced && (captured.jsonCalled || captured.sendCalled)) return;
  }
}

function route(method: string, path: string) {
  const controller = new DqdController();
  return findHandlerChain(controller.router, method, path);
}

// Guards the test harness itself. Every API-client constructor throws
// "No url is set for X" when its SERVICE_ROUTES key is absent, and DqdController
// swallows that throw into a generic 500 — which would make the error-handling
// tests below pass for entirely the wrong reason.
Deno.test("_setup SERVICE_ROUTES satisfies every API client the DQD path constructs", () => {
  new PrefectAPI("Bearer t");
  new PortalServerAPI("Bearer t");
  new AnalyticsSvcAPI("Bearer t");
});

Deno.test("GET flow-run results rejects a non-UUID flowRunId with 400", async () => {
  const req = createMockRequest({
    params: { flowRunId: "not-a-uuid" },
    query: { datasetId: VALID_UUID },
    headers: AUTH,
  });
  const { res, captured } = createMockResponse();

  await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.jsonCalled, true);
});

Deno.test("GET flow-run results rejects a missing datasetId with 400", async () => {
  const req = createMockRequest({
    params: { flowRunId: VALID_UUID },
    query: {},
    headers: AUTH,
  });
  const { res, captured } = createMockResponse();

  await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

  assertEquals(captured.statusCode, 400);
});

Deno.test("GET flow-run results sends the service payload on the happy path", async () => {
  const checkResults = [{ checkName: "measurePersonCompleteness", failed: 0 }];
  const serviceStub = stub(
    DqdService.prototype,
    "getDataQualityResult",
    (flowRunId: string, token: string) => {
      // Proves the handler forwarded the route param and the bearer token
      // rather than the test merely reaching some other 200 path.
      assertEquals(flowRunId, VALID_UUID);
      assertEquals(token, AUTH.authorization);
      return Promise.resolve(checkResults);
    },
  );

  try {
    const req = createMockRequest({
      params: { flowRunId: VALID_UUID },
      query: { datasetId: OTHER_UUID },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

    assertEquals(serviceStub.calls.length, 1);
    assertEquals(captured.sendCalled, true);
    assertEquals(captured.body, checkResults);
    // The handler never calls res.status() on success, so Express's 200 default
    // stands and the double records null.
    assertEquals(captured.statusCode, null);
  } finally {
    serviceStub.restore();
  }
});

Deno.test("GET flow-run results returns 404 when the service finds no result", async () => {
  const serviceStub = stub(
    DqdService.prototype,
    "getDataQualityResult",
    () => Promise.resolve(null),
  );

  try {
    const req = createMockRequest({
      params: { flowRunId: VALID_UUID },
      query: { datasetId: VALID_UUID },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

    assertEquals(captured.statusCode, 404);
    assertEquals(captured.body, `No DQD result found for flowRunId: ${VALID_UUID}`);
  } finally {
    serviceStub.restore();
  }
});

Deno.test("GET flow-run results returns 500 when the service throws", async () => {
  const serviceStub = stub(
    DqdService.prototype,
    "getDataQualityResult",
    () => Promise.reject(new Error("prefect unreachable")),
  );

  try {
    const req = createMockRequest({
      params: { flowRunId: VALID_UUID },
      query: { datasetId: VALID_UUID },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

    assertEquals(serviceStub.calls.length, 1);
    assertEquals(captured.statusCode, 500);
    assertEquals(captured.body, "Error retrieving DQD result");
  } finally {
    serviceStub.restore();
  }
});

// The auth case: DqdController reads `req.headers.authorization!` and hands it
// straight to DqdService, whose PrefectAPI constructor throws "No token passed
// for Prefect API!". The controller catches everything, so an unauthenticated
// request is reported as a server error rather than a 401. Characterized, not
// endorsed — see the report note.
Deno.test("GET flow-run results reports a missing Authorization header as 500, not 401", async () => {
  const req = createMockRequest({
    params: { flowRunId: VALID_UUID },
    query: { datasetId: VALID_UUID },
    headers: {},
  });
  const { res, captured } = createMockResponse();

  await runChain(route("get", "/flow-run/:flowRunId/results"), req, res, captured);

  assertEquals(captured.statusCode, 500);
  assertEquals(captured.body, "Error retrieving DQD result");
});

Deno.test("GET flow-run overview returns 404 when the service finds no overview", async () => {
  const serviceStub = stub(
    DqdService.prototype,
    "getDataQualityOverview",
    () => Promise.resolve(null),
  );

  try {
    const req = createMockRequest({
      params: { flowRunId: VALID_UUID },
      query: { datasetId: VALID_UUID },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("get", "/flow-run/:flowRunId/overview"), req, res, captured);

    assertEquals(captured.statusCode, 404);
    assertStringIncludes(String(captured.body), "No overview found for flowRunId");
  } finally {
    serviceStub.restore();
  }
});

Deno.test("GET release flow-run rejects a non-integer releaseId with 400", async () => {
  const req = createMockRequest({
    params: { releaseId: "abc" },
    query: { datasetId: VALID_UUID },
    headers: AUTH,
  });
  const { res, captured } = createMockResponse();

  await runChain(route("get", "/release/:releaseId/flow-run"), req, res, captured);

  assertEquals(captured.statusCode, 400);
});

Deno.test("POST flow-run rejects a body without a datasetId with 400", async () => {
  const req = createMockRequest({ body: {}, headers: AUTH });
  const { res, captured } = createMockResponse();

  await runChain(route("post", "/flow-run"), req, res, captured);

  assertEquals(captured.statusCode, 400);
  assertEquals(
    (captured.body as { errors: Array<{ msg: string }> }).errors.map((e) => e.msg),
    ["datasetId must be a valid UUID"],
  );
});

Deno.test("POST flow-run sends the created flowRunId on the happy path", async () => {
  const body = { datasetId: VALID_UUID, comment: "nightly" };
  const serviceStub = stub(
    DqdService.prototype,
    "createDataQualityFlowRun",
    (dto: unknown, token: string) => {
      assertEquals(dto, body);
      assertEquals(token, AUTH.authorization);
      return Promise.resolve({ flowRunId: OTHER_UUID });
    },
  );

  try {
    const req = createMockRequest({ body, headers: AUTH });
    const { res, captured } = createMockResponse();

    await runChain(route("post", "/flow-run"), req, res, captured);

    assertEquals(serviceStub.calls.length, 1);
    assertEquals(captured.sendCalled, true);
    assertEquals(captured.body, { flowRunId: OTHER_UUID });
  } finally {
    serviceStub.restore();
  }
});

Deno.test("POST flow-run returns 500 when the service throws", async () => {
  const serviceStub = stub(
    DqdService.prototype,
    "createDataQualityFlowRun",
    () => Promise.reject(new Error("CDM version not found")),
  );

  try {
    const req = createMockRequest({ body: { datasetId: VALID_UUID }, headers: AUTH });
    const { res, captured } = createMockResponse();

    await runChain(route("post", "/flow-run"), req, res, captured);

    assertEquals(captured.statusCode, 500);
    assertEquals(captured.body, "Error occurred while creating DQD flow run");
  } finally {
    serviceStub.restore();
  }
});
