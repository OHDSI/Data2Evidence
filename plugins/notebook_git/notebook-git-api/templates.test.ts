import { assertEquals } from "jsr:@std/assert@1";
import {
  loadTemplateConfig,
  listTemplates,
  type TemplateGitLike,
} from "./templates.ts";

const noEnv = () => undefined;

function fakeGit(files: Record<string, string>): TemplateGitLike {
  return {
    listFiles: async () => Object.keys(files),
    readFile: async (name: string) => {
      if (!(name in files)) throw new Error(`${name} not found`);
      return files[name];
    },
  };
}

// --- loadTemplateConfig ------------------------------------------------------

Deno.test("loadTemplateConfig returns null when NOTEBOOK_TEMPLATE_REPO_URL is unset", () => {
  assertEquals(loadTemplateConfig(noEnv), null);
});

Deno.test("loadTemplateConfig reads the repo URL and defaults the branch to main", () => {
  const env = (n: string) =>
    n === "NOTEBOOK_TEMPLATE_REPO_URL" ? "https://x/templates.git" : undefined;
  const cfg = loadTemplateConfig(env);
  assertEquals(cfg?.repoUrl, "https://x/templates.git");
  assertEquals(cfg?.branch, "main");
  assertEquals(cfg?.pat, undefined);
});

Deno.test("loadTemplateConfig honours an explicit branch", () => {
  const values: Record<string, string> = {
    NOTEBOOK_TEMPLATE_REPO_URL: "https://x/templates.git",
    NOTEBOOK_TEMPLATE_REPO_BRANCH: "dev",
  };
  const cfg = loadTemplateConfig((n) => values[n]);
  assertEquals(cfg?.branch, "dev");
});

Deno.test("loadTemplateConfig reuses NOTEBOOK_GIT_PAT for auth", () => {
  // Separate config from the mirror repo (config.ts), but the same token —
  // the template repo may live behind the same PAT.
  const values: Record<string, string> = {
    NOTEBOOK_TEMPLATE_REPO_URL: "https://x/templates.git",
    NOTEBOOK_GIT_PAT: "TOKEN",
  };
  const cfg = loadTemplateConfig((n) => values[n]);
  assertEquals(cfg?.pat, "TOKEN");
});

// --- listTemplates ------------------------------------------------------

Deno.test("listTemplates returns [] when the template repo is not configured", async () => {
  // Unconfigured is an expected state, not an error — a missing template
  // repo must never block notebook creation.
  assertEquals(await listTemplates(() => null), []);
});

Deno.test("listTemplates parses each template file from a configured repo", async () => {
  const cfg = { repoDir: "./x", repoUrl: "https://x/y.git", branch: "main" };
  const files = {
    "a.json": JSON.stringify({ name: "A", description: "da", content: { cells: [] } }),
    "b.json": JSON.stringify({ name: "B", description: "db", content: { cells: [{ id: "1" }] } }),
  };
  const list = await listTemplates(() => cfg, () => fakeGit(files));
  assertEquals(list.length, 2);
  assertEquals(list[0], { id: "a", name: "A", description: "da", content: { cells: [] } });
  assertEquals(list[1], { id: "b", name: "B", description: "db", content: { cells: [{ id: "1" }] } });
});

Deno.test("listTemplates skips a malformed template file but returns the rest", async () => {
  const cfg = { repoDir: "./x", repoUrl: "https://x/y.git", branch: "main" };
  const files = {
    "good.json": JSON.stringify({ name: "Good", description: "", content: {} }),
    "bad.json": "not json{",
  };
  const list = await listTemplates(() => cfg, () => fakeGit(files));
  assertEquals(list.length, 1);
  assertEquals(list[0].id, "good");
});

Deno.test("listTemplates falls back to the filename for a missing name", () => {
  return (async () => {
    const cfg = { repoDir: "./x", repoUrl: "https://x/y.git", branch: "main" };
    const files = { "untitled.json": JSON.stringify({ content: { cells: [] } }) };
    const list = await listTemplates(() => cfg, () => fakeGit(files));
    assertEquals(list[0].name, "untitled");
    assertEquals(list[0].description, "");
  })();
});

Deno.test("listTemplates returns [] when listing the repo fails", async () => {
  const cfg = { repoDir: "./x", repoUrl: "https://x/y.git", branch: "main" };
  const git: TemplateGitLike = {
    listFiles: async () => {
      throw new Error("clone failed");
    },
    readFile: async () => "",
  };
  assertEquals(await listTemplates(() => cfg, () => git), []);
});
