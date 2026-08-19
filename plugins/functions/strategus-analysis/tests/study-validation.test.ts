import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import {
  validateStudyId,
  validateStudyIdMiddleware,
} from "../src/middlewares/study-validation.middleware.ts";
import { PortalServerAPI } from "../src/strategus-results/api/PortalServerAPI.ts";
import StrategusAnalysisService from "../src/analysis/services.ts";

Deno.test("validateStudyIdMiddleware returns 400 when studyId is absent", async () => {
  const req = createMockRequest({ params: {}, body: {} });
  const { res, captured } = createMockResponse();
  let nextCalled = false;

  await validateStudyIdMiddleware(req, res, (() => {
    nextCalled = true;
  }) as never);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, { message: "Study ID is required" });
  assertEquals(nextCalled, false);
});

Deno.test("validateStudyId returns true when no token is supplied (validation skipped)", async () => {
  // Documents existing behaviour: an unauthenticated caller bypasses the
  // study-existence check rather than being rejected.
  assertEquals(await validateStudyId("any-study", undefined), true);
});

Deno.test("validateStudyIdMiddleware calls next() when the study matches a dataset", async () => {
  const datasetsStub = stub(
    PortalServerAPI.prototype,
    "getDatasets",
    () => Promise.resolve([{ tokenStudyCode: "study-1" }]),
  );
  const analysisStub = stub(
    StrategusAnalysisService.prototype,
    "getStudyAnalysis",
    () => Promise.resolve(null),
  );

  try {
    const req = createMockRequest({
      params: { studyId: "study-1" },
      headers: { authorization: "Bearer test-token" },
    });
    const { res, captured } = createMockResponse();
    let nextCalled = false;

    await validateStudyIdMiddleware(req, res, (() => {
      nextCalled = true;
    }) as never);

    assertEquals(nextCalled, true);
    assertEquals(captured.statusCode, null);
  } finally {
    datasetsStub.restore();
    analysisStub.restore();
  }
});

Deno.test("validateStudyIdMiddleware returns 404 when the study is unknown", async () => {
  const datasetsStub = stub(
    PortalServerAPI.prototype,
    "getDatasets",
    () => Promise.resolve([]),
  );
  const analysisStub = stub(
    StrategusAnalysisService.prototype,
    "getStudyAnalysis",
    () => Promise.resolve(null),
  );
  const gitStub = stub(
    PortalServerAPI.prototype,
    "getGitStudies",
    () => Promise.resolve({}),
  );

  try {
    const req = createMockRequest({
      params: { studyId: "missing-study" },
      headers: { authorization: "Bearer test-token" },
    });
    const { res, captured } = createMockResponse();

    await validateStudyIdMiddleware(req, res, (() => {}) as never);

    assertEquals(captured.statusCode, 404);
    assertEquals(captured.body, { message: "Study missing-study not found." });
  } finally {
    datasetsStub.restore();
    analysisStub.restore();
    gitStub.restore();
  }
});

Deno.test("validateStudyId swallows API failures and returns false", async () => {
  const datasetsStub = stub(
    PortalServerAPI.prototype,
    "getDatasets",
    () => Promise.reject(new Error("portal unreachable")),
  );
  const analysisStub = stub(
    StrategusAnalysisService.prototype,
    "getStudyAnalysis",
    () => Promise.resolve(null),
  );

  try {
    assertEquals(await validateStudyId("study-1", "Bearer test-token"), false);
  } finally {
    datasetsStub.restore();
    analysisStub.restore();
  }
});
