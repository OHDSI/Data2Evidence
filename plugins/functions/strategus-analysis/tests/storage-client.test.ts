import "./_setup.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  StorageError,
  SupabaseStorageClient,
} from "../src/storage/SupabaseStorageClient.ts";

function fetchStub(responder: (url: string, init: RequestInit) => Response) {
  return stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, init?: RequestInit) =>
      Promise.resolve(responder(String(input), init ?? {})),
  );
}

Deno.test("createBucket treats 409 as success", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("already exists", { status: 409 }));
  try {
    await client.createBucket("strategus-results-store");
  } finally {
    f.restore();
  }
});

Deno.test("createBucket raises a StorageError on a real failure", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("boom", { status: 500 }));
  try {
    const error = await assertRejects(
      () => client.createBucket("strategus-results-store"),
      StorageError,
    );
    assertEquals(error.statusCode, 502);
  } finally {
    f.restore();
  }
});

Deno.test("upload posts the buffer with an upsert header", async () => {
  const client = new SupabaseStorageClient();
  let seenUrl = "";
  let seenUpsert: string | null = null;
  const f = fetchStub((url, init) => {
    seenUrl = url;
    seenUpsert = (init.headers as Record<string, string>)["x-upsert"];
    return new Response("{}", { status: 200 });
  });

  try {
    const result = await client.upload("bucket-a", "id-1/results.zip", {
      fileName: "results.zip",
      buffer: new Uint8Array([1, 2, 3]),
      mimetype: "application/zip",
    });
    assertEquals(
      seenUrl,
      "http://supabase-storage.test/object/bucket-a/id-1/results.zip",
    );
    assertEquals(seenUpsert, "true");
    assertEquals(result, { bucket: "bucket-a", path: "id-1/results.zip" });
  } finally {
    f.restore();
  }
});

Deno.test("upload raises a StorageError on a non-ok response", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("boom", { status: 500 }));
  try {
    const error = await assertRejects(
      () =>
        client.upload("bucket-a", "id-1/results.zip", {
          fileName: "results.zip",
          buffer: new Uint8Array([1, 2, 3]),
          mimetype: "application/zip",
        }),
      StorageError,
    );
    assertEquals(error.statusCode, 502);
  } finally {
    f.restore();
  }
});

Deno.test("download returns the response stream", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() =>
    new Response(new Uint8Array([9, 9]), {
      status: 200,
      headers: { "content-type": "application/zip" },
    })
  );

  try {
    const { readStream } = await client.download(
      "bucket-a",
      "id-1/results.zip",
    );
    const chunks = [];
    for await (const chunk of readStream) chunks.push(...chunk);
    assertEquals(chunks, [9, 9]);
  } finally {
    f.restore();
  }
});

Deno.test("download maps a missing object to a 404 StorageError", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("not found", { status: 404 }));
  try {
    const error = await assertRejects(
      () => client.download("bucket-a", "id-1/results.zip"),
      StorageError,
    );
    assertEquals(error.statusCode, 404);
  } finally {
    f.restore();
  }
});

Deno.test("delete tolerates an object that is already gone", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("not found", { status: 404 }));
  try {
    await client.delete("bucket-a", "id-1/results.zip");
  } finally {
    f.restore();
  }
});

Deno.test("delete raises a StorageError on a real failure", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("boom", { status: 500 }));
  try {
    const error = await assertRejects(
      () => client.delete("bucket-a", "id-1/results.zip"),
      StorageError,
    );
    assertEquals(error.statusCode, 502);
  } finally {
    f.restore();
  }
});

Deno.test("upload rejects a path containing a literal '..' segment", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("{}", { status: 200 }));

  try {
    const error = await assertRejects(
      () =>
        client.upload(
          "strategus-results-store",
          "uuid-1/../../strategus-results/x.zip",
          {
            fileName: "x.zip",
            buffer: new Uint8Array([1]),
            mimetype: "application/zip",
          },
        ),
      StorageError,
    );
    assertEquals(error.statusCode, 404);
  } finally {
    f.restore();
  }
});

Deno.test("upload rejects a path containing a percent-encoded '..' segment", async () => {
  const client = new SupabaseStorageClient();
  const f = fetchStub(() => new Response("{}", { status: 200 }));

  try {
    // %2e%2e decodes to "..": if this were merely percent-encoded rather than
    // rejected outright, WHATWG dot-segment normalization would still collapse
    // it once fetch parses the URL - proving the old encode-around approach
    // never worked.
    await assertRejects(
      () =>
        client.upload("strategus-results-store", "uuid-1/%2e%2e", {
          fileName: "x.zip",
          buffer: new Uint8Array([1]),
          mimetype: "application/zip",
        }),
      StorageError,
    );
  } finally {
    f.restore();
  }
});

Deno.test("upload targets the real bucket/path even after URL parsing, for a benign name with reserved characters", async () => {
  const client = new SupabaseStorageClient();
  let seenUrl = "";
  const f = fetchStub((url) => {
    seenUrl = url;
    return new Response("{}", { status: 200 });
  });

  try {
    // Reserved URL characters (?, #, space) in an otherwise benign filename
    // must still be neutralized, and an ordinary "." must survive literally
    // so the stored object keeps its real extension.
    await client.upload("bucket a", "id-1/weird?#name .zip", {
      fileName: "weird?#name .zip",
      buffer: new Uint8Array([1]),
      mimetype: "application/zip",
    });
    // Assert on the parsed URL's pathname, not the raw string: parsing is
    // exactly where the previous "encode the dots" approach silently failed.
    assertEquals(
      new URL(seenUrl).pathname,
      "/object/bucket%20a/id-1/weird%3F%23name%20.zip",
    );
  } finally {
    f.restore();
  }
});
