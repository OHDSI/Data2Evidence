import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { SupabaseStorageClient } from "./supabase.storage.client.ts";

// Records every request instead of calling storage, and answers each with 200.
let requested: { method: string; url: string }[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  requested = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    requested.push({ method: init?.method ?? "GET", url: String(input) });
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
