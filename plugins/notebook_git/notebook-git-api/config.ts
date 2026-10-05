// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Git config comes from two places, and the split is a security requirement:
// repoUrl/branch live in notebook.app_settings, but the PAT lives ONLY in the
// function's environment. V3__notebook_graphql_grants.sql grants SELECT on all
// tables in schema `notebook` to `authenticated` with no RLS, so a PAT stored
// in app_settings would be readable by any user via one GraphQL query.
import { query, lit } from "./sql.ts";
import { Git, type GitConfig } from "./git.ts";

export const GIT_CONFIG_KEY = "notebook-git-config";
const REPO_DIR = "./NotebookGitRepository";

async function readSetting(key: string): Promise<string | null> {
  const { rows } = await query(
    `SELECT value FROM _config.notebook.app_settings WHERE key = ${lit(key)}`,
  );
  const value = rows[0]?.value;
  return typeof value === "string" ? value : null;
}

/**
 * Assemble the git config, or null when git is not configured — an expected
 * state, not an error. Readers are injectable for tests; production passes none.
 */
export async function loadGitConfig(
  read: (key: string) => Promise<string | null> = readSetting,
  env: (name: string) => string | undefined = (n) => Deno.env.get(n),
): Promise<GitConfig | null> {
  let raw: string | null;
  try {
    raw = await read(GIT_CONFIG_KEY);
  } catch (e) {
    console.error(`Failed to read ${GIT_CONFIG_KEY}: ${e}`);
    return null;
  }
  if (!raw) return null;

  let parsed: { repoUrl?: string; branch?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`${GIT_CONFIG_KEY} is not valid JSON`);
    return null;
  }
  if (!parsed.repoUrl || !parsed.branch) return null;

  const pat = env("NOTEBOOK_GIT_PAT");
  return {
    repoDir: REPO_DIR,
    repoUrl: parsed.repoUrl,
    branch: parsed.branch,
    // Deliberately ignores any `pat` in the DB row.
    ...(pat ? { pat } : {}),
  };
}

export function makeGit(cfg: GitConfig): Git {
  return new Git(cfg);
}
