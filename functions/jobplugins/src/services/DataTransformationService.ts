import fs from "node:fs";
import * as path from "node:path";
import http from "npm:isomorphic-git/http/web/index.js";
import git from "npm:isomorphic-git@1.27.1";
import { v4 as uuidv4 } from "uuid";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import dataSource from "../db/datasource.ts";
import { Canvas } from "../entities/canvas.ts";
import { Graph } from "../entities/graph.ts";
import { IDataflowDto, IDataflowDuplicateDto, NodeData } from "../types.ts";

export class TransformationService {
  private readonly logger = console;
  private canvasRepo;
  private graphRepo;
  private prefectApi;
  private readonly gitRepoPath = "./DataTransformation";
  private readonly gitRemoteUrl =
    "https://github.com/hengxian-jiang/DataTransformation.git";
  private readonly gitConfig = {
    defaultAuthor: {
      name: "Dataflow System",
      email: "system@dataflow.example.com",
    },
  };

  constructor() {
    this.canvasRepo = dataSource.getRepository(Canvas);
    this.graphRepo = dataSource.getRepository(Graph);
    // Ensure git repo directory exists
    if (!fs.existsSync(this.gitRepoPath)) {
      fs.mkdirSync(this.gitRepoPath, { recursive: true });
    }
  }

  async getLatestGraphByCanvasId(id: string) {
    return await this.graphRepo
      .createQueryBuilder("revision")
      .leftJoin("revision.canvas", "dataflow")
      .select([
        "dataflow.id",
        "dataflow.name",
        "dataflow.lastFlowRunId",
        "revision.id",
        "revision.flow",
        "revision.comment",
        "revision.createdDate",
        "revision.createdBy",
        "revision.version",
      ])
      .where("dataflow.id = :id", { id })
      .orderBy("revision.createdDate", "DESC")
      .getOne();
  }

  async getResultsByCanvasId(dataflowId: string, token: string) {
    const dataflow = await this.canvasRepo
      .createQueryBuilder("dataflow")
      .select("dataflow.lastFlowRunId")
      .where("dataflow.id = :dataflowId", { dataflowId })
      .getOne();
    const lastFlowRunId = dataflow?.lastFlowRunId;
    if (!lastFlowRunId) {
      console.log("No last flowRun found for dataflowId:", dataflowId);
      return [];
    }
    this.prefectApi = new PrefectAPI(token);
    try {
      const res = await this.prefectApi.getFlowRunsArtifactsByFlowRunId(
        lastFlowRunId
      );
      const transformedRes = res
        .map((artifact) => {
          const parsedData = JSON.parse(artifact.data);
          return Object.entries(parsedData).map(([nodeName, nodeData]) => {
            const data = nodeData as NodeData;
            const simplifiedData = this.simplifyJson(data);
            return {
              nodeName,
              taskRunResult: {
                result: simplifiedData,
              },
              error: data.error,
              errorMessage: data.error ? data.errorMessage : null,
            };
          });
        })
        .flat();
      return transformedRes;
    } catch (error) {
      console.log(`Data transformation result not found: ${error.message}`);
      throw new Error("Data transformation result not found");
    }
  }

  private simplifyJson(object: Object) {
    // Base case
    if (typeof object !== "object" || object === null) {
      return object;
    }
    // Keep first 50 elements of array
    if (Array.isArray(object)) {
      return object.slice(0, 50).map((item) => this.simplifyJson(item));
    }

    const simplifiedObject = {};
    // Keep first 50 key-value pairs of object
    const keys = Object.keys(object).slice(0, 50);
    for (const key of keys) {
      const value = object[key];
      if (typeof value === "object") {
        simplifiedObject[key] = this.simplifyJson(value);
      } else {
        simplifiedObject[key] = value;
      }
    }
    return simplifiedObject;
  }

  async getCanvasList() {
    return await this.canvasRepo
      .createQueryBuilder("dataflow")
      .where("dataflow.type = :type", { type: "datatransformation-flow" })
      .getMany();
  }

  async createCanvas(dataflowDto: IDataflowDto, token: string) {
    const id = dataflowDto.id ? dataflowDto.id : uuidv4();
    const canvas = {
      id,
      name: dataflowDto.name,
      type: "datatransformation-flow",
    };

    console.log(`createCanvas with canvas id: ${id}`);
    let version = 1;
    if (dataflowDto.id) {
      const lastDataflowRevision = await this.getLatestGraphByCanvasId(
        dataflowDto.id
      );
      version += lastDataflowRevision.version;
      await this.canvasRepo.update(
        dataflowDto.id,
        this.addOwner(token, canvas)
      );
    } else {
      await this.canvasRepo.insert(this.addOwner(token, canvas, true));
    }

    const { comment, ...flow } = dataflowDto.dataflow;
    const graphEntity = this.graphRepo.create({
      id: uuidv4(),
      canvasId: canvas.id,
      flow,
      comment,
      version,
    });
    await this.graphRepo.insert(this.addOwner(token, graphEntity, true));
    this.logger.info(
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`
    );

    await this.saveToGitRepo(
      canvas.id,
      graphEntity,
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`
    );

    return {
      id: canvas.id,
      revisionId: graphEntity.id,
      version: graphEntity.version,
    };
  }

  async deleteCanvas(id: string) {
    await this.canvasRepo.delete(id);
    await this.deleteFromGitRepo(id, `Deleted dataflow with id ${id}`);
    return { id };
  }

  async createDataflowRun(id, prefecflowRunId) {
    await this.canvasRepo.update({ id }, { lastFlowRunId: prefecflowRunId });
    this.logger.info(
      `Created dataflow run for dataflow ${id} with lastflowRunId ${prefecflowRunId}`
    );
  }

  private addOwner<T>(owner, object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: owner.sub,
        modifiedBy: owner.sub,
      };
    }
    return {
      ...object,
      modifiedBy: owner.sub,
    };
  }

  async duplicateCanvas(
    id: string,
    revisionId: string,
    dataflowDuplicateDto: IDataflowDuplicateDto,
    token
  ) {
    const flowEntity = await this.getCanvas(id);
    if (!flowEntity) {
      throw new Error("Dataflow does not exist");
    }
    const revisionEntity = flowEntity.revisions.find(
      (r) => r.id === revisionId
    );

    if (!revisionEntity) {
      throw new Error("Dataflow Revision does not exist");
    }
    const newDataflowEntity = this.addOwner(
      token,
      {
        id: uuidv4(),
        name: dataflowDuplicateDto.name,
        type: "datatransformation-flow",
      },
      true
    );

    const newRevisionEntity = this.addOwner(
      token,
      {
        id: uuidv4(),
        canvasId: newDataflowEntity.id,
        flow: revisionEntity.flow,
        version: 1,
      },
      true
    );

    await this.canvasRepo.save(newDataflowEntity);
    await this.graphRepo.save(newRevisionEntity);
    this.logger.info(
      `Created new revision for dataflow ${newDataflowEntity.name} with id ${newRevisionEntity.id}`
    );

    await this.saveToGitRepo(
      newDataflowEntity.id,
      newRevisionEntity,
      `Created new revision for dataflow ${newDataflowEntity.name} with id ${newRevisionEntity.id}`
    );

    return {
      id: newDataflowEntity.id,
      revisionId: newRevisionEntity.id,
      version: newRevisionEntity.version,
    };
  }

  async deleteGraph(flowId: string, revisionId: string) {
    const flowEntity = await this.getCanvas(flowId);
    if (flowEntity && flowEntity.revisions.find((r) => r.id === revisionId)) {
      await this.graphRepo.delete(revisionId);
      this.logger.info(`Deleted dataflow revision with id ${revisionId}`);

      const lastRev = await this.getLatestGraphByCanvasId(flowId);
      if (!lastRev) {
        await this.canvasRepo.delete(flowId);
      }

      await this.saveToGitRepo(
        flowId,
        lastRev,
        `Deleted dataflow revision with id ${revisionId}`
      );

      return {
        revisionId,
      };
    }

    throw new Error("Dataflow and/or dataflow revision do not match");
  }

  async getCanvas(id: string) {
    const result = await this.graphRepo
      .createQueryBuilder("revision")
      .leftJoin("revision.canvas", "canvas")
      .select([
        "canvas.id",
        "canvas.name",
        "revision.id",
        "revision.flow",
        "revision.comment",
        "revision.createdDate",
        "revision.createdBy",
        "revision.version",
      ])
      .where("canvas.id = :id", { id })
      .orderBy("revision.createdDate", "DESC")
      .getMany();

    if (!result.length) {
      return null;
    }

    return {
      id: result[0].canvas.id,
      name: result[0].canvas.name,
      revisions: result.map((rev) => ({
        id: rev.id,
        createdBy: rev.createdBy,
        createdDate: rev.createdDate.toISOString(),
        flow: rev.flow,
        comment: rev.comment,
        version: rev.version,
      })),
    };
  }

  private async saveToGitRepo(
    canvasId: string,
    graphEntity: any,
    commitMessage: string
  ) {
    const repoDir = this.gitRepoPath; // Use a single repository for all flows
    const fileName = `${canvasId}.json`; // Each flow gets its own file
    const filePath = path.join(repoDir, fileName);
    const defaultBranch = "main";

    const author = {
      name: graphEntity.createdBy || this.gitConfig.defaultAuthor.name,
      email:
        graphEntity.createdByEmail ||
        `${graphEntity.createdBy || "system"}@dataflow.example.com`,
    };

    try {
      // Ensure directory exists
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
      }

      // Check if it's already a git repository
      let isGitRepo = false;
      try {
        await git.resolveRef({ fs, dir: repoDir, ref: "HEAD" });
        isGitRepo = true;
      } catch (e) {
        isGitRepo = false;
      }

      if (!isGitRepo) {
        // If not a git repo, clone from remote
        try {
          this.logger.info(`Cloning repository from ${this.gitRemoteUrl}`);
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
          this.logger.info(`Successfully cloned repository`);
        } catch (cloneError) {
          // Clone fails due to the remote repository not exist
          this.logger.error(
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
              this.logger.info("Fetched latest changes from remote");

              const currentBranch = await git.currentBranch({
                fs,
                dir: repoDir,
              });
              if (currentBranch !== defaultBranch) {
                try {
                  await git.checkout({ fs, dir: repoDir, ref: defaultBranch });
                  this.logger.info(`Switched to ${defaultBranch} branch`);
                } catch (checkoutError) {
                  this.logger.error(
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
                this.logger.info(`Merged changes from origin/${defaultBranch}`);
              } catch (mergeError) {
                this.logger.info(`Could not merge: ${mergeError.message}`);
              }
            } catch (fetchError) {
              this.logger.info(`Could not fetch: ${fetchError.message}`);
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
              this.logger.info(`Added remote: ${this.gitRemoteUrl}`);

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
                this.logger.info("Fetched latest changes from remote");
              } catch (fetchError) {
                this.logger.info(
                  `Could not fetch after adding remote: ${fetchError.message}`
                );
              }
            } catch (remoteError) {
              this.logger.error(`Could not add remote: ${remoteError.message}`);
              throw new Error(
                `Failed to connect to remote repository at ${this.gitRemoteUrl}`
              );
            }
          }
        } catch (remoteError) {
          this.logger.error(`Error checking remotes: ${remoteError.message}`);
        }
      }

      const flowData = JSON.stringify(graphEntity.flow, null, 2);
      fs.writeFileSync(filePath, flowData);
      await git.add({ fs, dir: repoDir, filepath: fileName });

      // Check if there are changes to commit
      const status = await git.status({ fs, dir: repoDir, filepath: fileName });
      if (status !== "unmodified") {
        try {
          const commitId = await git.commit({
            fs,
            dir: repoDir,
            author,
            message: commitMessage,
          });
          this.logger.info(`Committed changes with ID: ${commitId}`);

          try {
            await git.push({
              fs,
              http,
              dir: repoDir,
              remote: "origin",
              ref: defaultBranch,
              onAuth: () => this.getGitCredentials(),
            });
            this.logger.info(`Pushed changes to origin/${defaultBranch}`);
          } catch (pushError) {
            this.logger.error(`Push failed: ${pushError.message}`);
            throw new Error(
              `Failed to push changes to remote repository. Please ensure you have write access to ${this.gitRemoteUrl}`
            );
          }
        } catch (commitError) {
          this.logger.error(`Commit failed: ${commitError.message}`);
          throw new Error(`Failed to commit changes: ${commitError.message}`);
        }
      } else {
        this.logger.info(`No changes to commit for flow ${canvasId}`);
      }
    } catch (error) {
      this.logger.error(`Git operation failed: ${error.message}`);
      throw error;
    }
  }

  private getGitCredentials() {
    // For GitHub Personal Access Token (PAT)
    const token = "";

    if (token) {
      return {
        username: token,
      };
    }
    return null;
  }

  private async deleteFromGitRepo(canvasId: string, commitMessage: string) {
    if (!this.gitRemoteUrl) {
      this.logger.info(
        "Git remote URL not configured, skipping Git operations"
      );
      return;
    }

    const repoDir = this.gitRepoPath;
    const fileName = `${canvasId}.json`;
    const filePath = path.join(repoDir, fileName);
    const defaultBranch = "main";

    const author = this.gitConfig.defaultAuthor;

    try {
      let isGitRepo = false;
      try {
        await git.resolveRef({ fs, dir: repoDir, ref: "HEAD" });
        isGitRepo = true;
      } catch (e) {
        isGitRepo = false;
      }

      if (!isGitRepo) {
        this.logger.error("Not a git repository, cannot delete file");
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
            this.logger.info("Fetched latest changes from remote");

            const currentBranch = await git.currentBranch({ fs, dir: repoDir });
            if (currentBranch !== defaultBranch) {
              await git.checkout({ fs, dir: repoDir, ref: defaultBranch });
              this.logger.info(`Switched to ${defaultBranch} branch`);
            }

            try {
              await git.merge({
                fs,
                dir: repoDir,
                theirs: `origin/${defaultBranch}`,
                author,
              });
              this.logger.info(`Merged changes from origin/${defaultBranch}`);
            } catch (mergeError) {
              this.logger.info(`Could not merge: ${mergeError.message}`);
            }
          } catch (fetchError) {
            this.logger.info(`Could not fetch: ${fetchError.message}`);
          }
        }
      } catch (remoteError) {
        this.logger.error(`Error checking remotes: ${remoteError.message}`);
      }

      if (!fs.existsSync(filePath)) {
        this.logger.info(`File ${fileName} does not exist in repository`);
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
      this.logger.info(`Committed deletion with ID: ${commitId}`);

      try {
        await git.push({
          fs,
          http,
          dir: repoDir,
          remote: "origin",
          ref: defaultBranch,
          onAuth: () => this.getGitCredentials(),
        });
        this.logger.info(`Pushed deletion to origin/${defaultBranch}`);
      } catch (pushError) {
        this.logger.error(`Push failed: ${pushError.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Git operation failed during deletion: ${error.message}`
      );
    }
  }
}
