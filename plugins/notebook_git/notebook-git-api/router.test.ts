import { assertEquals } from "jsr:@std/assert@1";
import { handleRequest, type RouterDeps } from "./router.ts";

// Root-form route, as d2e serves it. `relativePath()` uses lastIndexOf(PREFIX),
// so it also tolerates the standalone host's doubled /plugins/<s>/<s> form.
const BASE = "http://x/notebook-git-api";
const ID = "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8";

const row = {
  id: ID, name: "My nb", description: "d",
  content: { cells: [], metadata: {} }, deletedAt: null,
};

function req(path: string, method = "GET", userId: string | null = "u1"): Request {
  const headers: Record<string, string> = {};
  if (userId) headers["x-user-id"] = userId;
  return new Request(`${BASE}${path}`, { method, headers });
}

function deps(over: Partial<RouterDeps> = {}): RouterDeps {
  return {
    loadConfig: async () => ({ repoDir: "./R", repoUrl: "https://x/y.git", branch: "main" }),
    makeGit: () => ({
      ensureLatest: async () => {},
      readFile: async () => JSON.stringify({ name: row.name, description: row.description, content: row.content }),
      listFiles: async () => [`${ID}.json`],
      saveFile: async () => {},
      deleteFile: async () => {},
    }),
    readNotebook: async () => row,
    writeNotebook: async () => {},
    listTemplates: async () => [],
    ...over,
  };
}

Deno.test("401 without x-user-id", async () => {
  const res = await handleRequest(req(`/${ID}/mirror`, "POST", null), deps());
  assertEquals(res.status, 401);
});

Deno.test("401 without x-user-id for templates", async () => {
  const res = await handleRequest(req("/templates", "GET", null), deps());
  assertEquals(res.status, 401);
});

Deno.test("404 for an unknown path", async () => {
  const res = await handleRequest(req("/nope"), deps());
  assertEquals(res.status, 404);
});

Deno.test("mirror is skipped when git is not configured", async () => {
  const res = await handleRequest(
    req(`/${ID}/mirror`, "POST"),
    deps({ loadConfig: async () => null }),
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "skipped");
});

Deno.test("mirror saves the notebook file", async () => {
  let saved: { name: string; content: string } | null = null;
  const res = await handleRequest(req(`/${ID}/mirror`, "POST"), deps({
    makeGit: () => ({
      ensureLatest: async () => {}, readFile: async () => "", listFiles: async () => [],
      saveFile: async (name: string, content: string) => { saved = { name, content }; },
      deleteFile: async () => {},
    }),
  }));
  assertEquals(res.status, 200);
  assertEquals(saved?.name, `${ID}.json`);
  assertEquals(JSON.parse(saved!.content).name, "My nb");
});

Deno.test("mirror deletes the file for a soft-deleted notebook", async () => {
  let deleted: string | null = null;
  await handleRequest(req(`/${ID}/mirror`, "POST"), deps({
    readNotebook: async () => ({ ...row, deletedAt: "2026-09-01T00:00:00Z" }),
    makeGit: () => ({
      ensureLatest: async () => {}, readFile: async () => "", listFiles: async () => [],
      saveFile: async () => {},
      deleteFile: async (name: string) => { deleted = name; },
    }),
  }));
  assertEquals(deleted, `${ID}.json`);
});

Deno.test("mirror 404s for a notebook that does not exist", async () => {
  const res = await handleRequest(
    req(`/${ID}/mirror`, "POST"),
    deps({ readNotebook: async () => null }),
  );
  assertEquals(res.status, 404);
});

Deno.test("diff-check reports no differences when git is unconfigured", async () => {
  const res = await handleRequest(
    req(`/${ID}/remote-diff-check`),
    deps({ loadConfig: async () => null }),
  );
  const body = await res.json();
  assertEquals(body.hasDifferences, false);
  assertEquals(body.reason, "Git config not set");
});

Deno.test("diff-check reports no differences for key-reordered remote content", async () => {
  const res = await handleRequest(req(`/${ID}/remote-diff-check`), deps({
    makeGit: () => ({
      ensureLatest: async () => {},
      // same content, keys reversed — must NOT be reported as a difference
      readFile: async () => JSON.stringify({ content: { metadata: {}, cells: [] }, description: "d", name: "My nb" }),
      listFiles: async () => [], saveFile: async () => {}, deleteFile: async () => {},
    }),
  }));
  assertEquals((await res.json()).hasDifferences, false);
});

Deno.test("diff-check reports a difference when remote content differs", async () => {
  const res = await handleRequest(req(`/${ID}/remote-diff-check`), deps({
    makeGit: () => ({
      ensureLatest: async () => {},
      readFile: async () => JSON.stringify({ name: "My nb", description: "d", content: { cells: [{ id: "c1" }], metadata: {} } }),
      listFiles: async () => [], saveFile: async () => {}, deleteFile: async () => {},
    }),
  }));
  assertEquals((await res.json()).hasDifferences, true);
});

Deno.test("diff-check reports no differences when the file is absent from the repo", async () => {
  const res = await handleRequest(req(`/${ID}/remote-diff-check`), deps({
    makeGit: () => ({
      ensureLatest: async () => {},
      readFile: async () => { throw new Error("not found"); },
      listFiles: async () => [], saveFile: async () => {}, deleteFile: async () => {},
    }),
  }));
  const body = await res.json();
  assertEquals(body.hasDifferences, false);
  assertEquals(body.reason, "Notebook not found in remote repository");
});

Deno.test("overwrite-from-remote writes the row when content differs", async () => {
  let written: unknown = null;
  const res = await handleRequest(req(`/${ID}/overwrite-from-remote`, "POST"), deps({
    makeGit: () => ({
      ensureLatest: async () => {},
      readFile: async () => JSON.stringify({ name: "Remote", description: "rd", content: { cells: [{ id: "c9" }] } }),
      listFiles: async () => [], saveFile: async () => {}, deleteFile: async () => {},
    }),
    writeNotebook: async (_id: string, f: unknown) => { written = f; },
  }));
  assertEquals((await res.json()).overwritten, true);
  assertEquals((written as { name: string }).name, "Remote");
});

Deno.test("overwrite-from-remote is a no-op when content is identical", async () => {
  let called = false;
  const res = await handleRequest(req(`/${ID}/overwrite-from-remote`, "POST"), deps({
    writeNotebook: async () => { called = true; },
  }));
  assertEquals((await res.json()).overwritten, false);
  assertEquals(called, false);
});

Deno.test("overwrite-all-from-remote processes every json file", async () => {
  const writes: string[] = [];
  const res = await handleRequest(req("/overwrite-all-from-remote", "POST"), deps({
    makeGit: () => ({
      ensureLatest: async () => {},
      readFile: async () => JSON.stringify({ name: "R", description: "", content: { cells: [{ id: "z" }] } }),
      listFiles: async () => [`${ID}.json`, "aaaa.json"],
      saveFile: async () => {}, deleteFile: async () => {},
    }),
    writeNotebook: async (id: string) => { writes.push(id); },
  }));
  assertEquals(res.status, 200);
  assertEquals((await res.json()).processed, 2);
  assertEquals(writes.length, 2);
});

Deno.test("GET /templates returns 200 [] when the template repo is not configured", async () => {
  const res = await handleRequest(req("/templates"), deps({ listTemplates: async () => [] }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), []);
});

Deno.test("GET /templates forwards the parsed list from deps.listTemplates", async () => {
  const templates = [
    { id: "t1", name: "T1", description: "d1", content: { cells: [] } },
  ];
  const res = await handleRequest(req("/templates"), deps({ listTemplates: async () => templates }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), templates);
});
