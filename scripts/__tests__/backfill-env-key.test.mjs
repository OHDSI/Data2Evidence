import { assertEquals, assertMatch } from "jsr:@std/assert";
import { backfillEnvKey } from "../idp-mode-env.ts";

const K = "TREX__SQL_TOKEN";
const gen = () => "Abc123XyZ";

Deno.test("missing key is appended once with a non-empty alphanumeric value", () => {
  const out = backfillEnvKey("A=1\nB=2", K, gen);
  assertEquals(out.added, true);
  assertEquals(out.content, "A=1\nB=2\nTREX__SQL_TOKEN=Abc123XyZ\n");
  assertMatch(out.content, /^TREX__SQL_TOKEN=[A-Za-z0-9]+$/m);
});

Deno.test("present key leaves the file unchanged", () => {
  const c = "A=1\nTREX__SQL_TOKEN=keep\n";
  const out = backfillEnvKey(c, K, gen);
  assertEquals(out, { content: c, added: false });
});

Deno.test("empty value is filled without leaving a duplicate", () => {
  const out = backfillEnvKey("A=1\nTREX__SQL_TOKEN=\nB=2\n", K, gen);
  assertEquals(out.added, true);
  assertEquals(out.content.match(/^TREX__SQL_TOKEN=/gm)?.length, 1);
  assertEquals(out.content, "A=1\nB=2\nTREX__SQL_TOKEN=Abc123XyZ\n");
});

Deno.test("running twice is idempotent", () => {
  const once = backfillEnvKey("A=1\n", K, gen);
  const twice = backfillEnvKey(once.content, K, () => "other");
  assertEquals(twice, { content: once.content, added: false });
});
