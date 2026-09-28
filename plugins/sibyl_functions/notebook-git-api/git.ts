// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Trimmed port of plugins/functions/_shared/git/Git.ts — only what the four
// notebook-git routes need. The filename guards and the repoDir slug are
// copied verbatim because they are security-relevant.
import fs from "fs";
import { createHash } from "node:crypto";
import * as path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http";

const AUTHOR = { name: "Git System", email: "system@d2e.care" };

export interface GitConfig {
  repoDir: string;
  repoUrl: string;
  branch: string;
  pat?: string;
}

export class Git {
  private readonly repoDir: string;
  private readonly repoUrl: string;
  private readonly branch: string;
  private readonly pat?: string;

  constructor(config: GitConfig) {
    // Namespace the dir by repoUrl+branch so a config change routes to a fresh
    // clone instead of fetching from an origin that still points at the old URL.
    const slug = createHash("sha256")
      .update(`${config.repoUrl}#${config.branch}`)
      .digest("hex")
      .slice(0, 12);
    this.repoDir = path.join(config.repoDir, slug);
    this.repoUrl = config.repoUrl;
    this.branch = config.branch;
    this.pat = config.pat;
    if (!fs.existsSync(this.repoDir)) {
      fs.mkdirSync(this.repoDir, { recursive: true });
    }
  }

  private getAuthConfig() {
    return this.pat ? { onAuth: () => ({ username: this.pat }) } : {};
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
    const resolvedPath = path.resolve(this.repoDir, safe);
    const resolvedRepoDir = path.resolve(this.repoDir);
    const rel = path.relative(resolvedRepoDir, resolvedPath);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Invalid filename: path traversal attempt detected");
    }
    return resolvedPath;
  }

  private async isGitRepo(): Promise<boolean> {
    try {
      await git.resolveRef({ fs, dir: this.repoDir, ref: "HEAD" });
      return true;
    } catch {
      return false;
    }
  }

  private async ensureRepositoryReady(): Promise<void> {
    if (await this.isGitRepo()) {
      await git.fetch({
        fs, http, dir: this.repoDir, ref: this.branch,
        singleBranch: true, ...this.getAuthConfig(),
      });
      await git.checkout({ fs, dir: this.repoDir, ref: this.branch, force: true });
      return;
    }
    await git.clone({
      fs, http, dir: this.repoDir, url: this.repoUrl, ref: this.branch,
      singleBranch: true, depth: 1, ...this.getAuthConfig(),
    });
  }

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

  async listFiles(filter?: RegExp): Promise<string[]> {
    await this.ensureRepositoryReady();
    const names = fs.readdirSync(this.repoDir)
      .filter((n: string) => n !== ".git")
      .filter((n: string) => fs.statSync(path.join(this.repoDir, n)).isFile());
    return filter ? names.filter((n: string) => filter.test(n)) : names;
  }

  async saveFile(fileName: string, content: string, message: string): Promise<void> {
    await this.ensureRepositoryReady();
    const filePath = this.resolveFilePath(fileName);
    const relPath = this.sanitizeFileName(fileName);
    fs.writeFileSync(filePath, content, "utf8");
    await git.add({ fs, dir: this.repoDir, filepath: relPath });
    await this.commitAndPush(message);
  }

  async deleteFile(fileName: string, message: string): Promise<void> {
    await this.ensureRepositoryReady();
    const filePath = this.resolveFilePath(fileName);
    const relPath = this.sanitizeFileName(fileName);
    if (!fs.existsSync(filePath)) return;
    fs.unlinkSync(filePath);
    await git.remove({ fs, dir: this.repoDir, filepath: relPath });
    await this.commitAndPush(message);
  }

  private async commitAndPush(message: string): Promise<void> {
    await git.commit({ fs, dir: this.repoDir, message, author: AUTHOR });
    await git.push({
      fs, http, dir: this.repoDir, ref: this.branch,
      remoteRef: this.branch, ...this.getAuthConfig(),
    });
  }
}
