import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import { findHandlerChain } from "../../_shared/testing/router-helpers.ts";
import { PortalServerAPI } from "../src/api/PortalServerAPI.ts";
import { CachedbController } from "../src/controllers/CachedbController.ts";
import { CachedbService } from "../src/services/CachedbService.ts";

const VALID_UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
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
  const controller = new CachedbController();
  return findHandlerChain(controller.router, method, path);
}

// Fix for the Critical naming defect found in whole-branch review: portal now sends an
// explicit cacheId pinned to sanitizeIdForCacheId(dataset.id), because bao's cohort
// handlers in trex hardcode the cache catalog to that same value with no override. The
// dataset row's stored cache_id (what resolveCacheWriteTarget derives) does not always
// equal it, so an explicit cacheId must win.
Deno.test("POST create-file prefers an explicit cacheId over the derived write target", async () => {
  const datasetStub = stub(
    PortalServerAPI.prototype,
    "getDataset",
    () =>
      Promise.resolve({
        id: VALID_UUID,
        cacheId: "derived_from_row",
        databaseCode: "derived_from_row",
        schemaName: "cdm",
        resultsSchemaName: "results",
        vocabSchemaName: "vocab",
      }),
  );
  // deno-lint-ignore no-explicit-any
  let capturedDto: any;
  const serviceStub = stub(
    CachedbService.prototype,
    "createCachedbFileFlowRun",
    // deno-lint-ignore no-explicit-any
    (dto: any) => {
      capturedDto = dto;
      return Promise.resolve({ flowRunId: "run-1" });
    },
  );

  try {
    const req = createMockRequest({
      body: { datasetId: VALID_UUID, cacheId: "_pinned_cache_id" },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("post", "/create-file"), req, res, captured);

    assertEquals(serviceStub.calls.length, 1);
    assertEquals(capturedDto.cacheId, "_pinned_cache_id");
  } finally {
    datasetStub.restore();
    serviceStub.restore();
  }
});

Deno.test("POST create-file falls back to resolveCacheWriteTarget when cacheId is absent", async () => {
  const datasetStub = stub(
    PortalServerAPI.prototype,
    "getDataset",
    () =>
      Promise.resolve({
        id: VALID_UUID,
        cacheId: "row_cache_id",
        databaseCode: "row_database_code",
        schemaName: "cdm",
        resultsSchemaName: "results",
        vocabSchemaName: "vocab",
      }),
  );
  // deno-lint-ignore no-explicit-any
  let capturedDto: any;
  const serviceStub = stub(
    CachedbService.prototype,
    "createCachedbFileFlowRun",
    // deno-lint-ignore no-explicit-any
    (dto: any) => {
      capturedDto = dto;
      return Promise.resolve({ flowRunId: "run-1" });
    },
  );

  try {
    const req = createMockRequest({
      body: { datasetId: VALID_UUID },
      headers: AUTH,
    });
    const { res, captured } = createMockResponse();

    await runChain(route("post", "/create-file"), req, res, captured);

    assertEquals(capturedDto.cacheId, "row_cache_id");
  } finally {
    datasetStub.restore();
    serviceStub.restore();
  }
});
