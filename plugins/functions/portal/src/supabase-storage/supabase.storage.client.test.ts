import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { ObjectAlreadyExistsError, SupabaseStorageClient } from "./supabase.storage.client.ts";

// Records every request instead of calling storage. Object uploads are
// answered with `objectUploadResponse`; everything else with 200.
let requested: { method: string; url: string; headers: Headers }[] = [];
let objectUploadResponse: () => Response;
const realFetch = globalThis.fetch;

beforeEach(() => {
  requested = [];
  objectUploadResponse = () => new Response("{}", { status: 200 });
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    requested.push({ method, url, headers: new Headers(init?.headers) });
    if (method === "POST" && url.includes("/object/") && !url.includes("/object/list")) {
      return Promise.resolve(objectUploadResponse());
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// The object URL the client used for `method`, ignoring the bucket set-up
// requests the client also makes.
const objectRequest = (method: string) => {
  const found = requested.filter((r) => r.method === method && r.url.includes("/object/"));
  assertEquals(found.length, 1, `one ${method} object request: ${JSON.stringify(requested)}`);
  return found[0].url;
};

// Review: file names were put into the storage URL unencoded, so "#" cut the
// name short, "?" started a query string and "%" made the URL malformed.
describe("SupabaseStorageClient object URLs", () => {
  const cases = [
    { name: "report#1.txt", encoded: "report%231.txt" },
    { name: "a?b.txt", encoded: "a%3Fb.txt" },
    { name: "100%.txt", encoded: "100%25.txt" },
    { name: "notes v2.txt", encoded: "notes%20v2.txt" },
  ];

  it("encodes the file name when uploading", async () => {
    for (const { name, encoded } of cases) {
      requested = [];
      await new SupabaseStorageClient().upload("ds-1", {
        originalname: name,
        buffer: new Uint8Array([1]).buffer,
        mimetype: "text/plain",
      });
      assert(objectRequest("POST").endsWith(`/object/portal-datasets-resources/datasets/ds-1/${encoded}`));
    }
  });

  it("encodes the file name when downloading and deleting", async () => {
    for (const { name, encoded } of cases) {
      requested = [];
      await new SupabaseStorageClient().download("ds-1", name);
      assert(objectRequest("GET").endsWith(`/datasets/ds-1/${encoded}`));

      requested = [];
      await new SupabaseStorageClient().delete("ds-1", name);
      assert(objectRequest("DELETE").endsWith(`/datasets/ds-1/${encoded}`));
    }
  });

  it("leaves ordinary names unchanged", async () => {
    await new SupabaseStorageClient().download("ds-1", "Data_Dictionary-2024.csv");
    assert(objectRequest("GET").endsWith("/datasets/ds-1/Data_Dictionary-2024.csv"));
  });
});

// Issue #3508, 19 Nov: resource uploads must never replace an existing file.
describe("SupabaseStorageClient.upload overwrite option", () => {
  const file = { originalname: "abcd.txt", buffer: new Uint8Array([1]).buffer, mimetype: "text/plain" };
  const uploadHeader = () =>
    requested.find((r) => r.method === "POST" && r.url.includes("/datasets/"))?.headers.get("x-upsert");

  it("overwrites by default, as other callers expect", async () => {
    await new SupabaseStorageClient().upload("ds-1", file);
    assertEquals(uploadHeader(), "true");
  });

  it("asks storage not to overwrite when told so", async () => {
    await new SupabaseStorageClient().upload("ds-1", file, undefined, "dataset", { overwrite: false });
    assertEquals(uploadHeader(), "false");
  });

  for (const [label, response] of [
    ["409", () => new Response('{"error":"Duplicate"}', { status: 409 })],
    ["400 with a Duplicate body", () =>
      new Response('{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}', { status: 400 })],
  ] as const) {
    it(`reports a taken name (${label}) as ObjectAlreadyExistsError`, async () => {
      objectUploadResponse = response;
      await assertRejects(
        () => new SupabaseStorageClient().upload("ds-1", file, undefined, "dataset", { overwrite: false }),
        ObjectAlreadyExistsError,
      );
    });
  }

  it("still reports other failures as a server error", async () => {
    objectUploadResponse = () => new Response("boom", { status: 500 });
    const error = await assertRejects(() =>
      new SupabaseStorageClient().upload("ds-1", file, undefined, "dataset", { overwrite: false })
    );
    assertEquals(error instanceof ObjectAlreadyExistsError, false);
  });
});

describe("SupabaseStorageClient object URLs, continued", () => {
  it("encodes the space and brackets of a numbered name", async () => {
    await new SupabaseStorageClient().download("ds-1", "abcd (1).txt");
    assert(objectRequest("GET").endsWith("/datasets/ds-1/abcd%20(1).txt"));
  });

  it("leaves ordinary names unchanged (download)", async () => {
    await new SupabaseStorageClient().download("ds-1", "Data_Dictionary-2024.csv");
    assert(objectRequest("GET").endsWith("/datasets/ds-1/Data_Dictionary-2024.csv"));
  });
});
