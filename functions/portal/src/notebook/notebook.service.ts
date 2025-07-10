import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  SCOPE,
} from "@danet/core";
import fs from "fs";
import http from "http";
import git from "isomorphic-git";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_ERROR_MESSAGE } from "../common/const.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { ConfigService } from "../config/config.service.ts";
import { INotebook, INotebookBaseDto, INotebookUpdateDto } from "../types.d.ts";
import { ServiceName } from "../user-artifact/enums/index.ts";
import { UserArtifactService } from "../user-artifact/user-artifact.service.ts";
import { NotebookTemplateDto } from "./dto/notebook-template.dto.ts";
import { env } from "../env.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class NotebookService {
  private readonly userId: string;
  private readonly gitRepoPath = "./NotebookRepository";
  private readonly templateRepoPath = "./NotebookTemplateRepository";
  private readonly notebooksFolder = "notebooks";
  private readonly gitConfig = {
    defaultAuthor: {
      name: "Notebook System",
      email: "we@data4life-asia.care",
    },
  };

  constructor(
    private readonly userArtifactService: UserArtifactService,
    private readonly requestContextService: RequestContextService,
    private readonly configService: ConfigService
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub;

    // Ensure git repo directories exist
    if (!fs.existsSync(this.gitRepoPath)) {
      fs.mkdirSync(this.gitRepoPath, { recursive: true });
    }
    if (!fs.existsSync(this.templateRepoPath)) {
      fs.mkdirSync(this.templateRepoPath, { recursive: true });
    }
  }

  private async getGitConfig(): Promise<{
    repoUrl: string;
    pat: string;
    branch: string;
  } | null> {
    try {
      const config = await this.configService.getConfigValuesByTypes([
        "notebook-git-config",
      ]);
      const value = config["notebook-git-config"];
      console.log(`Git config: ${value}`);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`Failed to get git config from database: ${error}`);
      return null;
    }
  }

  private async getGitRemoteUrl(): Promise<string> {
    try {
      const gitConfig = await this.getGitConfig();
      return gitConfig?.repoUrl || "";
    } catch (error) {
      console.error(
        `Failed to get git remote URL from config ${error}, using default`
      );
      return "";
    }
  }

  private async getDefaultBranch(): Promise<string> {
    try {
      const gitConfig = await this.getGitConfig();
      return gitConfig?.branch || "";
    } catch (error) {
      console.error(
        `Failed to get default branch from config ${error}, using default`
      );
      return "";
    }
  }

  private async getGitCredentials() {
    try {
      const gitConfig = await this.getGitConfig();
      const token = gitConfig?.pat || "";

      if (token) {
        return {
          username: token,
        };
      }
      return null;
    } catch (error) {
      console.error(`Failed to get git credentials: ${error}`);
      return null;
    }
  }

  async getNotebooksByUserId(): Promise<any[]> {
    try {
      const userNotebooks =
        await this.userArtifactService.getAllUserServiceArtifacts(
          ServiceName.NOTEBOOKS,
          this.userId
        );
      return userNotebooks;
    } catch (error) {
      console.error(
        `Error while getting notebooks for user id ${this.userId}: ${error}`
      );
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async createNotebook(notebookDto: INotebookBaseDto): Promise<INotebook> {
    try {
      const notebookEntity = this.addOwner(
        {
          ...notebookDto,
          id: uuidv4(),
          userId: this.userId,
          isShared: false,
        },
        true
      );
      await this.userArtifactService.createServiceArtifact(
        ServiceName.NOTEBOOKS,
        {
          serviceArtifact: notebookEntity,
        }
      );
      console.log(
        `Created new notebook ${notebookEntity.name} with id ${notebookEntity.id}`
      );

      await this.saveToGitRepo(
        notebookEntity.id,
        notebookEntity,
        `Created new notebook ${notebookEntity.name} with id ${notebookEntity.id}`
      );

      return notebookEntity;
    } catch (error) {
      console.error(`Error while creating new notebook: ${error}`);
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async updateNotebook(
    notebookUpdateDto: INotebookUpdateDto
  ): Promise<INotebook> {
    try {
      const notebook =
        await this.userArtifactService.getUserServiceArtifactById(
          this.userId,
          ServiceName.NOTEBOOKS,
          notebookUpdateDto.id
        );

      if (notebook.userId !== this.userId) {
        console.error("Notebook does not belong to user!");
        throw new InternalServerErrorException(
          "Notebook does not belong to user!"
        );
      }

      const updatedServiceEntity = this.addOwner({
        userId: this.userId,
        id: notebookUpdateDto.id,
        serviceArtifact: notebookUpdateDto,
      });
      await this.userArtifactService.updateServiceArtifactEntity(
        ServiceName.NOTEBOOKS,
        updatedServiceEntity
      );

      await this.saveToGitRepo(
        notebookUpdateDto.id,
        notebookUpdateDto,
        `Updated notebook ${notebookUpdateDto.name}`
      );

      console.log(`Updated notebook ${notebookUpdateDto.name}`);
      return {
        ...notebookUpdateDto,
        userId: this.userId,
      };
    } catch (error) {
      console.error(
        `Error while updating notebook ${notebookUpdateDto.id}: ${error}`
      );
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `Notebook with id ${notebookUpdateDto.id} not found`
        );
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async deleteNotebook(id: string): Promise<any> {
    try {
      const notebook = await this.getNotebook(id);
      await this.userArtifactService.deleteUserServiceArtifact(
        this.userId,
        ServiceName.NOTEBOOKS,
        id
      );

      await this.deleteFromGitRepo(
        id,
        `Deleted notebook ${notebook.name} with id ${id}`
      );

      return notebook;
    } catch (error) {
      console.error(`Error deleting notebook ${id}: ${error}`);
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Notebook with id ${id} not found`);
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  private async getNotebook(id: string) {
    const notebook = await this.userArtifactService.getUserServiceArtifactById(
      this.userId,
      ServiceName.NOTEBOOKS,
      id
    );
    if (!notebook) {
      throw new NotFoundException(`Notebook with id ${id} not found`);
    }
    return notebook;
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId,
      };
    }
    return {
      ...object,
      modifiedBy: this.userId,
    };
  }

  private async saveToGitRepo(
    notebookId: string,
    notebookEntity: any,
    commitMessage: string
  ) {
    const repoDir = this.gitRepoPath;
    const notebooksDir = path.join(repoDir, this.notebooksFolder);
    const fileName = `${notebookId}.json`;
    const filePath = path.join(notebooksDir, fileName);
    const defaultBranch = await this.getDefaultBranch();
    const gitRemoteUrl = await this.getGitRemoteUrl();

    if (!gitRemoteUrl || !defaultBranch) {
      console.log(
        "Git remote URL or default branch not configured, skipping Git operations"
      );
      return;
    }

    const author = {
      name: notebookEntity.createdBy || this.gitConfig.defaultAuthor.name,
      email: `we@data4life-asia.care`,
    };

    try {
      // Ensure directory exists
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
      }

      let isGitRepo = false;
      try {
        await git.resolveRef({ fs, dir: repoDir, ref: "HEAD" });
        isGitRepo = true;
      } catch (e) {
        isGitRepo = false;
      }

      if (!isGitRepo) {
        // If not a git repo, clone from remote repo
        try {
          console.log(`Cloning repository from ${gitRemoteUrl}`);
          await git.clone({
            fs,
            http,
            dir: repoDir,
            url: gitRemoteUrl,
            singleBranch: true,
            depth: 1,
            ref: defaultBranch,
            onAuth: () => this.getGitCredentials(),
          });
          console.log(`Successfully cloned repository`);
        } catch (cloneError) {
          console.error(`Failed to clone repository: ${cloneError.message}`);
          throw new Error(
            `Remote repository not found or inaccessible. Please ensure the repository exists at ${gitRemoteUrl}`
          );
        }
      } else {
        // Repository exists locally, fetch latest changes
        try {
          const remotes = await git.listRemotes({ fs, dir: repoDir });
          const hasOrigin = remotes.some((r) => r.remote === "origin");

          if (hasOrigin) {
            try {
              await git.fetch({
                fs,
                http,
                dir: repoDir,
                remote: "origin",
                ref: defaultBranch,
                onAuth: () => this.getGitCredentials(),
              });
              console.log("Fetched latest changes from remote");

              // Ensure we're on the main branch
              const currentBranch = await git.currentBranch({
                fs,
                dir: repoDir,
              });
              if (currentBranch !== defaultBranch) {
                try {
                  await git.checkout({ fs, dir: repoDir, ref: defaultBranch });
                  console.log(`Switched to ${defaultBranch} branch`);
                } catch (checkoutError) {
                  console.error(
                    `Could not checkout ${defaultBranch}: ${checkoutError.message}`
                  );
                  throw new Error(
                    `Could not switch to ${defaultBranch} branch`
                  );
                }
              }

              try {
                await git.merge({
                  fs,
                  dir: repoDir,
                  theirs: `origin/${defaultBranch}`,
                  author,
                });
                console.log(`Merged changes from origin/${defaultBranch}`);
              } catch (mergeError) {
                console.log(`Could not merge: ${mergeError.message}`);
                throw new Error(`Could not merge: ${mergeError.message}`);
              }
            } catch (fetchError) {
              console.log(`Could not fetch: ${fetchError.message}`);
              throw new Error(`Could not fetch: ${fetchError.message}`);
            }
          } else {
            try {
              await git.addRemote({
                fs,
                dir: repoDir,
                remote: "origin",
                url: gitRemoteUrl,
              });
              console.log(`Added remote: ${gitRemoteUrl}`);

              try {
                await git.fetch({
                  fs,
                  http,
                  dir: repoDir,
                  remote: "origin",
                  ref: defaultBranch,
                  onAuth: () => this.getGitCredentials(),
                });
                console.log("Fetched latest changes from remote");
              } catch (fetchError) {
                console.log(
                  `Could not fetch after adding remote: ${fetchError.message}`
                );
              }
            } catch (remoteError) {
              console.error(`Could not add remote: ${remoteError.message}`);
              throw new Error(
                `Failed to connect to remote repository at ${gitRemoteUrl}`
              );
            }
          }
        } catch (remoteError) {
          console.error(`Error checking remotes: ${remoteError.message}`);
          throw new Error(`Error checking remotes: ${remoteError.message}`);
        }
      }

      const notebookData = JSON.stringify(notebookEntity, null, 2);

      // Ensure notebooks directory exists
      if (!fs.existsSync(notebooksDir)) {
        fs.mkdirSync(notebooksDir, { recursive: true });
      }

      fs.writeFileSync(filePath, notebookData);

      const relativeFilePath = path.join(this.notebooksFolder, fileName);
      await git.add({ fs, dir: repoDir, filepath: relativeFilePath });

      const status = await git.status({
        fs,
        dir: repoDir,
        filepath: relativeFilePath,
      });
      if (status !== "unmodified") {
        try {
          const commitId = await git.commit({
            fs,
            dir: repoDir,
            author,
            message: commitMessage,
          });
          console.log(`Committed changes with ID: ${commitId}`);

          try {
            await git.push({
              fs,
              http,
              dir: repoDir,
              remote: "origin",
              ref: defaultBranch,
              onAuth: () => this.getGitCredentials(),
            });
            console.log(`Pushed changes to origin/${defaultBranch}`);
          } catch (pushError) {
            console.error(`Push failed: ${pushError.message}`);
            throw new Error(
              `Failed to push changes to remote repository. Please ensure you have write access to ${gitRemoteUrl}`
            );
          }
        } catch (commitError) {
          console.error(`Commit failed: ${commitError.message}`);
          throw new Error(`Failed to commit changes: ${commitError.message}`);
        }
      } else {
        console.log(`No changes to commit for notebook ${notebookId}`);
      }
    } catch (error) {
      console.error(`Git operation failed: ${error.message}`);
      throw new Error(`Git operation failed: ${error.message}`);
    }
  }

  private async deleteFromGitRepo(notebookId: string, commitMessage: string) {
    const repoDir = this.gitRepoPath;
    const notebooksDir = path.join(repoDir, this.notebooksFolder);
    const fileName = `${notebookId}.json`;
    const filePath = path.join(notebooksDir, fileName);
    const defaultBranch = await this.getDefaultBranch();
    const gitRemoteUrl = await this.getGitRemoteUrl();

    if (!gitRemoteUrl || !defaultBranch) {
      console.log(
        "Git remote URL or default branch not configured, skipping Git operations"
      );
      return;
    }

    const author = {
      name: this.userId || this.gitConfig.defaultAuthor.name,
      email: `we@data4life-asia.care`,
    };

    try {
      let isGitRepo = false;
      try {
        await git.resolveRef({ fs, dir: repoDir, ref: "HEAD" });
        isGitRepo = true;
      } catch (e) {
        isGitRepo = false;
      }

      if (!isGitRepo) {
        console.error("Not a git repository, cannot delete file");
        throw new Error("Not a git repository, cannot delete file");
      }

      // Fetch latest changes
      try {
        const remotes = await git.listRemotes({ fs, dir: repoDir });
        const hasOrigin = remotes.some((r: any) => r.remote === "origin");

        if (hasOrigin) {
          try {
            await git.fetch({
              fs,
              http,
              dir: repoDir,
              remote: "origin",
              ref: defaultBranch,
              onAuth: () => this.getGitCredentials(),
            });
            console.log("Fetched latest changes from remote");

            const currentBranch = await git.currentBranch({ fs, dir: repoDir });
            if (currentBranch !== defaultBranch) {
              await git.checkout({ fs, dir: repoDir, ref: defaultBranch });
              console.log(`Switched to ${defaultBranch} branch`);
            }

            try {
              await git.merge({
                fs,
                dir: repoDir,
                theirs: `origin/${defaultBranch}`,
                author,
              });
              console.log(`Merged changes from origin/${defaultBranch}`);
            } catch (mergeError) {
              console.log(`Could not merge: ${mergeError.message}`);
              throw new Error(`Could not merge: ${mergeError.message}`);
            }
          } catch (fetchError) {
            console.log(`Could not fetch: ${fetchError.message}`);
            throw new Error(`Could not fetch: ${fetchError.message}`);
          }
        }
      } catch (remoteError) {
        console.error(`Error checking remotes: ${remoteError.message}`);
        throw new Error(`Error checking remotes: ${remoteError.message}`);
      }

      if (!fs.existsSync(filePath)) {
        console.log(`File ${fileName} does not exist in repository`);
        throw new Error(`File ${fileName} does not exist in repository`);
      }

      try {
        // Remove the file from the filesystem and git
        fs.unlinkSync(filePath);
        const relativeFilePath = path.join(this.notebooksFolder, fileName);
        await git.remove({ fs, dir: repoDir, filepath: relativeFilePath });

        const commitId = await git.commit({
          fs,
          dir: repoDir,
          author,
          message: commitMessage,
        });
        console.log(`Committed deletion with ID: ${commitId}`);
      } catch (error) {
        console.error(`Error removing file: ${error.message}`);
        throw new Error(`Error removing file: ${error.message}`);
      }

      try {
        await git.push({
          fs,
          http,
          dir: repoDir,
          remote: "origin",
          ref: defaultBranch,
          onAuth: () => this.getGitCredentials(),
        });
        console.log(`Pushed deletion to origin/${defaultBranch}`);
      } catch (pushError) {
        console.error(`Push failed: ${pushError.message}`);
        throw new Error(`Push failed: ${pushError.message}`);
      }
    } catch (error) {
      console.error(`Git operation failed during deletion: ${error.message}`);
      throw new Error(`Git operation failed during deletion: ${error.message}`);
    }
  }

  async overwriteNotebookFromRemote(notebookId: string) {
    const gitConfig = await this.getGitConfig();
    if (!gitConfig || Object.keys(gitConfig).length === 0) {
      console.log("Git config not set, skip git operations");
      return {
        message: "Git config not set, skip git operations",
        overwritten: false,
        notebookId: notebookId,
      };
    }

    const {
      repoUrl: gitRemoteUrl,
      branch: defaultBranch,
      pat: gitCredentials,
    } = gitConfig;

    if (!gitRemoteUrl || !defaultBranch) {
      throw new Error("Git remote URL or default branch not configured");
    }

    const repoDir = this.gitRepoPath;
    const notebooksDir = path.join(repoDir, this.notebooksFolder);
    const fileName = `${notebookId}.json`;
    const filePath = path.join(notebooksDir, fileName);

    try {
      await this.ensureLatestFromRemote(
        repoDir,
        gitRemoteUrl,
        defaultBranch,
        gitCredentials
      );

      // Check if file exists in remote
      if (!fs.existsSync(filePath)) {
        return {
          message: `Notebook ${notebookId} not found in remote repository, no action taken`,
          overwritten: false,
          notebookId: notebookId,
        };
      }

      const remoteNotebookData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const localNotebook = await this.getNotebook(notebookId);

      if (localNotebook) {
        // Compare the actual notebook content
        const localNotebookContent = JSON.stringify(
          localNotebook.notebookContent || ""
        );
        const remoteNotebookContent = JSON.stringify(
          remoteNotebookData.notebookContent || ""
        );

        if (localNotebookContent === remoteNotebookContent) {
          return {
            message: `Notebook ${notebookId} content is identical to remote, no action taken`,
            overwritten: false,
            notebookId: notebookId,
          };
        }
      }

      // Update notebook from remote data
      const updatedNotebook = {
        id: notebookId,
        name:
          remoteNotebookData.name ||
          localNotebook?.name ||
          `Imported Notebook ${notebookId}`,
        notebookContent: remoteNotebookData.notebookContent || "",
        isShared: remoteNotebookData.isShared || false,
        userId: this.userId,
      };

      if (localNotebook) {
        const updatedServiceEntity = this.addOwner({
          userId: this.userId,
          id: notebookId,
          serviceArtifact: updatedNotebook,
        });
        await this.userArtifactService.updateServiceArtifactEntity(
          ServiceName.NOTEBOOKS,
          updatedServiceEntity
        );
      } else {
        const newServiceEntity = this.addOwner(updatedNotebook, true);
        await this.userArtifactService.createServiceArtifact(
          ServiceName.NOTEBOOKS,
          {
            serviceArtifact: newServiceEntity,
          }
        );
      }

      console.log(`Overwritten notebook ${notebookId} from remote`);

      return {
        message: `Successfully overwritten notebook ${notebookId} from remote due to content mismatch`,
        overwritten: true,
        notebookId: notebookId,
      };
    } catch (error) {
      console.error(
        `Failed to overwrite notebook from remote: ${error.message}`
      );
      throw error;
    }
  }

  private async ensureLatestFromRemote(
    repoDir: string,
    gitRemoteUrl: string,
    defaultBranch: string,
    gitCredentials: string
  ) {
    // Ensure directory exists
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }

    let isGitRepo = false;
    try {
      await git.resolveRef({ fs, dir: repoDir, ref: "HEAD" });
      isGitRepo = true;
    } catch (e) {
      isGitRepo = false;
    }

    if (!isGitRepo) {
      console.log(`Cloning repository from ${gitRemoteUrl}`);
      await git.clone({
        fs,
        http,
        dir: repoDir,
        url: gitRemoteUrl,
        singleBranch: true,
        depth: 1,
        ref: defaultBranch,
        onAuth: () => ({
          username: gitCredentials,
        }),
      });
      console.log(`Successfully cloned repository`);
    } else {
      try {
        await git.fetch({
          fs,
          http,
          dir: repoDir,
          remote: "origin",
          ref: defaultBranch,
          onAuth: () => ({
            username: gitCredentials,
          }),
        });

        const currentBranch = await git.currentBranch({ fs, dir: repoDir });
        if (currentBranch !== defaultBranch) {
          await git.checkout({ fs, dir: repoDir, ref: defaultBranch });
        }

        // Force update to match remote exactly
        try {
          await git.checkout({
            fs,
            dir: repoDir,
            ref: `origin/${defaultBranch}`,
            force: true,
          });
          console.log(`Force updated local repository to match remote`);
        } catch (checkoutError) {
          console.error(`Failed to force checkout: ${checkoutError.message}`);
          throw new Error(`Failed to force checkout: ${checkoutError.message}`);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch from remote: ${fetchError.message}`);
        throw new Error(`Failed to fetch from remote: ${fetchError.message}`);
      }
    }
  }

  async checkNotebookDiffFromRemote(notebookId: string) {
    const gitConfig = await this.getGitConfig();
    if (!gitConfig || Object.keys(gitConfig).length === 0) {
      return { hasDifferences: false, reason: "Git config not set" };
    }

    const {
      repoUrl: gitRemoteUrl,
      branch: defaultBranch,
      pat: gitCredentials,
    } = gitConfig;

    if (!gitRemoteUrl || !defaultBranch) {
      return {
        hasDifferences: false,
        reason: "Git remote URL or default branch not configured",
      };
    }

    const repoDir = this.gitRepoPath;
    const notebooksDir = path.join(repoDir, this.notebooksFolder);
    const fileName = `${notebookId}.json`;
    const filePath = path.join(notebooksDir, fileName);

    try {
      await this.ensureLatestFromRemote(
        repoDir,
        gitRemoteUrl,
        defaultBranch,
        gitCredentials
      );

      if (!fs.existsSync(filePath)) {
        return {
          hasDifferences: false,
          reason: "Notebook not found in remote repository",
        };
      }

      const remoteNotebookData = JSON.parse(fs.readFileSync(filePath, "utf8"));

      try {
        const localNotebook = await this.getNotebook(notebookId);

        const localNotebookContent = JSON.stringify(
          localNotebook.notebookContent || ""
        );
        const remoteNotebookContent = JSON.stringify(
          remoteNotebookData.notebookContent || ""
        );
        console.log(`localNotebookContent: ${localNotebookContent}`);
        console.log(`remoteNotebookContent: ${remoteNotebookContent}`);
        const hasDifferences = localNotebookContent !== remoteNotebookContent;

        return {
          hasDifferences,
          reason: hasDifferences
            ? "Content differs from remote"
            : "Content is identical to remote",
        };
      } catch (notFoundError) {
        console.log(`No local notebook found for ${notebookId}`);
        return { hasDifferences: true, reason: "No local notebook found" };
      }
    } catch (error) {
      console.error(`Failed to check notebook diff: ${error.message}`);
      return {
        hasDifferences: false,
        reason: `Error checking differences: ${error.message}`,
      };
    }
  }

  async overwriteAllNotebooksFromRemote() {
    const gitConfig = await this.getGitConfig();
    if (!gitConfig || Object.keys(gitConfig).length === 0) {
      throw new Error("Git config not set, cannot sync from remote");
    }

    const {
      repoUrl: gitRemoteUrl,
      branch: defaultBranch,
      pat: gitCredentials,
    } = gitConfig;

    if (!gitRemoteUrl || !defaultBranch) {
      throw new Error("Git remote URL or default branch not configured");
    }

    const repoDir = this.gitRepoPath;

    try {
      // Ensure we have the latest from remote
      await this.ensureLatestFromRemote(
        repoDir,
        gitRemoteUrl,
        defaultBranch,
        gitCredentials
      );

      // Clear all local notebooks for this user
      const existingNotebooks = await this.getNotebooksByUserId();
      for (const notebook of existingNotebooks) {
        await this.userArtifactService.deleteUserServiceArtifact(
          this.userId,
          ServiceName.NOTEBOOKS,
          notebook.id
        );
      }

      let files: string[] = [];
      const notebooksDir = path.join(repoDir, this.notebooksFolder);
      if (fs.existsSync(notebooksDir)) {
        files = fs
          .readdirSync(notebooksDir)
          .filter((file) => file.endsWith(".json"));
      } else {
        console.log(`Notebooks folder does not exist`);
        return {
          message: `No notebooks folder found`,
          processedCount: 0,
          results: [],
        };
      }

      const results: any[] = [];

      for (const fileName of files) {
        const notebookId = fileName.replace(".json", "");
        const filePath = path.join(notebooksDir, fileName);

        try {
          const remoteNotebookData = JSON.parse(
            fs.readFileSync(filePath, "utf8")
          );

          const notebookEntity = this.addOwner(
            {
              id: notebookId,
              name: remoteNotebookData.name || `Notebook ${notebookId}`,
              notebookContent: remoteNotebookData.notebookContent || "",
              isShared: remoteNotebookData.isShared || false,
              userId: this.userId,
            },
            true
          );

          await this.userArtifactService.createServiceArtifact(
            ServiceName.NOTEBOOKS,
            {
              serviceArtifact: notebookEntity,
            }
          );

          results.push({
            notebookId: notebookId,
            name: notebookEntity.name,
          });
        } catch (fileError) {
          console.error(
            `Failed to process file ${fileName}: ${fileError.message}`
          );
          results.push({
            notebookId: notebookId,
            error: `Failed to process: ${fileError.message}`,
          });
        }
      }

      console.log(
        `Successfully overwritten all notebooks from remote. Processed ${files.length} files`
      );

      return {
        message: `Successfully overwritten all notebooks from remote`,
        processedCount: files.length,
        results: results,
      };
    } catch (error) {
      console.error(
        `Failed to overwrite all notebooks from remote: ${error.message}`
      );
      throw error;
    }
  }

  async getTemplates(): Promise<NotebookTemplateDto[]> {
    try {
      const templateRepoUrl = env.NOTEBOOK_TEMPLATE_REPO_URL;
      const templateBranch = env.NOTEBOOK_TEMPLATE_BRANCH;

      const repoDir = this.templateRepoPath;
      const subDir = this.notebooksFolder;
      const subDirPath = path.join(repoDir, subDir);

      await this.ensureLatestFromTemplateRemote(
        repoDir,
        templateRepoUrl,
        templateBranch
      );

      let files: string[] = [];
      if (fs.existsSync(subDirPath)) {
        files = fs
          .readdirSync(subDirPath)
          .filter((file) => file.endsWith(".json"));
      } else {
        console.log(`Template notebooks folder does not exist in repository`);
        return [];
      }

      const templates: NotebookTemplateDto[] = [];

      for (const fileName of files) {
        const templateId = fileName.replace(".json", "");
        const filePath = path.join(subDirPath, fileName);

        try {
          const templateData = JSON.parse(fs.readFileSync(filePath, "utf8"));

          templates.push({
            id: templateId,
            name: templateData.name || templateId,
            description: templateData.description || `Template: ${templateId}`,
            notebookContent: templateData.notebookContent || templateData,
          });
        } catch (fileError) {
          console.error(
            `Failed to process template file ${fileName}: ${fileError.message}`
          );
        }
      }

      console.log(`Found ${templates.length} notebook templates`);
      return templates;
    } catch (error) {
      console.error(`Failed to fetch notebook templates: ${error.message}`);
      throw error;
    }
  }

  async createNotebookFromTemplate(
    templateId: string,
    name: string
  ): Promise<INotebook> {
    try {
      const templateRepoUrl = env.NOTEBOOK_TEMPLATE_REPO_URL;
      const templateBranch = env.NOTEBOOK_TEMPLATE_BRANCH;

      const repoDir = this.templateRepoPath;
      const subDir = this.notebooksFolder;
      const fileName = `${templateId}.json`;
      const filePath = path.join(repoDir, subDir, fileName);

      await this.ensureLatestFromTemplateRemote(
        repoDir,
        templateRepoUrl,
        templateBranch
      );

      if (!fs.existsSync(filePath)) {
        throw new Error(`Template ${templateId} not found`);
      }

      const templateData = JSON.parse(fs.readFileSync(filePath, "utf8"));

      const notebookDto: INotebookBaseDto = {
        name,
        notebookContent: templateData.notebookContent || templateData,
      };

      const result = await this.createNotebook(notebookDto);

      console.log(
        `Created new notebook from template ${templateId} with id ${result.id}`
      );

      return result;
    } catch (error) {
      console.error(
        `Failed to create notebook from template: ${error.message}`
      );
      throw error;
    }
  }

  private async ensureLatestFromTemplateRemote(
    repoDir: string,
    gitRemoteUrl: string,
    defaultBranch: string,
    gitCredentials?: string
  ) {
    try {
      if (!gitRemoteUrl) {
        throw new Error("Git remote URL is not configured");
      }

      const isRepo = fs.existsSync(path.join(repoDir, ".git"));
      const authConfig = gitCredentials
        ? { onAuth: () => ({ username: gitCredentials }) }
        : {};

      if (isRepo) {
        // Repository exists, pull latest changes
        console.log(`Pulling latest changes for template repo...`);
        await git.pull({
          fs,
          http,
          dir: repoDir,
          author: this.gitConfig.defaultAuthor,
          ...authConfig,
        });
        console.log(`Successfully pulled latest changes for template repo`);
      } else {
        // Repository doesn't exist, clone it
        console.log(`Cloning template repository from ${gitRemoteUrl}...`);
        await git.clone({
          fs,
          http,
          dir: repoDir,
          url: gitRemoteUrl,
          ref: defaultBranch,
          singleBranch: true,
          depth: 1,
          ...authConfig,
        });
        console.log(`Successfully cloned template repository`);
      }
    } catch (error) {
      console.error(`Failed to sync with template remote: ${error.message}`);
      throw error;
    }
  }
}
