// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Routing for the notebook git mirror, kept separate from index.ts so it can be
// unit-tested without a live Deno.serve (same split hades-api uses).
//
// Mirrors the React implementation's contract (plugins/functions/portal/src/
// notebook/notebook.service.ts) so both clients see the same response shapes.
import { contentEquals } from "./diff.ts";
import type { GitConfig } from "./git.ts";
import type { NotebookRow } from "./notebooks.ts";
import type { NotebookTemplate } from "./templates.ts";

const PREFIX = "/notebook-git-api";
const JSON_FILE_FILTER = /\.json$/;

export interface GitLike {
  ensureLatest(): Promise<void>;
  readFile(name: string): Promise<string>;
  listFiles(filter?: RegExp): Promise<string[]>;
  saveFile(name: string, content: string, message: string): Promise<void>;
  deleteFile(name: string, message: string): Promise<void>;
}

export interface RouterDeps {
  loadConfig: () => Promise<GitConfig | null>;
  makeGit: (cfg: GitConfig) => GitLike;
  readNotebook: (id: string) => Promise<NotebookRow | null>;
  writeNotebook: (
    id: string,
    fields: { name: string; description: string; content: unknown },
  ) => Promise<void>;
  listTemplates: () => Promise<NotebookTemplate[]>;
}

interface RemoteFile {
  name?: string;
  description?: string;
  content?: unknown;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function relativePath(url: URL): string {
  const idx = url.pathname.lastIndexOf(PREFIX);
  let path = idx === -1 ? url.pathname : url.pathname.slice(idx + PREFIX.length);
  if (!path.startsWith("/")) path = "/" + path;
  return path;
}

const fileNameFor = (id: string) => `${id}.json`;

export async function handleRequest(req: Request, deps: RouterDeps): Promise<Response> {
  if (!req.headers.get("x-user-id")) return json({ error: "UNAUTHORIZED" }, 401);

  const path = relativePath(new URL(req.url));

  try {
    const mirror = path.match(/^\/([^/]+)\/mirror$/);
    if (mirror && req.method === "POST") {
      return await doMirror(decodeURIComponent(mirror[1]), deps);
    }

    const check = path.match(/^\/([^/]+)\/remote-diff-check$/);
    if (check && req.method === "GET") {
      return await doDiffCheck(decodeURIComponent(check[1]), deps);
    }

    const over = path.match(/^\/([^/]+)\/overwrite-from-remote$/);
    if (over && req.method === "POST") {
      return await doOverwrite(decodeURIComponent(over[1]), deps);
    }

    if (path === "/overwrite-all-from-remote" && req.method === "POST") {
      return await doOverwriteAll(deps);
    }

    if (path === "/templates" && req.method === "GET") {
      return json(await deps.listTemplates());
    }

    return json({ error: "NOT_FOUND" }, 404);
  } catch (e) {
    return json(
      { error: "NOTEBOOK_GIT_ERROR", detail: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
}

// POST /:id/mirror — push the row's current state (or remove it if soft-deleted).
async function doMirror(id: string, deps: RouterDeps): Promise<Response> {
  const cfg = await deps.loadConfig();
  if (!cfg) return json({ status: "skipped", reason: "Git config not set" });

  const row = await deps.readNotebook(id);
  if (!row) return json({ error: "NOT_FOUND" }, 404);

  const git = deps.makeGit(cfg);
  const fileName = fileNameFor(id);

  if (row.deletedAt) {
    await git.deleteFile(fileName, `Delete notebook ${id}`);
    return json({ status: "ok", action: "deleted" });
  }

  const payload = JSON.stringify(
    { name: row.name, description: row.description, content: row.content },
    null,
    2,
  );
  await git.saveFile(fileName, payload, `Update notebook ${id}`);
  return json({ status: "ok", action: "saved" });
}

// GET /:id/remote-diff-check — does the repo hold different content?
async function doDiffCheck(id: string, deps: RouterDeps): Promise<Response> {
  const cfg = await deps.loadConfig();
  if (!cfg) return json({ hasDifferences: false, reason: "Git config not set" });

  const row = await deps.readNotebook(id);
  if (!row) return json({ hasDifferences: false, reason: "Notebook not found" });

  const git = deps.makeGit(cfg);
  // readFile() calls ensureRepositoryReady() itself, so an explicit
  // ensureLatest() here would just be a second fetch+checkout for nothing.
  let remote: RemoteFile;
  try {
    remote = JSON.parse(await git.readFile(fileNameFor(id)));
  } catch {
    return json({ hasDifferences: false, reason: "Notebook not found in remote repository" });
  }

  const hasDifferences = !contentEquals(remote.content ?? {}, row.content ?? {});
  return json({
    hasDifferences,
    reason: hasDifferences ? "Content differs from remote" : "Content is identical to remote",
  });
}

// POST /:id/overwrite-from-remote — take the repo's version, if it differs.
async function doOverwrite(id: string, deps: RouterDeps): Promise<Response> {
  const cfg = await deps.loadConfig();
  if (!cfg) {
    return json({ message: "Git config not set, skip git operations", overwritten: false, notebookId: id });
  }

  const row = await deps.readNotebook(id);
  if (!row) return json({ error: "NOT_FOUND" }, 404);

  const git = deps.makeGit(cfg);
  // readFile() calls ensureRepositoryReady() itself, so an explicit
  // ensureLatest() here would just be a second fetch+checkout for nothing.
  let remote: RemoteFile;
  try {
    remote = JSON.parse(await git.readFile(fileNameFor(id)));
  } catch {
    return json({
      message: `Notebook ${id} not found in remote repository, no action taken`,
      overwritten: false,
      notebookId: id,
    });
  }

  if (contentEquals(remote.content ?? {}, row.content ?? {})) {
    return json({
      message: `Notebook ${id} content is identical to remote, no action taken`,
      overwritten: false,
      notebookId: id,
    });
  }

  await deps.writeNotebook(id, {
    name: remote.name || row.name,
    description: remote.description ?? row.description,
    content: remote.content ?? {},
  });

  return json({
    message: `Successfully overwritten notebook ${id} from remote due to content mismatch`,
    overwritten: true,
    notebookId: id,
  });
}

// POST /overwrite-all-from-remote — repair path for a drifted mirror.
async function doOverwriteAll(deps: RouterDeps): Promise<Response> {
  const cfg = await deps.loadConfig();
  if (!cfg) return json({ error: "NOT_CONFIGURED" }, 503);

  const git = deps.makeGit(cfg);
  await git.ensureLatest();
  const fileNames = await git.listFiles(JSON_FILE_FILTER);

  let processed = 0;
  for (const fileName of fileNames) {
    const id = fileName.replace(JSON_FILE_FILTER, "");
    try {
      const remote: RemoteFile = JSON.parse(await git.readFile(fileName));
      await deps.writeNotebook(id, {
        name: remote.name || `Notebook ${id}`,
        description: remote.description ?? "",
        content: remote.content ?? {},
      });
      processed++;
    } catch (e) {
      // One bad file must not abort the repair run.
      console.error(`Skipped ${fileName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return json({ message: "Successfully overwritten all notebooks from remote", processed });
}
