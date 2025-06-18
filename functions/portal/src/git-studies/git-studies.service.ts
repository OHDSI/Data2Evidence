import { Injectable } from "@danet/core";
import fs from "fs";
import http from "http";
import git from "isomorphic-git";
import path from "path";
import { env } from "../env.ts";
import { GitSubmodule, PartialGitSubmodule, StudiesData } from "../types.d.ts";
import { STUDIES_JSON_NAME } from "../common/const.ts";

@Injectable()
export class GitStudiesService {
  private readonly repoDir = "./StudiesRepository";
  private readonly repositoryUrl = env.GIT_STUDIES_REPO_URL;
  private readonly repositoryBranch = env.GIT_STUDIES_REPO_BRANCH;

  constructor() {
    // Ensure repo directory exists
    if (!fs.existsSync(this.repoDir)) {
      fs.mkdirSync(this.repoDir, { recursive: true });
    }
  }

  async getStudiesFromRepo(): Promise<StudiesData> {
    try {
      await this.ensureRepositoryReady();

      const studiesPath = path.join(this.repoDir, STUDIES_JSON_NAME);
      if (!fs.existsSync(studiesPath)) {
        throw new Error(`${STUDIES_JSON_NAME} not found in repository root`);
      }

      const studiesContent = fs.readFileSync(studiesPath, "utf8");
      const studiesData = JSON.parse(studiesContent) as StudiesData;

      console.log(
        `Found ${Object.keys(studiesData).length} studies in repository`
      );
      return studiesData;
    } catch (error: any) {
      console.error("Error fetching studies from repository:", error);
      throw new Error(
        `Failed to fetch studies from repository: ${error.message}`
      );
    }
  }

  async getStudyStrategusJson(studyId: string) {
    try {
      await this.ensureRepositoryReady();

      const studiesPath = path.join(this.repoDir, "studies.json");
      if (!fs.existsSync(studiesPath)) {
        throw new Error("studies.json not found in repository root");
      }

      const studiesContent = fs.readFileSync(studiesPath, "utf8");
      const studiesData = JSON.parse(studiesContent) as StudiesData;

      if (!studiesData[studyId]) {
        throw new Error(`Study ${studyId} not found in repository`);
      }

      const strategusPath = studiesData[studyId].strategus_json;
      console.log(`Looking for strategus JSON at: ${strategusPath}`);

      // Read the strategus file
      const cleanFilePath = strategusPath.replace(/^\.\//, "");
      const fullFilePath = path.join(this.repoDir, cleanFilePath);

      if (!fs.existsSync(fullFilePath)) {
        throw new Error(
          `Strategus JSON file not found at ${strategusPath}. Make sure submodules are properly configured.`
        );
      }

      const strategusContent = fs.readFileSync(fullFilePath, "utf8");
      const strategusData = JSON.parse(strategusContent);

      console.log(`Successfully loaded strategus JSON for study ${studyId}`);
      return strategusData;
    } catch (error: any) {
      console.error("Error fetching strategus JSON:", error);
      throw new Error(
        `Failed to fetch strategus JSON for study ${studyId}: ${error.message}`
      );
    }
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
        console.log(`Cloning repository from ${this.repositoryUrl}...`);
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
        await this.initializeSubmodules(this.repoDir);
      } else {
        try {
          const remotes = await git.listRemotes({ fs, dir: this.repoDir });
          console.log("Remotes:", remotes);
          const hasOrigin = remotes.some((r) => r.remote === "origin");

          if (hasOrigin) {
            console.log(`Fetching latest changes from origin/${defaultBranch}...`);
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
            // Update submodules after merge
            await this.initializeSubmodules(this.repoDir);
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

  private async initializeSubmodules(repoDir: string): Promise<void> {
    try {
      const gitmodulesPath = path.join(repoDir, ".gitmodules");
      if (!fs.existsSync(gitmodulesPath)) {
        console.log(
          "No .gitmodules file found, skipping submodule initialization"
        );
        return;
      }

      console.log("Found .gitmodules file, initializing submodules...");

      // Read .gitmodules to get submodule information
      const gitmodulesContent = fs.readFileSync(gitmodulesPath, "utf8");
      const submodules = this.parseGitmodules(gitmodulesContent);

      for (const submodule of submodules) {
        const submoduleDir = path.join(repoDir, submodule.path);

        try {
          console.log(
            `Cloning submodule: ${submodule.name} from ${submodule.url}`
          );

          // Ensure parent directory exists
          const parentDir = path.dirname(submoduleDir);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          await git.clone({
            fs,
            http,
            dir: submoduleDir,
            url: submodule.url,
            singleBranch: true,
            depth: 1,
            ref: submodule.branch || this.repositoryBranch,
          });

          console.log(`Successfully cloned submodule: ${submodule.name}`);
        } catch (submoduleError: any) {
          console.error(
            `Failed to clone submodule ${submodule.name}:`,
            submoduleError.message
          );
        }
      }
    } catch (error) {
      console.error("Error initializing submodules:");
    }
  }

  private parseGitmodules(content: string): GitSubmodule[] {
    const submodules: GitSubmodule[] = [];
    const lines = content.split("\n");

    let currentSubmodule: PartialGitSubmodule | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("[submodule ")) {
        // If we have a complete previous submodule, add it to results
        if (
          currentSubmodule?.name &&
          currentSubmodule?.path &&
          currentSubmodule?.url
        ) {
          submodules.push(currentSubmodule as GitSubmodule);
        }

        // Start new submodule
        const nameMatch = trimmedLine.match(/\[submodule "(.+)"\]/);
        if (nameMatch) {
          currentSubmodule = { name: nameMatch[1] };
        }
      } else if (currentSubmodule && trimmedLine.includes("=")) {
        // Parse property of current submodule
        const [key, value] = trimmedLine.split("=").map((s) => s.trim());

        switch (key) {
          case "path":
            currentSubmodule.path = value;
            break;
          case "url":
            currentSubmodule.url = value;
            break;
          case "branch":
            currentSubmodule.branch = value;
            break;
        }
      }
    }
    // Add the last submodule
    if (
      currentSubmodule?.name &&
      currentSubmodule?.path &&
      currentSubmodule?.url
    ) {
      submodules.push(currentSubmodule as GitSubmodule);
    }

    return submodules;
  }

  private getDefaultBranch(): string {
    return this.repositoryBranch || "develop";
  }
}
