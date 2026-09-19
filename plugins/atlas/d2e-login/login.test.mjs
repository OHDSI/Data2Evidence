import { assertEquals } from "jsr:@std/assert";

/*
 * login.js is a plain script (not a module) that wires itself up against
 * `document`/`window`/`location` as soon as it is loaded. To exercise it
 * under Deno we stub just the handful of DOM bits it touches and import the
 * real file — a query string per test forces Deno to re-evaluate it instead
 * of reusing a cached module instance.
 */
function stubDocument() {
  var elements = new Map();
  function makeElement(id) {
    var el = {
      id: id,
      value: "",
      textContent: "",
      disabled: false,
      hidden: false,
      className: "",
      href: "",
      listeners: {},
      addEventListener: function (type, handler) { el.listeners[type] = handler; },
      appendChild: function () {},
    };
    return el;
  }
  ["form", "identifier", "password", "submit", "error", "providers", "divider"].forEach(function (id) {
    elements.set(id, makeElement(id));
  });
  return {
    elements: elements,
    getElementById: function (id) { return elements.get(id); },
    createElement: function () { return { className: "", href: "", textContent: "" }; },
  };
}

Deno.test("the password form still wires up when providers.js has not loaded", async () => {
  var doc = stubDocument();
  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.location = { origin: "http://localhost", search: "", pathname: "/atlas/d2e-login/", hash: "" };
  // Simulate providers.js never having run (a failed or blocked request for
  // that script), which is the scenario under test.
  delete globalThis.D2ELoginProviders;

  // Must not throw: an unguarded dereference of the missing providers module
  // would abort the script before form.addEventListener runs below.
  await import("./login.js?providers-missing");

  var form = doc.elements.get("form");
  assertEquals(typeof form.listeners.submit, "function");
});

Deno.test("an unexpected /settings shape is logged instead of swallowed silently", async () => {
  var doc = stubDocument();
  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.location = { origin: "http://localhost", search: "", pathname: "/atlas/d2e-login/", hash: "" };
  await import("./providers.js");

  var warnings = [];
  var originalWarn = console.warn;
  var originalFetch = globalThis.fetch;
  console.warn = function () { warnings.push(Array.prototype.slice.call(arguments)); };
  // trex's real /settings response is { external: {...} }; this stands in
  // for a contract change that drops or reshapes that key.
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ unexpected: true }); } });
  };

  try {
    await import("./login.js?unexpected-settings-shape");
    // Flush the fetch().then().then() chain, which resolves over a couple of
    // microtask turns.
    await new Promise(function (r) { setTimeout(r, 0); });
    await new Promise(function (r) { setTimeout(r, 0); });
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }

  assertEquals(warnings.length > 0, true);
});

function memoryStorage(initial) {
  var data = Object.assign({}, initial);
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    data: data,
  };
}

/*
 * Deno exposes sessionStorage as a getter/setter pair whose setter discards
 * what it is handed, so a plain assignment leaves login.js reading Deno's own
 * process-wide storage — shared by every test, and carrying whatever an
 * earlier redirect wrote into it. Replacing the accessor with a data property
 * is what actually gives each test the storage it asked for.
 */
function installSessionStorage(storage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
}

async function loadWithSettings(tag, settings, opts) {
  var o = opts || {};
  var doc = stubDocument();
  var replaced = [];
  globalThis.document = doc;
  globalThis.window = globalThis;
  installSessionStorage(o.storage || memoryStorage());
  globalThis.location = {
    origin: "http://localhost",
    search: o.search || "",
    pathname: "/atlas/d2e-login/",
    hash: "",
    replace: function (url) { replaced.push(url); },
  };
  doc.replaced = replaced;
  await import("./providers.js?" + tag);
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(settings); } });
  };
  try {
    await import("./login.js?" + tag);
    await new Promise(function (r) { setTimeout(r, 0); });
    await new Promise(function (r) { setTimeout(r, 0); });
  } finally {
    globalThis.fetch = originalFetch;
  }
  doc.elements.replaced = replaced;
  return doc.elements;
}

const FEDERATED = { external: { email: false, logto: true } };
const LOGTO_AUTHORIZE = "/trex/auth/v1/authorize?provider=logto&redirect_to=%2Fatlas%2F";

// The logto-federated compose overlay's default, shown on request: only the Logto button.
Deno.test("native sign-in off hides the password form and the divider", async () => {
  var el = await loadWithSettings("native-off", FEDERATED, { search: "?manual" });
  assertEquals(el.replaced, []);
  assertEquals(el.get("form").hidden, true);
  assertEquals(el.get("divider").hidden, true);
  assertEquals(el.get("error").textContent, "");
});

Deno.test("with Logto as the only way in, the page sends the browser straight there", async () => {
  var el = await loadWithSettings("auto-redirect", FEDERATED);
  assertEquals(el.replaced, [LOGTO_AUTHORIZE]);
});

Deno.test("a refused sign-in is shown, not redirected again", async () => {
  var el = await loadWithSettings("auto-refused", FEDERATED, { search: "?error=no_account" });
  assertEquals(el.replaced, []);
  assertEquals(el.get("error").textContent, "No D2E account is linked to this sign-in. Ask your administrator.");
});

Deno.test("a second arrival within the guard window shows the page instead of looping", async () => {
  var storage = memoryStorage({ d2e_login_auto_redirect_ts: String(Date.now()) });
  var el = await loadWithSettings("auto-loop", FEDERATED, { storage: storage });
  assertEquals(el.replaced, []);
  assertEquals(el.get("form").hidden, true);
});

Deno.test("without usable sessionStorage there is no loop guard, so the page is shown", async () => {
  var broken = { getItem: function () { throw new Error("blocked"); }, setItem: function () { throw new Error("blocked"); } };
  var el = await loadWithSettings("auto-nostorage", FEDERATED, { storage: broken });
  assertEquals(el.replaced, []);
});

Deno.test("password sign-in on means no automatic redirect, even with one provider", async () => {
  var el = await loadWithSettings("auto-native-on", { external: { email: true, logto: true } });
  assertEquals(el.replaced, []);
});

Deno.test("native sign-in on keeps the form, with the divider under the Logto button", async () => {
  var el = await loadWithSettings("native-on", { external: { email: true, logto: true } });
  assertEquals(el.get("form").hidden, false);
  assertEquals(el.get("divider").hidden, false);
});

Deno.test("no provider and native sign-in off says so instead of rendering an empty page", async () => {
  var el = await loadWithSettings("nothing", { external: { email: false } });
  assertEquals(el.get("form").hidden, true);
  assertEquals(el.get("error").textContent, "No sign-in method is available. Ask your administrator.");
});

// A login redirect as trex's provider emits it: the whole authorization
// request re-serialized and signed, with no return_to anywhere in it.
const SIGNED_SEARCH = "?response_type=code&client_id=d2e-webapi&state=s" +
  "&exp=1800000600&ba_iat=1800000000000" +
  "&ba_param=response_type&ba_param=client_id&ba_param=state" +
  "&ba_param=exp&ba_param=ba_iat&ba_param=ba_param&sig=Ab%2Bc%2Fd%3D%3D";
const AUTHORIZE_BOUNCE = "/trex/oidc/oauth2/authorize" + SIGNED_SEARCH;

/*
 * Drives the page all the way through a successful password sign-in, which is
 * the only way to observe where it sends the browser afterwards.
 */
async function signInWith(tag, opts) {
  var o = opts || {};
  var doc = stubDocument();
  var replaced = [];
  globalThis.document = doc;
  globalThis.window = globalThis;
  installSessionStorage(memoryStorage());
  globalThis.location = {
    origin: "http://localhost",
    search: o.search || "",
    pathname: "/atlas/d2e-login/",
    hash: "",
    replace: function (url) { replaced.push(url); },
  };
  if (o.withoutProviders) delete globalThis.D2ELoginProviders;
  else await import("./providers.js?" + tag);
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function (url) {
    var u = String(url);
    if (u.indexOf("/settings") !== -1) {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ external: { email: true } }); } });
    }
    if (u.indexOf("/sync-cookie") !== -1) return Promise.resolve({ ok: true });
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ access_token: "t" }); } });
  };
  try {
    await import("./login.js?" + tag);
    doc.elements.get("identifier").value = "alice";
    doc.elements.get("password").value = "pw";
    doc.elements.get("form").listeners.submit({ preventDefault: function () {} });
    // The submit handler chains fetch → json → fetch → replace, which settles
    // over several microtask turns.
    for (var i = 0; i < 6; i++) await new Promise(function (r) { setTimeout(r, 0); });
  } finally {
    globalThis.fetch = originalFetch;
  }
  return replaced;
}

Deno.test("after signing in the browser goes back to the authorization query it arrived with", async () => {
  assertEquals(await signInWith("bounce-signed", { search: SIGNED_SEARCH }), [AUTHORIZE_BOUNCE]);
});

Deno.test("signing in on a page nobody was redirected to lands on atlas", async () => {
  assertEquals(await signInWith("bounce-bare", {}), ["/atlas/"]);
});

Deno.test("the old return_to is no longer followed", async () => {
  // It used to be the destination, guarded by a same-origin check. The
  // provider does not send it, so an unsigned query is not a sign-in in
  // progress at all.
  assertEquals(await signInWith("bounce-return-to", { search: "?return_to=%2Fevil" }), ["/atlas/"]);
});

Deno.test("a failed providers.js load still signs in, falling back to atlas", async () => {
  assertEquals(
    await signInWith("bounce-no-providers", { search: SIGNED_SEARCH, withoutProviders: true }),
    ["/atlas/"],
  );
});

Deno.test("the federated round trip returns to the authorization query, not to atlas", async () => {
  var el = await loadWithSettings("signed-federated", FEDERATED, { search: SIGNED_SEARCH });
  assertEquals(el.replaced, [
    "/trex/auth/v1/authorize?provider=logto&redirect_to=" + encodeURIComponent(AUTHORIZE_BOUNCE),
  ]);
});
