import { assertEquals } from "jsr:@std/assert";
import "./providers.js";

const P = globalThis.D2ELoginProviders;

Deno.test("the password form is hidden only when trex explicitly turns native sign-in off", () => {
  assertEquals(P.passwordLoginEnabled({ external: { email: false, logto: true } }), false);
  assertEquals(P.passwordLoginEnabled({ external: { email: true, logto: true } }), true);
  // Anything short of an explicit false keeps a trex-only installation's only way in.
  assertEquals(P.passwordLoginEnabled({ external: {} }), true);
  assertEquals(P.passwordLoginEnabled({}), true);
  assertEquals(P.passwordLoginEnabled(null), true);
});

Deno.test("only enabled external providers become buttons; email is the password form", () => {
  assertEquals(P.externalProviders({ external: { email: true, logto: true, entra: false } }), [
    { id: "logto", label: "Logto" },
  ]);
  assertEquals(P.externalProviders({}), []);
  assertEquals(P.externalProviders(null), []);
});

// Pins the exact literal response trex's GET /trex/auth/v1/settings returns
// today, verified directly against the trex branch (OHDSI/trex#318): this is
// the contract login.js's fetch depends on. If trex's shape ever changes,
// this is the test that should catch it.
Deno.test("trex's /trex/auth/v1/settings shape yields exactly one Logto provider", () => {
  assertEquals(P.externalProviders({ external: { email: true, logto: true } }), [
    { id: "logto", label: "Logto" },
  ]);
});

Deno.test("an unknown provider id is shown capitalised", () => {
  assertEquals(P.externalProviders({ external: { physionet: true } }), [{ id: "physionet", label: "Physionet" }]);
});

Deno.test("auto-redirect only when a single provider is the only way in", () => {
  const federated = { external: { email: false, logto: true } };
  assertEquals(P.autoRedirectProvider(federated, {}), "logto");
  assertEquals(P.autoRedirectProvider(federated), "logto");
  // A password form is a second way in.
  assertEquals(P.autoRedirectProvider({ external: { email: true, logto: true } }, {}), null);
  // Two providers need a choice.
  assertEquals(P.autoRedirectProvider({ external: { email: false, logto: true, entra: true } }, {}), null);
  // Nothing to redirect to.
  assertEquals(P.autoRedirectProvider({ external: { email: false } }, {}), null);
  // A refusal must be read, and `manual` keeps the page.
  assertEquals(P.autoRedirectProvider(federated, { error: "no_account" }), null);
  assertEquals(P.autoRedirectProvider(federated, { manual: true }), null);
  // An unreadable settings answer keeps the password form, so no redirect.
  assertEquals(P.autoRedirectProvider(null, {}), null);
});

Deno.test("the authorize link carries the provider and the return path", () => {
  assertEquals(
    P.authorizeHref("logto", "/trex/oidc/oauth2/authorize?client_id=x&state=y"),
    "/trex/auth/v1/authorize?provider=logto&redirect_to=%2Ftrex%2Foidc%2Foauth2%2Fauthorize%3Fclient_id%3Dx%26state%3Dy",
  );
});

Deno.test("refusal codes get a readable message; no code means no message", () => {
  assertEquals(P.errorMessage("no_account"), "No D2E account is linked to this sign-in. Ask your administrator.");
  assertEquals(P.errorMessage("account_disabled"), "This account is deactivated.");
  assertEquals(P.errorMessage("something_else"), "Sign-in failed. Please try again.");
  assertEquals(P.errorMessage(null), null);
});

// One measured login redirect, in the serialization order the provider emits
// (@better-auth/oauth-provider 1.7.5): only the parameters that were actually
// sent, `exp` in seconds and `ba_iat` in milliseconds, one `ba_param` per
// signed name including itself, and `sig` — standard base64, so `+`, `/` and
// `=` percent-encoded — last and unsigned.
const SIGNED_QUERY = "?response_type=code" +
  "&redirect_uri=https%3A%2F%2Flocalhost%3A8443%2Fatlas-login%2F" +
  "&scope=openid+profile+email&state=s&client_id=d2e-webapi" +
  "&code_challenge=c&code_challenge_method=S256" +
  "&exp=1800000600&ba_iat=1800000000000" +
  "&ba_param=response_type&ba_param=redirect_uri&ba_param=scope&ba_param=state" +
  "&ba_param=client_id&ba_param=code_challenge&ba_param=code_challenge_method" +
  "&ba_param=exp&ba_param=ba_iat&ba_param=ba_param" +
  "&sig=Ab%2Bc%2Fd%3D%3D";

Deno.test("the continue URL is the authorize endpoint carrying the query verbatim", () => {
  // The provider re-serializes whatever the relying party sent; there is no
  // fixed list. Rebuilding the query from expected names would silently drop
  // whatever a future relying party adds.
  assertEquals(P.continueUrl(SIGNED_QUERY), "/trex/oidc/oauth2/authorize" + SIGNED_QUERY);
});

Deno.test("the query is handed back byte for byte, never re-encoded", () => {
  // encodeURIComponent leaves ~!'() alone where form-urlencoding escapes them,
  // so anything that parses the query and re-serializes it changes these bytes.
  // The provider signed the bytes it sent, and `sig` is standard base64 rather
  // than base64url, so the only safe transform is none.
  const search = "?state=a~b!c'd&nonce=%2Fn%2B&sig=Ab%2Bc%2Fd%3D%3D";
  assertEquals(P.continueUrl(search), "/trex/oidc/oauth2/authorize" + search);
});

Deno.test("prompt is stripped, so a prompt=login request cannot loop through this page", () => {
  // Measured: bouncing `prompt=login` back verbatim with a live session
  // redirects here again, forever. Removing it yields the code. It invalidates
  // `sig`, which /oauth2/authorize never verifies — and which is why this page
  // may only ever bounce there, not to /oauth2/consent or /oauth2/continue.
  const url = P.continueUrl("?client_id=x&prompt=login&sig=Ab%2Bc%2Fd%3D%3D");
  assertEquals(url, "/trex/oidc/oauth2/authorize?client_id=x&sig=Ab%2Bc%2Fd%3D%3D");
  assertEquals(new URL(url, "https://h").searchParams.has("prompt"), false);
});

Deno.test("a page reached with no authorization query falls back to atlas", () => {
  assertEquals(P.continueUrl(""), "/atlas/");
  assertEquals(P.continueUrl(undefined), "/atlas/");
  assertEquals(P.continueUrl("?"), "/atlas/");
  assertEquals(P.continueUrl("?manual"), "/atlas/");
});

Deno.test("a query with no signature is not an authorization request", () => {
  // The page used to follow ?return_to=, which is why it needed an
  // open-redirect check. It no longer reads it at all.
  assertEquals(P.continueUrl("?return_to=%2Fevil"), "/atlas/");
  assertEquals(P.continueUrl("?return_to=https%3A%2F%2Fevil.example%2F"), "/atlas/");
});

Deno.test("the destination is a constant, so a signed query cannot redirect elsewhere", () => {
  // return_to rides along as one more inert parameter: the path is fixed.
  assertEquals(
    P.continueUrl("?sig=x&return_to=https%3A%2F%2Fevil.example%2F"),
    "/trex/oidc/oauth2/authorize?sig=x&return_to=https%3A%2F%2Fevil.example%2F",
  );
});

Deno.test("prompt is the only parameter ever removed", () => {
  // Pins the set of removals at exactly one. `manual` is this page's own
  // parameter and looks droppable, but nothing measured says the provider
  // minds it, and a second removal would need its own measurement.
  const names = [
    "response_type", "redirect_uri", "scope", "state", "nonce", "client_id",
    "prompt", "manual", "error", "return_to", "login_hint", "resource",
    "exp", "ba_iat", "ba_param", "sig",
  ];
  const kept = new URL(P.continueUrl("?" + names.map((n) => n + "=v").join("&")), "https://h");
  assertEquals([...kept.searchParams.keys()], names.filter((n) => n !== "prompt"));
});

// trex's federation refuses a sign-in with
// `<login page>?error=<code>&return_to=<the query it was handed>`
// (core/server/auth/federation/request.ts:refusalRedirect), built with
// URL.searchParams, so the signed authorization request survives one level of
// percent-encoding down. These build the wrapper the same way trex does.
function refusal(code, returnTo) {
  const url = new URL("https://host/d2e-login/");
  url.searchParams.set("error", code);
  url.searchParams.set("return_to", returnTo);
  return url.search;
}

Deno.test("a federation refusal resumes the authorization request it wrapped", () => {
  // Without unwrapping, a refused Logto sign-in costs the whole authorization
  // request: the retry button and the password form would both land on
  // /atlas/ and the relying party would have to start over.
  assertEquals(
    P.continueUrl(refusal("no_account", "/trex/oidc/oauth2/authorize" + SIGNED_QUERY)),
    "/trex/oidc/oauth2/authorize" + SIGNED_QUERY,
  );
});

Deno.test("only the wrapped query is taken, never the wrapped path", () => {
  // return_to is reachable by anyone who can link to this page, so the
  // destination stays the constant even one level down.
  assertEquals(
    P.continueUrl(refusal("no_account", "https://evil.example/go?sig=abc&client_id=c")),
    "/trex/oidc/oauth2/authorize?sig=abc&client_id=c",
  );
});

Deno.test("prompt is stripped out of a wrapped query too", () => {
  assertEquals(
    P.continueUrl(refusal("no_account", "/trex/oidc/oauth2/authorize?prompt=login&sig=abc")),
    "/trex/oidc/oauth2/authorize?sig=abc",
  );
});

Deno.test("an ordinary return_to is still not an authorization request", () => {
  assertEquals(P.continueUrl(refusal("no_account", "/atlas/")), "/atlas/");
  assertEquals(P.continueUrl(refusal("no_account", "/atlas/?tab=cohorts")), "/atlas/");
  assertEquals(P.continueUrl("?error=no_account"), "/atlas/");
});
