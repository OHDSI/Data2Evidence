/**
 * URL-shape test for buildDeepLinkUrl: the generated link must target the
 * Atlas Patient Analytics hash route with the payload inside the hash query,
 * and the compressed bookmark must round-trip.
 *
 * Run: deno test --allow-read --sloppy-imports --no-check src/lib/cohortDeepLink.test.ts
 */

import { buildDeepLinkUrl, decompress } from "./cohortDeepLink.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}
function eq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `ASSERT FAILED: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("buildDeepLinkUrl targets the Atlas PA hash route", () => {
  const bookmark = { hello: "world", n: 1 };
  const { url, tooLong } = buildDeepLinkUrl(bookmark, "dataset-B");

  eq(tooLong, false, "short link must not warn");

  const prefix = "/atlas/#/plugins/patient-analytics/?";
  assert(
    url.startsWith(prefix),
    `url must start with the Atlas PA hash route, got ${url}`,
  );
  assert(
    !url.includes("/d2e/portal/researcher/cohort"),
    "url must not target the retired researcher route",
  );

  // Params live inside the hash query.
  const hashQuery = url.slice(prefix.length);
  const params = new URLSearchParams(hashQuery);
  eq(params.get("datasetId"), "dataset-B", "datasetId param");
  eq(params.get("linkType"), "cohort-definition", "linkType param");
  const query = params.get("query");
  assert(query && query.length > 0, "query param must be present");

  // The compressed bookmark round-trips.
  const decoded = decompress<typeof bookmark>(query!);
  eq(decoded.hello, "world", "round-trip hello");
  eq(decoded.n, 1, "round-trip n");
});

Deno.test("buildDeepLinkUrl encodes datasetId and flags long URLs", () => {
  const { url } = buildDeepLinkUrl({ a: 1 }, "ds/with spaces&=");
  const params = new URLSearchParams(
    url.slice("/atlas/#/plugins/patient-analytics/?".length),
  );
  eq(params.get("datasetId"), "ds/with spaces&=", "datasetId must be encoded");

  // Incompressible data: random bytes deflate to ~their own size.
  const randomBytes = new Uint8Array(4000);
  crypto.getRandomValues(randomBytes);
  const huge = { pad: Array.from(randomBytes).join(",") };
  const long = buildDeepLinkUrl(huge, "ds");
  eq(long.tooLong, true, "huge bookmark must set tooLong");
});
