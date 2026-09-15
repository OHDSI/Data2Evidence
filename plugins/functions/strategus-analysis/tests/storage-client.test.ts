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
      "http://supabase-storage.test/object/bucket-a/id-1/results%2Ezip",
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
    const { readStream, contentType } = await client.download(
      "bucket-a",
      "id-1/results.zip",
    );
    assertEquals(contentType, "application/zip");
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

Deno.test("upload percent-encodes path segments so a dot-segment or reserved character can't change the request target", async () => {
  const client = new SupabaseStorageClient();
  let seenUrl = "";
  const f = fetchStub((url) => {
    seenUrl = url;
    return new Response("{}", { status: 200 });
  });

  try {
    // A path whose segments, if interpolated raw, would contain a dot-segment
    // plus reserved URL characters (?, #, space) that could otherwise change
    // the request target or collapse via dot-segment normalization.
    await client.upload("bucket a", "id-1/../weird?#name .zip", {
      fileName: "../weird?#name .zip",
      buffer: new Uint8Array([1]),
      mimetype: "application/zip",
    });
    assertEquals(
      seenUrl,
      "http://supabase-storage.test/object/bucket%20a/id-1/%2E%2E/weird%3F%23name%20%2Ezip",
    );
  } finally {
    f.restore();
  }
});
