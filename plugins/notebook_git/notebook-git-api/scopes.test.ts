import { assertEquals } from "jsr:@std/assert@1";

// Guards the route→scope policy in ../package.json.
//
// trex's pluginAuthz (the trusted-scope path this plugin uses) is FAIL-OPEN: a
// request whose path matches no REQUIRED_URL_SCOPES entry is passed straight
// through, so a missing or mis-anchored entry silently means "no authorization"
// rather than an error. It also collects the scopes of EVERY matching entry and
// requires only one of them, so an over-broad permissive entry weakens a strict
// one. Both failure modes are invisible at runtime, hence these assertions.

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
);
const entries: Array<{ path: string; scopes: string[]; httpMethods?: string[] }> =
  manifest.trex.functions.scopes;

const BASE = "/plugins/ohdsi/notebook-git-api";
const ID = "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8";

/** Mirrors pluginAuthz: union of the scopes of every entry matching path+method. */
function requiredScopes(method: string, path: string): string[] {
  const out = new Set<string>();
  for (const e of entries) {
    if (
      new RegExp(e.path).test(path) &&
      (!e.httpMethods || e.httpMethods.includes(method))
    ) {
      for (const s of e.scopes) out.add(s);
    }
  }
  return [...out].sort();
}

Deno.test("bulk overwrite demands system admin, with no weaker alternative", () => {
  // The destructive route: it rewrites every notebook from the repo. Any second
  // scope here would be a way around the restriction, because pluginAuthz needs
  // only ONE of the collected scopes.
  assertEquals(
    requiredScopes("POST", `${BASE}/overwrite-all-from-remote`),
    ["portal.notebook.systemAdmin.write"],
  );
});

Deno.test("a query string cannot slip past the bulk-overwrite rule", () => {
  // pluginAuthz matches req.originalUrl, which includes the query string, so a
  // `$`-anchored pattern would not match and fail-open would let the call run.
  assertEquals(
    requiredScopes("POST", `${BASE}/overwrite-all-from-remote?x=1`),
    ["portal.notebook.systemAdmin.write"],
  );
});

Deno.test("reads require the read scope", () => {
  for (const path of [`${BASE}/templates`, `${BASE}/${ID}/remote-diff-check`]) {
    const scopes = requiredScopes("GET", path);
    assertEquals(scopes.includes("portal.notebook.read"), true, path);
  }
});

Deno.test("per-notebook writes require the update scope", () => {
  for (const path of [`${BASE}/${ID}/mirror`, `${BASE}/${ID}/overwrite-from-remote`]) {
    const scopes = requiredScopes("POST", path);
    assertEquals(scopes.includes("portal.notebook.update"), true, path);
  }
});

Deno.test("an unlisted route defaults to system admin, not to open", () => {
  // Without the backstop entry this returns [] — which pluginAuthz treats as
  // "no policy, allow" — so any route added later would ship unauthorized.
  assertEquals(
    requiredScopes("GET", `${BASE}/some-route-added-later`),
    ["portal.notebook.systemAdmin.write"],
  );
});

Deno.test("every route the router serves is covered by some entry", () => {
  const routes: Array<[string, string]> = [
    ["GET", `${BASE}/templates`],
    ["GET", `${BASE}/${ID}/remote-diff-check`],
    ["POST", `${BASE}/${ID}/mirror`],
    ["POST", `${BASE}/${ID}/overwrite-from-remote`],
    ["POST", `${BASE}/overwrite-all-from-remote`],
  ];
  for (const [method, path] of routes) {
    assertEquals(requiredScopes(method, path).length > 0, true, `${method} ${path}`);
  }
});
