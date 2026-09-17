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
    P.authorizeHref("logto", "/trex/oidc/authorize?client_id=x&state=y"),
    "/trex/auth/v1/authorize?provider=logto&redirect_to=%2Ftrex%2Foidc%2Fauthorize%3Fclient_id%3Dx%26state%3Dy",
  );
});

Deno.test("refusal codes get a readable message; no code means no message", () => {
  assertEquals(P.errorMessage("no_account"), "No D2E account is linked to this sign-in. Ask your administrator.");
  assertEquals(P.errorMessage("account_disabled"), "This account is deactivated.");
  assertEquals(P.errorMessage("something_else"), "Sign-in failed. Please try again.");
  assertEquals(P.errorMessage(null), null);
});
