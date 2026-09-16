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
