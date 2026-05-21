import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// The trex runtime injects `Trex` as a global and `LOGTO__ISSUER` via env.
// Stub them so the module graph loads under plain `deno test`.
(globalThis as any).Trex ??= { createRequestListener: () => {}, PluginManager: class {} };
if (!Deno.env.get("LOGTO__ISSUER")) Deno.env.set("LOGTO__ISSUER", "https://localhost/oidc");

const { discoverPlugins } = await import("../core/server/plugin/plugin.ts");

Deno.test("discoverPlugins reads every direct child with a package.json", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${tmp}/alpha`);
    await Deno.writeTextFile(`${tmp}/alpha/package.json`, JSON.stringify({ name: "@data2evidence/alpha", version: "1.0.0", trex: {} }));
    await Deno.mkdir(`${tmp}/beta`);
    await Deno.writeTextFile(`${tmp}/beta/package.json`, JSON.stringify({ name: "@data2evidence/beta", version: "1.0.0", trex: {} }));

    const found = await discoverPlugins([tmp]);
    assertEquals(found.map(p => p.pkg.name).sort(), ["@data2evidence/alpha", "@data2evidence/beta"]);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("discoverPlugins later-path entries override earlier ones by package name", async () => {
  const a = await Deno.makeTempDir();
  const b = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${a}/x`);
    await Deno.writeTextFile(`${a}/x/package.json`, JSON.stringify({ name: "@data2evidence/x", version: "1.0.0", trex: { tag: "bundled" } }));
    await Deno.mkdir(`${b}/x`);
    await Deno.writeTextFile(`${b}/x/package.json`, JSON.stringify({ name: "@data2evidence/x", version: "1.0.0", trex: { tag: "mounted" } }));

    const found = await discoverPlugins([a, b]);
    assertEquals(found.length, 1);
    assertEquals(found[0].pkg.trex.tag, "mounted");
    assertEquals(found[0].dir, `${b}/x`);
  } finally {
    await Deno.remove(a, { recursive: true });
    await Deno.remove(b, { recursive: true });
  }
});

Deno.test("discoverPlugins skips directories with no package.json", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${tmp}/no-pkg`);
    await Deno.mkdir(`${tmp}/ok`);
    await Deno.writeTextFile(`${tmp}/ok/package.json`, JSON.stringify({ name: "@data2evidence/ok", version: "1.0.0", trex: {} }));
    const found = await discoverPlugins([tmp]);
    assertEquals(found.map(p => p.pkg.name), ["@data2evidence/ok"]);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("discoverPlugins skips packages without a trex key", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${tmp}/no-trex`);
    await Deno.writeTextFile(`${tmp}/no-trex/package.json`, JSON.stringify({ name: "@data2evidence/no-trex", version: "1.0.0" }));
    await Deno.mkdir(`${tmp}/ok`);
    await Deno.writeTextFile(`${tmp}/ok/package.json`, JSON.stringify({ name: "@data2evidence/ok", version: "1.0.0", trex: {} }));
    const found = await discoverPlugins([tmp]);
    assertEquals(found.map(p => p.pkg.name), ["@data2evidence/ok"]);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("discoverPlugins skips paths that don't exist", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${tmp}/ok`);
    await Deno.writeTextFile(`${tmp}/ok/package.json`, JSON.stringify({ name: "@data2evidence/ok", version: "1.0.0", trex: {} }));
    const found = await discoverPlugins(["/nonexistent/path/that/does/not/exist", tmp]);
    assertEquals(found.map(p => p.pkg.name), ["@data2evidence/ok"]);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
