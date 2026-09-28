// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Notebook template repo config and listing — separate from the mirror repo
// (config.ts). Mirrors the React side's getTemplateGit() (plugins/functions/
// portal/src/notebook/notebook.service.ts): reads the repo URL from
// NOTEBOOK_TEMPLATE_REPO_URL, and (unlike the React side, which never wired a
// token in) reuses NOTEBOOK_GIT_PAT for auth since the template repo may live
// behind the same token as the mirror repo.
//
// A missing/misconfigured template repo, a fetch failure, or a single
// malformed <id>.json must never block notebook creation — every failure
// here degrades to an empty or partial list, never a thrown error.
import { Git, type GitConfig } from "./git.ts";

const REPO_DIR = "./NotebookTemplateRepository";
const JSON_FILE_FILTER = /\.json$/;

export interface NotebookTemplate {
  id: string;
  name: string;
  description: string;
  content: unknown;
}

interface TemplateFile {
  name?: string;
  description?: string;
  content?: unknown;
}

export interface TemplateGitLike {
  listFiles(filter?: RegExp): Promise<string[]>;
  readFile(name: string): Promise<string>;
}

/**
 * Assemble the template repo config from the environment, or null when
 * NOTEBOOK_TEMPLATE_REPO_URL is unset — an expected state (no template repo
 * wired up), not an error. The reader is injectable for tests; production
 * passes none.
 */
export function loadTemplateConfig(
  env: (name: string) => string | undefined = (n) => Deno.env.get(n),
): GitConfig | null {
  const repoUrl = env("NOTEBOOK_TEMPLATE_REPO_URL");
  if (!repoUrl) return null;

  const pat = env("NOTEBOOK_GIT_PAT");
  return {
    repoDir: REPO_DIR,
    repoUrl,
    branch: env("NOTEBOOK_TEMPLATE_REPO_BRANCH") || "main",
    ...(pat ? { pat } : {}),
  };
}

/**
 * List notebook templates from the configured repo. Config and git are both
 * injectable for tests; production passes neither.
 */
export async function listTemplates(
  loadConfig: () => GitConfig | null = loadTemplateConfig,
  makeGit: (cfg: GitConfig) => TemplateGitLike = (cfg) => new Git(cfg),
): Promise<NotebookTemplate[]> {
  const cfg = loadConfig();
  if (!cfg) return [];

  const git = makeGit(cfg);
  let fileNames: string[];
  try {
    fileNames = await git.listFiles(JSON_FILE_FILTER);
  } catch (e) {
    console.error(
      `Failed to list notebook templates: ${e instanceof Error ? e.message : String(e)}`,
    );
    return [];
  }

  const templates: NotebookTemplate[] = [];
  for (const fileName of fileNames) {
    const id = fileName.replace(JSON_FILE_FILTER, "");
    try {
      const data: TemplateFile = JSON.parse(await git.readFile(fileName));
      templates.push({
        id,
        name: data.name || id,
        description: data.description || "",
        content: data.content ?? {},
      });
    } catch (e) {
      // One bad template must not break the list.
      console.error(
        `Skipped malformed template ${fileName}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  return templates;
}
