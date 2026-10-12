import { assertEquals } from "jsr:@std/assert@1";
import { GIT_CONFIG_KEY, loadGitConfig } from "./config.ts";

const noEnv = () => undefined;

Deno.test("key name matches the React side's config key", () => {
  assertEquals(GIT_CONFIG_KEY, "notebook-git-config");
});

Deno.test("returns null when the setting row is absent", async () => {
  assertEquals(await loadGitConfig(async () => null, noEnv), null);
});

Deno.test("returns null when the setting value is not JSON", async () => {
  assertEquals(await loadGitConfig(async () => "not json{", noEnv), null);
});

Deno.test("returns null when repoUrl is missing", async () => {
  const read = async () => JSON.stringify({ branch: "main" });
  assertEquals(await loadGitConfig(read, noEnv), null);
});

Deno.test("returns null when branch is missing", async () => {
  const read = async () => JSON.stringify({ repoUrl: "https://x/y.git" });
  assertEquals(await loadGitConfig(read, noEnv), null);
});

Deno.test("reads repoUrl and branch from the setting", async () => {
  const read = async () => JSON.stringify({ repoUrl: "https://x/y.git", branch: "main" });
  const cfg = await loadGitConfig(read, noEnv);
  assertEquals(cfg?.repoUrl, "https://x/y.git");
  assertEquals(cfg?.branch, "main");
  assertEquals(cfg?.pat, undefined);
});

Deno.test("takes the PAT from the environment, never from the setting", async () => {
  // A pat in the DB row must be ignored: notebook.app_settings is readable by
  // every authenticated user via PostGraphile.
  const read = async () =>
    JSON.stringify({ repoUrl: "https://x/y.git", branch: "main", pat: "FROM_DB" });
  const cfg = await loadGitConfig(read, (n) => (n === "NOTEBOOK_GIT_PAT" ? "FROM_ENV" : undefined));
  assertEquals(cfg?.pat, "FROM_ENV");
});
