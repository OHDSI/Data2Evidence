// @ts-nocheck - Deno edge function (trex EdgeRuntime).
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { gzipBytes, findResultsDb } from "./export.ts";

Deno.test("gzipBytes produces a gzip stream (magic bytes 1f 8b)", async () => {
  const out = await gzipBytes(new TextEncoder().encode("hello duckdb"));
  assertEquals(out[0], 0x1f);
  assertEquals(out[1], 0x8b);
});

Deno.test("gzip round-trips via DecompressionStream", async () => {
  const original = new TextEncoder().encode("SQLite format 3 ...");
  const gz = await gzipBytes(original);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"));
  const back = new Uint8Array(await new Response(stream).arrayBuffer());
  assertEquals(back, original);
});

Deno.test("findResultsDb picks the largest non-spec file", async () => {
  const dir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${dir}/spec.json`, "{}");
  await Deno.writeFile(`${dir}/small.txt`, new Uint8Array(10));
  await Deno.writeFile(`${dir}/results.duckdb`, new Uint8Array(5000));
  const found = await findResultsDb(dir);
  assertEquals(found, `${dir}/results.duckdb`);
});

Deno.test("findResultsDb honors an explicit override", async () => {
  const dir = await Deno.makeTempDir();
  await Deno.writeFile(`${dir}/a.duckdb`, new Uint8Array(9000));
  await Deno.writeFile(`${dir}/chosen.db`, new Uint8Array(10));
  const found = await findResultsDb(dir, "chosen.db");
  assertEquals(found, `${dir}/chosen.db`);
});

Deno.test("findResultsDb returns null for a missing override", async () => {
  const dir = await Deno.makeTempDir();
  assert((await findResultsDb(dir, "nope.db")) === null);
});

Deno.test("findResultsDb returns null when the dir does not exist", async () => {
  const found = await findResultsDb("/tmp/does-not-exist-" + "xyzzy-run");
  assert(found === null);
});
