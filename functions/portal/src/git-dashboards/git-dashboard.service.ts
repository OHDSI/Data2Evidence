import { Injectable } from "@danet/core";
import fs from "fs";
import http from "isomorphic-git/http";
import git from "isomorphic-git";
import path from "path";
import { DashboardTemplateData } from "../types.d.ts";
import { env } from "../env.ts";

@Injectable()
export class GitDashboardService {
  private readonly repoDir = "./StudiesDashboardRepository";
  private readonly repositoryUrl = env.GIT_DASHBOARDS_REPO_URL;
  private readonly repositoryBranch = env.GIT_DASHBOARDS_REPO_BRANCH;

  constructor() {
    if (!fs.existsSync(this.repoDir)) {
      fs.mkdirSync(this.repoDir, { recursive: true });
    }
  }

  async getDashboardTemplatesFromRepo(): Promise<DashboardTemplateData[]> {
    await this.ensureRepositoryReady();

    const dashboardTemplates: DashboardTemplateData[] = [];
    const entries = fs.readdirSync(this.repoDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && /\.(r|R)$/.test(entry.name)) {
        const fullPath = path.join(this.repoDir, entry.name);
        const content = fs.readFileSync(fullPath, "utf8");
        dashboardTemplates.push({ filename: entry.name, content });
      }
    }
    return dashboardTemplates;
  }

  private async ensureRepositoryReady(): Promise<void> {
    const defaultBranch = this.getDefaultBranch();

    try {
      let isGitRepo = false;
      try {
        await git.resolveRef({ fs, dir: this.repoDir, ref: "HEAD" });
        isGitRepo = true;
      } catch (e) {
        isGitRepo = false;
      }

      if (!isGitRepo) {
        console.log(`Cloning repository from ${this.repositoryUrl}`);
        await git.clone({
          fs,
          http,
          dir: this.repoDir,
          url: this.repositoryUrl,
          singleBranch: true,
          depth: 1,
          ref: defaultBranch,
        });
        console.log("Repository cloned successfully");
      } else {
        try {
          const remotes = await git.listRemotes({ fs, dir: this.repoDir });
          const hasOrigin = remotes.some((r) => r.remote === "origin");

          if (hasOrigin) {
            console.log(
              `Fetching latest changes from origin/${defaultBranch}...`
            );
            await git.fetch({
              fs,
              http,
              dir: this.repoDir,
              remote: "origin",
              ref: defaultBranch,
            });

            await git.checkout({
              fs,
              dir: this.repoDir,
              ref: `origin/${defaultBranch}`,
              force: true,
            });
          }
        } catch (remoteError: any) {
          console.error(`Error updating repository: ${remoteError.message}`);
        }
      }
    } catch (error: any) {
      console.error(`Repository setup failed: ${error.message}`);
      throw new Error(`Repository setup failed: ${error.message}`);
    }
  }

  private getDefaultBranch(): string {
    return this.repositoryBranch || "develop";
  }
}
