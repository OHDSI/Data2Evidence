import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  SCOPE,
} from "@danet/core";
import fs from "node:fs";
import * as path from "node:path";
import http from "npm:isomorphic-git/http/web/index.js";
import git from "npm:isomorphic-git@1.27.1";
import { v4 as uuidv4 } from "npm:uuid";
import { DEFAULT_ERROR_MESSAGE } from "../common/const.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { createLogger } from "../logger.ts";
import { INotebook, INotebookBaseDto, INotebookUpdateDto } from "../types.d.ts";
import { ServiceName } from "../user-artifact/enums/index.ts";
import { UserArtifactService } from "../user-artifact/user-artifact.service.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class NotebookService {
  private readonly logger = createLogger(this.constructor.name);
  private readonly userId: string;
  private readonly gitRepoPath = "./NotebookRepository";
  private readonly gitRemoteUrl =
    "https://github.com/hengxian-jiang/Notebook.git";
  private readonly gitConfig = {
    defaultAuthor: {
      name: "Notebook System",
      email: "system@notebook.example.com",
    },
  };

  constructor(
    private readonly userArtifactService: UserArtifactService,
    private readonly requestContextService: RequestContextService
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub;

    // Ensure git repo directory exists
    if (!fs.existsSync(this.gitRepoPath)) {
      fs.mkdirSync(this.gitRepoPath, { recursive: true });
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
    const repoDir = this.gitRepoPath; // Use a single repository for all notebooks
    const fileName = `${notebookId}.json`; // Each notebook gets its own file
    const filePath = path.join(repoDir, fileName);
    const defaultBranch = "main";

    if (!this.gitRemoteUrl) {
      console.log("Git remote URL not configured, skipping Git operations");
      return;
    }

    const author = {
      name: notebookEntity.createdBy || this.gitConfig.defaultAuthor.name,
      email: `${notebookEntity.createdBy || "system"}@notebook.example.com`,
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
          console.log(`Cloning repository from ${this.gitRemoteUrl}`);
          await git.clone({
            fs,
            http,
            dir: repoDir,
            url: this.gitRemoteUrl,
            singleBranch: true,
            depth: 1,
            ref: defaultBranch,
            onAuth: () => this.getGitCredentials(),
          });
          console.log(`Successfully cloned repository`);
        } catch (cloneError) {
          console.error(
            `Failed to clone repository: ${cloneError.message}`
          );
          throw new Error(
            `Remote repository not found or inaccessible. Please ensure the repository exists at ${this.gitRemoteUrl}`
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
              }
            } catch (fetchError) {
              console.log(`Could not fetch: ${fetchError.message}`);
            }
          } else {
            // If no remote is configured, add it
            try {
              await git.addRemote({
                fs,
                dir: repoDir,
                remote: "origin",
                url: this.gitRemoteUrl,
              });
              console.log(`Added remote: ${this.gitRemoteUrl}`);

              // Try to fetch after adding remote
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
                `Failed to connect to remote repository at ${this.gitRemoteUrl}`
              );
            }
          }
        } catch (remoteError) {
          console.error(`Error checking remotes: ${remoteError.message}`);
        }
      }

      const notebookData = JSON.stringify(notebookEntity, null, 2);
      fs.writeFileSync(filePath, notebookData);

      await git.add({ fs, dir: repoDir, filepath: fileName });

      const status = await git.status({ fs, dir: repoDir, filepath: fileName });
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
              `Failed to push changes to remote repository. Please ensure you have write access to ${this.gitRemoteUrl}`
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
    }
  }

  private getGitCredentials() {
    const token = "";

    if (token) {
      return {
        username: token,
      };
    }
    return null;
  }

  private async deleteFromGitRepo(
    notebookId: string,
    commitMessage: string
  ) {
    if (!this.gitRemoteUrl) {
      console.log(
        "Git remote URL not configured, skipping Git operations"
      );
      return;
    }

    const repoDir = this.gitRepoPath;
    const fileName = `${notebookId}.json`;
    const filePath = path.join(repoDir, fileName);
    const defaultBranch = "main";

    const author = {
      name: this.userId || this.gitConfig.defaultAuthor.name,
      email: `${this.userId || "system"}@notebook.example.com`,
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
        return;
      }

      // Fetch latest changes
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
            }
          } catch (fetchError) {
            console.log(`Could not fetch: ${fetchError.message}`);
          }
        }
      } catch (remoteError) {
        console.error(`Error checking remotes: ${remoteError.message}`);
      }

      if (!fs.existsSync(filePath)) {
        console.log(`File ${fileName} does not exist in repository`);
        return;
      }

      // Remove the file from the filesystem and git
      fs.unlinkSync(filePath);
      await git.remove({ fs, dir: repoDir, filepath: fileName });

      const commitId = await git.commit({
        fs,
        dir: repoDir,
        author,
        message: commitMessage,
      });
      console.log(`Committed deletion with ID: ${commitId}`);

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
      }
    } catch (error) {
      console.error(
        `Git operation failed during deletion: ${error.message}`
      );
    }
  }
}
