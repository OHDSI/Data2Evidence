// @ts-nocheck - Deno edge function (trex EdgeRuntime). Mirrors metadata-api.
//
// Git mirror for the Atlas notebook store. The Vue plugin writes notebook rows
// straight to PostGraphile, so there is no server-side seam on the write path;
// the store calls POST /:id/mirror right after each successful write instead.
// This is the same "server-side carve-out" shape as metadata-api's
// /cdm-connections/:id/password and /results/publish.
//
//   POST /:id/mirror                  push the row's state to the repo
//   GET  /:id/remote-diff-check       does the repo hold different content?
//   POST /:id/overwrite-from-remote   take the repo's version
//   POST /overwrite-all-from-remote   repair a drifted mirror
//   GET  /templates                   list templates from the template repo
//
// Routing lives in router.ts so it is unit-testable; SQL transport in sql.ts.
import { handleRequest, type RouterDeps } from "./router.ts";
import { loadGitConfig, makeGit } from "./config.ts";
import { readNotebook, writeNotebook } from "./notebooks.ts";
import { listTemplates } from "./templates.ts";

const deps: RouterDeps = {
  loadConfig: () => loadGitConfig(),
  makeGit,
  readNotebook,
  writeNotebook,
  listTemplates,
};

Deno.serve((req: Request) => handleRequest(req, deps));
