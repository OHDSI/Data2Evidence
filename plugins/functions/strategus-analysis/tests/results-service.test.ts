import "./_setup.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import dataSource from "../src/db/datasource.ts";
import StrategusResultsService from "../src/results/services.ts";

interface FakeRepo {
  find: (opts?: unknown) => Promise<unknown[]>;
  findOne: (opts: unknown) => Promise<unknown>;
  save: (row: unknown) => Promise<unknown>;
  delete: (criteria: unknown) => Promise<unknown>;
}

interface StorageCall {
  method: string;
  bucket: string;
  path: string;
}

function fakeStorage(overrides: Record<string, unknown> = {}) {
  const calls: StorageCall[] = [];
  const storage = {
    calls,
    createBucket: () => Promise.resolve(),
    upload: (bucket: string, path: string) => {
      calls.push({ method: "upload", bucket, path });
      return Promise.resolve({ bucket, path });
    },
    download: (bucket: string, path: string) => {
      calls.push({ method: "download", bucket, path });
      return Promise.resolve({
        readStream: new ReadableStream(),
        contentType: "application/zip",
      });
    },
    delete: (bucket: string, path: string) => {
      calls.push({ method: "delete", bucket, path });
      return Promise.resolve();
    },
    ...overrides,
  };
  return storage;
}

function serviceWith(repo: Partial<FakeRepo>, storage: unknown) {
  const repoStub = stub(dataSource, "getRepository", () => repo as never);
  try {
    return new StrategusResultsService(storage as never);
  } finally {
    repoStub.restore();
  }
}

const ZIP = new Uint8Array([1, 2, 3, 4]);
// sha256 of the four bytes above, so the assertion pins the real digest.
const ZIP_SHA256 =
  "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a";

Deno.test("createResult uploads first, then saves a row keyed by the object id", async () => {
  const saved: Record<string, unknown>[] = [];
  const storage = fakeStorage();
  const service = serviceWith({
    save: (row: Record<string, unknown>) => {
      saved.push(row);
      return Promise.resolve(row);
    },
  }, storage);

  const result = await service.createResult("Bearer test-token", {
    name: "Run A",
    fileName: "results.zip",
    buffer: ZIP,
    mimetype: "application/zip",
    metadata: { source: "manual" },
  });

  assertEquals(storage.calls[0].method, "upload");
  assertEquals(storage.calls[0].bucket, "strategus-results-store");
  assertEquals(storage.calls[0].path, `${result.id}/results.zip`);
  assertEquals(saved.length, 1);
  assertEquals(result.fileSize, 4);
  assertEquals(result.checksum, ZIP_SHA256);
  assertEquals(result.storagePath, `${result.id}/results.zip`);
  assertEquals(result.metadata, { source: "manual" });
});

Deno.test("createResult deletes the object when the row insert fails", async () => {
  const storage = fakeStorage();
  const service = serviceWith({
    save: () => Promise.reject(new Error("insert failed")),
  }, storage);

  await assertRejects(
    () =>
      service.createResult("Bearer test-token", {
        name: "Run A",
        fileName: "results.zip",
        buffer: ZIP,
        mimetype: "application/zip",
      }),
    Error,
    "insert failed",
  );

  assertEquals(storage.calls.map((c) => c.method), ["upload", "delete"]);
  assertEquals(storage.calls[0].path, storage.calls[1].path);
});

Deno.test("getResultStream returns null for an unknown id", async () => {
  const service = serviceWith(
    { findOne: () => Promise.resolve(null) },
    fakeStorage(),
  );
  assertEquals(await service.getResultStream("missing"), null);
});

Deno.test("getResultStream fetches the object recorded on the row", async () => {
  const storage = fakeStorage();
  const service = serviceWith({
    findOne: () =>
      Promise.resolve({
        id: "r1",
        bucket: "strategus-results-store",
        storagePath: "r1/results.zip",
        fileName: "results.zip",
        fileSize: 4,
      }),
  }, storage);

  const streamed = await service.getResultStream("r1");
  assertEquals(streamed?.result.id, "r1");
  assertEquals(storage.calls[0], {
    method: "download",
    bucket: "strategus-results-store",
    path: "r1/results.zip",
  });
});

Deno.test("deleteResult removes the object and then the row", async () => {
  const storage = fakeStorage();
  const deleted: unknown[] = [];
  const service = serviceWith({
    findOne: () =>
      Promise.resolve({
        id: "r1",
        bucket: "strategus-results-store",
        storagePath: "r1/results.zip",
      }),
    delete: (criteria: unknown) => {
      deleted.push(criteria);
      return Promise.resolve({ affected: 1 });
    },
  }, storage);

  const removed = await service.deleteResult("r1");

  assertEquals(removed?.id, "r1");
  assertEquals(storage.calls[0].method, "delete");
  assertEquals(deleted, [{ id: "r1" }]);
});

Deno.test("listResults caps the page size at 200", async () => {
  let seen: Record<string, unknown> = {};
  const service = serviceWith({
    find: (opts: Record<string, unknown>) => {
      seen = opts;
      return Promise.resolve([]);
    },
  }, fakeStorage());

  await service.listResults({ limit: 5000, offset: 10 });

  assertEquals(seen.take, 200);
  assertEquals(seen.skip, 10);
  assertEquals(seen.order, { createdAt: "DESC" });
});
