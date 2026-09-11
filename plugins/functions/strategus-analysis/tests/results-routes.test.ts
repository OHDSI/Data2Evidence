import "./_setup.ts";
import { assertEquals } from "@std/assert";
import {
  createMockRequest,
  createMockResponse,
} from "../../_shared/testing/http-doubles.ts";
import { findHandler } from "../../_shared/testing/router-helpers.ts";
import StrategusResultsRouter from "../src/results/routes.ts";
import { StorageError } from "../src/storage/SupabaseStorageClient.ts";

function routerWithService(overrides: Record<string, unknown>) {
  const instance = new StrategusResultsRouter();
  instance.strategusResultsService = {
    ...instance.strategusResultsService,
    ...overrides,
  } as never;
  return instance;
}

function uploadRequest(
  file: Record<string, unknown> | undefined,
  body: Record<string, unknown> = {},
  params: Record<string, unknown> = {},
) {
  return {
    params,
    query: {},
    body,
    headers: { authorization: "Bearer test-token" },
    file,
  } as never;
}

const zipFile = {
  originalname: "results.zip",
  buffer: new Uint8Array([1, 2, 3, 4]),
  size: 4,
  mimetype: "application/zip",
};

/**
 * Response double that is also a writable sink, so the streaming download
 * handler can pipe into it while the test still inspects status and headers.
 */
function createStreamingMockResponse() {
  const captured = {
    statusCode: null as number | null,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    chunks: [] as number[],
  };
  const finished = Promise.withResolvers<void>();

  const res = {
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      captured.body = payload;
      finished.resolve();
      return res;
    },
    setHeader(key: string, value: string) {
      captured.headers[key] = value;
      return res;
    },
    on() {
      return res;
    },
    once() {
      return res;
    },
    emit() {
      return false;
    },
    write(chunk: Uint8Array) {
      captured.chunks.push(...chunk);
      return true;
    },
    end() {
      finished.resolve();
      return res;
    },
  };

  return { res: res as never, captured, finished: finished.promise };
}

Deno.test("POST / returns 401 without an authorization header", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const req = {
    params: {},
    query: {},
    body: { name: "Run A" },
    headers: {},
    file: zipFile,
  } as never;
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 401);
  assertEquals(captured.body, {
    message: "Authorization header is required",
  });
});

Deno.test("POST / returns 400 when no file is attached", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(uploadRequest(undefined, { name: "Run A" }), res);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, { message: "No file provided" });
});

Deno.test("POST / rejects a non-zip upload", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(
    uploadRequest({ ...zipFile, originalname: "results.tar" }, {
      name: "Run A",
    }),
    res,
  );

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, {
    message: "Invalid file type. Only .zip files are allowed",
  });
});

Deno.test("POST / rejects an oversized upload", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(
    uploadRequest({ ...zipFile, size: 500 * 1024 * 1024 + 1 }, {
      name: "Run A",
    }),
    res,
  );

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, {
    message: "File size exceeds maximum allowed size of 500MB",
  });
});

Deno.test("POST / requires a name", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(uploadRequest(zipFile, {}), res);

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, { message: "Missing required field: name" });
});

Deno.test("POST / rejects metadata that is not valid JSON", async () => {
  const instance = routerWithService({});
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(
    uploadRequest(zipFile, { name: "Run A", metadata: "{not json" }),
    res,
  );

  assertEquals(captured.statusCode, 400);
  assertEquals(captured.body, {
    message: "Invalid metadata: must be valid JSON",
  });
});

Deno.test("POST / returns 201 with the created result", async () => {
  const instance = routerWithService({
    createResult: (_token: string, input: Record<string, unknown>) =>
      Promise.resolve({ id: "r1", ...input }),
  });
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(
    uploadRequest(zipFile, { name: "Run A", metadata: '{"source":"manual"}' }),
    res,
  );

  assertEquals(captured.statusCode, 201);
  assertEquals((captured.body as Record<string, unknown>).id, "r1");
  assertEquals((captured.body as Record<string, unknown>).name, "Run A");
});

Deno.test("POST / maps a storage failure to 502", async () => {
  const instance = routerWithService({
    createResult: () =>
      Promise.reject(new StorageError("storage down", 502)),
  });
  const handler = findHandler(instance.router, "post", "/");
  const { res, captured } = createMockResponse();

  await handler(uploadRequest(zipFile, { name: "Run A" }), res);

  assertEquals(captured.statusCode, 502);
  assertEquals(captured.body, { message: "storage down" });
});

Deno.test("GET / passes limit, offset and name through to the service", async () => {
  let seen: Record<string, unknown> = {};
  const instance = routerWithService({
    listResults: (options: Record<string, unknown>) => {
      seen = options;
      return Promise.resolve([{ id: "r1" }]);
    },
  });
  const handler = findHandler(instance.router, "get", "/");
  const req = createMockRequest({
    query: { limit: "10", offset: "20", name: "run" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 200);
  assertEquals(captured.body, [{ id: "r1" }]);
  assertEquals(seen, { limit: 10, offset: 20, name: "run" });
});

Deno.test("GET /:id returns 404 for an unknown id", async () => {
  const instance = routerWithService({
    getResult: () => Promise.resolve(null),
  });
  const handler = findHandler(instance.router, "get", "/:id");
  const req = createMockRequest({
    params: { id: "missing" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 404);
  assertEquals(captured.body, { message: "Result not found: missing" });
});

Deno.test("GET /:id/download sets zip headers and streams the object", async () => {
  const instance = routerWithService({
    getResultStream: () =>
      Promise.resolve({
        result: { id: "r1", fileName: "results.zip", fileSize: 4 },
        readStream: new Response(new Uint8Array([1, 2, 3, 4])).body,
      }),
  });
  const handler = findHandler(instance.router, "get", "/:id/download");
  const req = createMockRequest({
    params: { id: "r1" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured, finished } = createStreamingMockResponse();

  await handler(req, res);
  await finished;

  assertEquals(captured.statusCode, 200);
  assertEquals(captured.headers["Content-Type"], "application/zip");
  assertEquals(
    captured.headers["Content-Disposition"],
    'attachment; filename="results.zip"',
  );
  assertEquals(captured.headers["Content-Length"], "4");
  assertEquals(captured.chunks, [1, 2, 3, 4]);
});

Deno.test("GET /:id/download returns 404 for an unknown id", async () => {
  const instance = routerWithService({
    getResultStream: () => Promise.resolve(null),
  });
  const handler = findHandler(instance.router, "get", "/:id/download");
  const req = createMockRequest({
    params: { id: "missing" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 404);
  assertEquals(captured.body, { message: "Result not found: missing" });
});

Deno.test("PUT /:id returns 404 for an unknown id", async () => {
  const instance = routerWithService({
    replaceResult: () => Promise.resolve(null),
  });
  const handler = findHandler(instance.router, "put", "/:id");
  const { res, captured } = createMockResponse();

  await handler(uploadRequest(zipFile, {}, { id: "missing" }), res);

  assertEquals(captured.statusCode, 404);
  assertEquals(captured.body, { message: "Result not found: missing" });
});

Deno.test("PUT /:id returns 200 with the updated result and no name required", async () => {
  const instance = routerWithService({
    replaceResult: (
      _token: string,
      id: string,
      input: Record<string, unknown>,
    ) => Promise.resolve({ id, ...input }),
  });
  const handler = findHandler(instance.router, "put", "/:id");
  const { res, captured } = createMockResponse();

  await handler(uploadRequest(zipFile, {}, { id: "r1" }), res);

  assertEquals(captured.statusCode, 200);
  assertEquals((captured.body as Record<string, unknown>).id, "r1");
});

Deno.test("DELETE /:id returns 404 for an unknown id", async () => {
  const instance = routerWithService({
    deleteResult: () => Promise.resolve(null),
  });
  const handler = findHandler(instance.router, "delete", "/:id");
  const req = createMockRequest({
    params: { id: "missing" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 404);
  assertEquals(captured.body, { message: "Result not found: missing" });
});

Deno.test("DELETE /:id returns 200 when the result is removed", async () => {
  const instance = routerWithService({
    deleteResult: () => Promise.resolve({ id: "r1" }),
  });
  const handler = findHandler(instance.router, "delete", "/:id");
  const req = createMockRequest({
    params: { id: "r1" },
    headers: { authorization: "Bearer test-token" },
  });
  const { res, captured } = createMockResponse();

  await handler(req, res);

  assertEquals(captured.statusCode, 200);
  assertEquals(captured.body, {
    id: "r1",
    message: "Result deleted successfully.",
  });
});
