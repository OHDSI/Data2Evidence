import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import pako from "pako";
import { encodeBase64 } from "base64";

/** Mirrors the encoding the UI performs before POSTing (pako.deflate + base64). */
function encodePayload(mappings: unknown[]): string {
  return encodeBase64(pako.deflate(JSON.stringify(mappings)));
}

// Records the cacheId trex is asked to open a connection against.
let lastGetConnectionArgs: unknown[] = [];
// Records the statement trex was asked to run, so save tests can assert the
// INSERT actually targets the resolved cache/schema.
let lastExecute: { sql: string; params: unknown[] } | null = null;
let executeImpl: (sql: string, params: unknown[]) => unknown[] = () => [];

// deno-lint-ignore no-explicit-any
(globalThis as any).Trex = {
  databaseManager: () => ({
    getConnection: (...args: unknown[]) => {
      lastGetConnectionArgs = args;
      return {
        execute: (
          sql: string,
          params: unknown[],
          cb: (err: unknown, res: unknown) => void,
        ) => {
          lastExecute = { sql, params: params.map((p) => (p as { value: unknown }).value) };
          try {
            cb(null, executeImpl(sql, params));
          } catch (e) {
            cb(e, null);
          }
        },
        close: () => {},
      };
    },
  }),
};

const express = (await import("express")).default;
const { ConceptMappingRouter } = await import("./routes.ts");

const DS = "3f2a1c44-7777-4aaa-9bbb-000000000007";
const EMPTY_PAYLOAD = "eJyLjgUAARUAuQ=="; // zlib+base64 of []

// deno-lint-ignore no-explicit-any
async function withServer(fetcherFactory: any, fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/concept-mapping", new ConceptMappingRouter(fetcherFactory).router);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as { port: number };
  try {
    await fn(`http://127.0.0.1:${port}/concept-mapping`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("GET /concept-mapping validation", () => {
  it("returns 400 when schemaName is missing", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/?databaseCode=PG_MAIN`);
      assertEquals(res.status, 400);
      await res.body?.cancel();
    });
  });

  it("returns 400 when datasetId is not a UUID", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_MAIN&schemaName=cdm&datasetId=not-a-uuid`,
      );
      assertEquals(res.status, 400);
      await res.body?.cancel();
    });
  });
});

describe("cacheId resolution over HTTP", () => {
  it("opens the connection with the dataset's persisted cacheId", async () => {
    lastGetConnectionArgs = [];
    executeImpl = () => [{ source_code: "X1" }];

    const factory = () => (_id: string) =>
      Promise.resolve({ cacheId: "_stored_cache", databaseCode: "PG_SHARE" });

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_SHARE&schemaName=cdm&datasetId=${DS}`,
      );
      assertEquals(res.status, 200);
      assertEquals(await res.json(), [{ source_code: "X1" }]);
    });

    // Authoritative cacheId, NOT the request's databaseCode.
    assertEquals(lastGetConnectionArgs[0], "_stored_cache");
  });

  it("loads a legacy dataset via the record's databaseCode when cacheId is absent", async () => {
    lastGetConnectionArgs = [];
    executeImpl = () => [{ source_code: "LEGACY" }];

    // Migrated row the cache_id backfill left unset -> guarded fallback.
    const factory = () => (_id: string) =>
      Promise.resolve({ cacheId: null, databaseCode: "PG_OLDER" });

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=REQ_CODE&schemaName=cdm&datasetId=${DS}`,
      );
      assertEquals(res.status, 200);
      assertEquals(await res.json(), [{ source_code: "LEGACY" }]);
    });

    // The record's databaseCode wins over the request's, which is never trusted
    // once a datasetId is in play.
    assertEquals(lastGetConnectionArgs[0], "PG_OLDER");
  });

  it("uses the databaseCode when no datasetId is supplied (infra path)", async () => {
    lastGetConnectionArgs = [];
    executeImpl = () => [];

    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/?databaseCode=PG_MAIN&schemaName=cdm`);
      assertEquals(res.status, 200);
      assertEquals(await res.json(), []);
    });

    assertEquals(lastGetConnectionArgs[0], "PG_MAIN");
  });

  it("returns 502 when the dataset lookup fails, never a guessed cache", async () => {
    const factory = () => (_id: string) => Promise.reject(new Error("portal down"));

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_SHARE&schemaName=cdm&datasetId=${DS}`,
      );
      assertEquals(res.status, 502);
      assertStringIncludes(await res.text(), "cache id");
    });
  });
});

describe("POST /concept-mapping save path", () => {
  it("writes the mappings to the dataset's persisted cacheId", async () => {
    lastGetConnectionArgs = [];
    lastExecute = null;
    // rowCount is derived from the driver result length.
    executeImpl = () => [{}, {}];

    const factory = () => (_id: string) =>
      Promise.resolve({ cacheId: "_stored_cache", databaseCode: "PG_SHARE" });

    const payload = encodePayload([
      { source_code: "A1", target_concept_id: 111 },
      { source_code: "B2", target_concept_id: 222 },
    ]);

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_SHARE&schemaName=cdm&datasetId=${DS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVocabularyId: "MY_VOCAB",
            conceptMappings: payload,
          }),
        },
      );
      assertEquals(res.status, 200);
      assertStringIncludes(await res.text(), "Inserted 2 rows");
    });

    // The write targets the authoritative cacheId, NOT the request databaseCode.
    assertEquals(lastGetConnectionArgs[0], "_stored_cache");
    assertStringIncludes(lastExecute!.sql, "INSERT INTO cdm.source_to_concept_map");
    // sourceVocabularyId is stamped onto every row.
    assertEquals(
      lastExecute!.params.filter((p) => p === "MY_VOCAB").length,
      2,
    );
    assertEquals(lastExecute!.params.includes("A1"), true);
    assertEquals(lastExecute!.params.includes("B2"), true);
  });

  it("saves against the databaseCode when no datasetId is supplied (infra path)", async () => {
    lastGetConnectionArgs = [];
    executeImpl = () => [{}];

    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/?databaseCode=PG_MAIN&schemaName=cdm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceVocabularyId: "V",
          conceptMappings: encodePayload([{ source_code: "A1" }]),
        }),
      });
      assertEquals(res.status, 200);
      await res.body?.cancel();
    });

    assertEquals(lastGetConnectionArgs[0], "PG_MAIN");
  });

  it("returns 502 without writing when the dataset lookup fails", async () => {
    lastGetConnectionArgs = [];
    lastExecute = null;
    executeImpl = () => [{}];

    const factory = () => (_id: string) => Promise.reject(new Error("portal down"));

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_SHARE&schemaName=cdm&datasetId=${DS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVocabularyId: "V",
            conceptMappings: encodePayload([{ source_code: "A1" }]),
          }),
        },
      );
      assertEquals(res.status, 502);
      assertStringIncludes(await res.text(), "cache id");
    });

    // Critically: no connection opened and nothing written to a guessed cache.
    assertEquals(lastGetConnectionArgs.length, 0);
    assertEquals(lastExecute, null);
  });
});

describe("POST /concept-mapping error contract", () => {
  it("returns 400 for an empty mappings payload even when portal is down", async () => {
    const factory = () => (_id: string) => Promise.reject(new Error("portal down"));

    await withServer(factory, async (base) => {
      const res = await fetch(
        `${base}/?databaseCode=PG_SHARE&schemaName=cdm&datasetId=${DS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVocabularyId: "vocab",
            conceptMappings: EMPTY_PAYLOAD,
          }),
        },
      );
      // Empty payload is rejected before cacheId resolution -> 400, not 502.
      assertEquals(res.status, 400);
      assertStringIncludes(await res.text(), "No concept mappings to save");
    });
  });

  it("returns 400 when conceptMappings is an empty string", async () => {
    await withServer(undefined, async (base) => {
      const res = await fetch(`${base}/?databaseCode=PG_MAIN&schemaName=cdm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVocabularyId: "v", conceptMappings: "" }),
      });
      assertEquals(res.status, 400);
      await res.body?.cancel();
    });
  });
});
