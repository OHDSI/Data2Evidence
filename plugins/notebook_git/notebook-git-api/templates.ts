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
import { parseJupystar } from "./jupystar.ts";

const REPO_DIR = "./NotebookTemplateRepository";
const DEFAULT_SUBDIR = "notebooks";
const JSON_FILE_FILTER = /\.json$/;

export interface NotebookTemplate {
  id: string;
  name: string;
  description: string;
  content: unknown;
}

/**
 * Shape of a file in <repo>/notebooks. The published templates repo
 * (data2evidence/templates) stores the cells under `notebookContent` and has
 * no `description` field; `content`/`description` are accepted too so a repo
 * written to the React side's older shape still loads.
 */
interface TemplateFile {
  name?: string;
  description?: string;
  content?: unknown;
  notebookContent?: unknown;
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
    // The templates repo keeps notebooks in `notebooks/`, next to `flows/` and
    // `fhir/` trees that are not notebooks; without this scope the listing is
    // empty (listFiles does not recurse) or, worse, full of ETL flows.
    subDir: env("NOTEBOOK_TEMPLATE_REPO_SUBDIR") || DEFAULT_SUBDIR,
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
      // `notebookContent` is the React notebook's plaintext format (a string);
      // `content` is already-structured NotebookData. Accept both so a repo in
      // either shape loads, but always hand the UI structured data.
      const raw = data.notebookContent ?? data.content;
      const content = typeof raw === "string" ? parseJupystar(raw) : (raw ?? {});
      templates.push({
        id,
        name: data.name || id,
        description: data.description || "",
        content,
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
