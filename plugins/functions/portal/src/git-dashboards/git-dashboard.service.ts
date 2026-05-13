import { Injectable } from "@danet/core";
import { Git } from "../../../_shared/git/Git.ts";
import { env } from "../env.ts";
import type { DashboardTemplateData } from "../types.d.ts";

const R_FILE_FILTER = /\.(r|R)$/;

@Injectable()
export class GitDashboardService {
  private readonly git: Git;

  constructor() {
    this.git = new Git({
      repoDir: "./StudiesDashboardRepository",
      repoUrl: env.GIT_DASHBOARDS_REPO_URL,
      branch: env.GIT_DASHBOARDS_REPO_BRANCH || "develop",
    });
  }

  async getDashboardTemplatesFromRepo(): Promise<DashboardTemplateData[]> {
    const filenames = await this.git.listFiles(R_FILE_FILTER);
    const result: DashboardTemplateData[] = [];
    for (const filename of filenames) {
      result.push({ filename, content: await this.git.readFile(filename) });
    }
    return result;
  }
}
