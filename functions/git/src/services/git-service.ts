import fs from "fs";
import http from "isomorphic-git/http";
import git from "isomorphic-git";
import * as path from "path";
import {
  GitServiceConfig,
  GitAuthor,
  GitSubmodule,
  PartialGitSubmodule,
} from "../types.ts";

const DEFAULT_AUTHOR: GitAuthor = {
  name: "Git System",
  email: "system@d2e.care",
};

export class GitService {
  private readonly repoDir: string;
  private readonly repoUrl: string;
  private readonly branch: string;
  private readonly pat?: string;
  private readonly subDir?: string;
  private readonly submodules: boolean;

  constructor(config: GitServiceConfig) {
    this.repoDir = config.repoDir;
    this.repoUrl = config.repoUrl;
    this.branch = config.branch;
    this.pat = config.pat;
    this.subDir = config.subDir;
    this.submodules = config.submodules ?? false;

    if (!fs.existsSync(this.repoDir)) {
      fs.mkdirSync(this.repoDir, { recursive: true });
    }
  }

  private getAuthConfig() {
    return this.pat ? { onAuth: () => ({ username: this.pat }) } : {};
  }

  private getTargetDir(): string {
    if (this.subDir) {
      const targetDir = path.join(this.repoDir, this.subDir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      return targetDir;
    }
    return this.repoDir;
  }

  private sanitizeFileName(fileName: string): string {
    const safe = fileName.replace(/[^a-zA-Z0-9-_.]/g, "");
    if (safe !== fileName) {
      throw new Error("Invalid filename: contains unsafe characters");
    }
    return safe;
  }

  private resolveFilePath(fileName: string): string {
    const safe = this.sanitizeFileName(fileName);
    const targetDir = this.getTargetDir();
    const resolvedPath = path.resolve(targetDir, safe);
    const resolvedTargetDir = path.resolve(targetDir);
    if (
      !resolvedPath.startsWith(resolvedTargetDir + path.sep) &&
      resolvedPath !== path.resolve(resolvedTargetDir, safe)
    ) {
      throw new Error("Invalid filename: path traversal attempt detected");
    }
    return resolvedPath;
  }

  private getRelativeFilePath(fileName: string): string {
    const safe = this.sanitizeFileName(fileName);
    return this.subDir ? path.join(this.subDir, safe) : safe;
  }

  private async isGitRepo(): Promise<boolean> {
    try {
      await git.resolveRef({ fs, dir: this.repoDir, ref: "HEAD" });
      return true;
    } catch {
      return false;
    }
  }

  // --- Public methods ---

  async ensureLatest(): Promise<void> {
    await this.ensureRepositoryReady();
  }

  async readFile(fileName: string): Promise<string> {
    await this.ensureRepositoryReady();

    const filePath = this.resolveFilePath(fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${fileName} not found in repository`);
    }

    return fs.readFileSync(filePath, "utf8");
  }

  // For reading files at nested repo-relative paths (e.g. submodule content).
  // Unlike readFile() which only allows flat filenames in the target dir,
  // this accepts paths with '/' but still guards against traversal via '..'.
  async readFileByPath(relativePath: string): Promise<string> {
    await this.ensureRepositoryReady();

    if (relativePath.includes("..")) {
      throw new Error("Invalid path: traversal attempt detected");
    }

    const cleanPath = relativePath.replace(/^\.\//, "");
    const fullPath = path.resolve(this.repoDir, cleanPath);
    const resolvedRepoDir = path.resolve(this.repoDir);

    if (!fullPath.startsWith(resolvedRepoDir + path.sep) && fullPath !== resolvedRepoDir) {
      throw new Error("Invalid path: outside repository boundary");
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at path: ${relativePath}`);
    }

    return fs.readFileSync(fullPath, "utf8");
  }

  async listFiles(filter?: RegExp): Promise<string[]> {
    await this.ensureRepositoryReady();

    const targetDir = this.getTargetDir();

    if (!fs.existsSync(targetDir)) {
      return [];
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    let files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    if (filter) {
      files = files.filter((name) => filter.test(name));
    }

    return files;
  }

  async saveFile(
    fileName: string,
    content: string,
    commitMessage: string,
    author: GitAuthor = DEFAULT_AUTHOR
  ): Promise<void> {
    await this.ensureRepositoryReadyForWrite(author);

    const filePath = this.resolveFilePath(fileName);
    const relativeFilePath = this.getRelativeFilePath(fileName);

    // Ensure target directory exists
    const targetDir = this.getTargetDir();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content);
    await git.add({ fs, dir: this.repoDir, filepath: relativeFilePath });

    const status = await git.status({
      fs,
      dir: this.repoDir,
      filepath: relativeFilePath,
    });

    if (status !== "unmodified") {
      const commitId = await git.commit({
        fs,
        dir: this.repoDir,
        author,
        message: commitMessage,
      });
      console.log(`Committed changes with ID: ${commitId}`);

      await git.push({
        fs,
        http,
        dir: this.repoDir,
        remote: "origin",
        ref: this.branch,
        ...this.getAuthConfig(),
      });
      console.log(`Pushed changes to origin/${this.branch}`);
    } else {
      console.log(`No changes to commit for ${fileName}`);
    }
  }

  async deleteFile(
    fileName: string,
    commitMessage: string,
    author: GitAuthor = DEFAULT_AUTHOR
  ): Promise<void> {
    await this.ensureRepositoryReadyForWrite(author);

    const filePath = this.resolveFilePath(fileName);
    const relativeFilePath = this.getRelativeFilePath(fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${fileName} does not exist in repository`);
    }

    fs.unlinkSync(filePath);
    await git.remove({ fs, dir: this.repoDir, filepath: relativeFilePath });

    const commitId = await git.commit({
      fs,
      dir: this.repoDir,
      author,
      message: commitMessage,
    });
    console.log(`Committed deletion with ID: ${commitId}`);

    await git.push({
      fs,
      http,
      dir: this.repoDir,
      remote: "origin",
      ref: this.branch,
      ...this.getAuthConfig(),
    });
    console.log(`Pushed deletion to origin/${this.branch}`);
  }

  // --- Private methods ---

  private async ensureRepositoryReady(): Promise<void> {
    try {
      const isRepo = await this.isGitRepo();

      if (!isRepo) {
        console.log(`Cloning repository from ${this.repoUrl}`);
        await git.clone({
          fs,
          http,
          dir: this.repoDir,
          url: this.repoUrl,
          singleBranch: true,
          depth: 1,
          ref: this.branch,
          ...this.getAuthConfig(),
        });
        console.log("Repository cloned successfully");

        if (this.submodules) {
          await this.initializeSubmodules();
        }
      } else {
        try {
          const remotes = await git.listRemotes({ fs, dir: this.repoDir });
          const hasOrigin = remotes.some((r) => r.remote === "origin");

          if (hasOrigin) {
            console.log(
              `Fetching latest changes from origin/${this.branch}...`
            );
            await git.fetch({
              fs,
              http,
              dir: this.repoDir,
              remote: "origin",
              ref: this.branch,
              ...this.getAuthConfig(),
            });

            await git.checkout({
              fs,
              dir: this.repoDir,
              ref: `origin/${this.branch}`,
              force: true,
            });

            if (this.submodules) {
              await this.initializeSubmodules();
            }
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

  private async ensureRepositoryReadyForWrite(
    author: GitAuthor
  ): Promise<void> {
    try {
      const isRepo = await this.isGitRepo();

      if (!isRepo) {
        console.log(`Cloning repository from ${this.repoUrl}`);
        await git.clone({
          fs,
          http,
          dir: this.repoDir,
          url: this.repoUrl,
          singleBranch: true,
          depth: 1,
          ref: this.branch,
          ...this.getAuthConfig(),
        });
        console.log("Repository cloned successfully");
      } else {
        const remotes = await git.listRemotes({ fs, dir: this.repoDir });
        const hasOrigin = remotes.some((r) => r.remote === "origin");

        if (hasOrigin) {
          await git.fetch({
            fs,
            http,
            dir: this.repoDir,
            remote: "origin",
            ref: this.branch,
            ...this.getAuthConfig(),
          });
          console.log("Fetched latest changes from remote");

          const currentBranch = await git.currentBranch({
            fs,
            dir: this.repoDir,
          });
          if (currentBranch !== this.branch) {
            await git.checkout({
              fs,
              dir: this.repoDir,
              ref: this.branch,
            });
          }

          try {
            await git.merge({
              fs,
              dir: this.repoDir,
              theirs: `origin/${this.branch}`,
              author,
            });
            console.log(`Merged changes from origin/${this.branch}`);
          } catch (mergeError: any) {
            console.error(`Could not merge: ${mergeError.message}`);
            throw new Error(`Could not merge: ${mergeError.message}`);
          }
        } else {
          await git.addRemote({
            fs,
            dir: this.repoDir,
            remote: "origin",
            url: this.repoUrl,
          });
          console.log(`Added remote: ${this.repoUrl}`);

          await git.fetch({
            fs,
            http,
            dir: this.repoDir,
            remote: "origin",
            ref: this.branch,
            ...this.getAuthConfig(),
          });
        }
      }
    } catch (error: any) {
      console.error(`Repository setup for write failed: ${error.message}`);
      throw new Error(`Repository setup for write failed: ${error.message}`);
    }
  }

  private async initializeSubmodules(): Promise<void> {
    try {
      const gitmodulesPath = path.join(this.repoDir, ".gitmodules");
      if (!fs.existsSync(gitmodulesPath)) {
        console.log(
          "No .gitmodules file found, skipping submodule initialization"
        );
        return;
      }

      console.log("Found .gitmodules file, initializing submodules...");
      const gitmodulesContent = fs.readFileSync(gitmodulesPath, "utf8");
      const submodules = this.parseGitmodules(gitmodulesContent);

      for (const submodule of submodules) {
        const submoduleDir = path.join(this.repoDir, submodule.path);

        try {
          console.log(
            `Cloning submodule: ${submodule.name} from ${submodule.url}`
          );

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
            ref: submodule.branch || this.branch,
            ...this.getAuthConfig(),
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
      console.error("Error initializing submodules:", error);
    }
  }

  private parseGitmodules(content: string): GitSubmodule[] {
    const submodules: GitSubmodule[] = [];
    const lines = content.split("\n");
    let currentSubmodule: PartialGitSubmodule | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("[submodule ")) {
        if (
          currentSubmodule?.name &&
          currentSubmodule?.path &&
          currentSubmodule?.url
        ) {
          submodules.push(currentSubmodule as GitSubmodule);
        }

        const nameMatch = trimmedLine.match(/\[submodule "(.+)"\]/);
        if (nameMatch) {
          currentSubmodule = { name: nameMatch[1] };
        }
      } else if (currentSubmodule && trimmedLine.includes("=")) {
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

    if (
      currentSubmodule?.name &&
      currentSubmodule?.path &&
      currentSubmodule?.url
    ) {
      submodules.push(currentSubmodule as GitSubmodule);
    }

    return submodules;
  }
}
