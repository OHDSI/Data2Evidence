import fs from "fs";
import http from "http";
import git from "isomorphic-git";
import { JwtPayload, decode } from "jsonwebtoken";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
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
  private readonly gitConfig = {
    defaultAuthor: {
      name: "Dataflow System",
      email: "we@data4life-asia.care",
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
    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;

    console.log(`createCanvas with canvas id: ${id}`);
    let version = 1;
    if (dataflowDto.id) {
      const lastDataflowRevision = await this.getLatestGraphByCanvasId(
        dataflowDto.id
      );
      version += lastDataflowRevision.version;
      await this.canvasRepo.update(
        dataflowDto.id,
        this.addOwner(decodedToken, canvas)
      );
    } else {
      await this.canvasRepo.insert(this.addOwner(decodedToken, canvas, true));
    }

    const { comment, ...flow } = dataflowDto.dataflow;
    const graphEntity = this.graphRepo.create({
      id: uuidv4(),
      canvasId: canvas.id,
      flow,
      comment,
      version,
    });
    await this.graphRepo.insert(this.addOwner(decodedToken, graphEntity, true));
    this.logger.info(
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`
    );

    await this.saveToGitRepo(
      canvas.id,
      graphEntity,
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`,
      token
    );

    return {
      id: canvas.id,
      revisionId: graphEntity.id,
      version: graphEntity.version,
    };
  }

  async deleteCanvas(id: string, token: string) {
    await this.canvasRepo.delete(id);
    await this.deleteFromGitRepo(id, `Deleted dataflow with id ${id}`, token);
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
    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
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
      decodedToken,
      {
        id: uuidv4(),
        name: dataflowDuplicateDto.name,
        type: "datatransformation-flow",
      },
      true
    );

    const newRevisionEntity = this.addOwner(
      decodedToken,
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
      `Created new revision for dataflow ${newDataflowEntity.name} with id ${newRevisionEntity.id}`,
      token
    );

    return {
      id: newDataflowEntity.id,
      revisionId: newRevisionEntity.id,
      version: newRevisionEntity.version,
    };
  }

  async deleteGraph(flowId: string, revisionId: string, token: string) {
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
        `Deleted dataflow revision with id ${revisionId}`,
        token
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
    commitMessage: string,
    token: string
  ) {
    const portalServerApi = new PortalServerAPI(token);
    const gitConfig = await portalServerApi.getConfigByType("dataflow-git-config");
    if (!gitConfig) {
      this.logger.info(`Git config not set, skip git operations`);
      return;
    }
    const repoDir = this.gitRepoPath; // Use a single repository for all flows
    const subDir = "flows"; // New subfolder
    const fileName = `${canvasId}.json`; // Each flow gets its own file
    const filePath = path.join(repoDir, subDir, fileName);
    const gitConfigValue = JSON.parse(gitConfig.value);
    const defaultBranch = gitConfigValue.branch;
    const gitRemoteUrl = gitConfigValue.repoUrl;
    const gitCredentials = gitConfigValue.pat;

    const author = {
      name: graphEntity.createdBy || this.gitConfig.defaultAuthor.name,
      email: `we@data4life-asia.care`,
    };

    if (!gitRemoteUrl || !defaultBranch) {
      this.logger.info(
        "Git remote URL or default branch not configured, skipping Git operations"
      );
      return
    }

    try {
      // Ensure directory exists
      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir, { recursive: true });
      }

      // Ensure subdirectory exists
      const subDirPath = path.join(repoDir, subDir);
      if (!fs.existsSync(subDirPath)) {
        fs.mkdirSync(subDirPath, { recursive: true });
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
          this.logger.info(`Cloning repository from ${gitRemoteUrl}`);
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
          this.logger.info(`Successfully cloned repository`);
        } catch (cloneError) {
          // Clone fails due to the remote repository not exist
          this.logger.error(
            `Failed to clone repository: ${cloneError.message}`
          );
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
                onAuth: () => ({
                  username: gitCredentials,
                }),
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
                throw new Error(`Could not merge: ${mergeError.message}`);
              }
            } catch (fetchError) {
              this.logger.info(`Could not fetch: ${fetchError.message}`);
              throw new Error(`Could not fetch: ${fetchError.message}`);
            }
          } else {
            // If no remote is configured, add it
            try {
              await git.addRemote({
                fs,
                dir: repoDir,
                remote: "origin",
                url: gitRemoteUrl,
              });
              this.logger.info(`Added remote: ${gitRemoteUrl}`);

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
                this.logger.info("Fetched latest changes from remote");
              } catch (fetchError) {
                this.logger.info(
                  `Could not fetch after adding remote: ${fetchError.message}`
                );
                throw new Error(`Could not fetch after adding remote: ${fetchError.message}`);
              }
            } catch (remoteError) {
              this.logger.error(`Could not add remote: ${remoteError.message}`);
              throw new Error(
                `Failed to connect to remote repository at ${gitRemoteUrl}`
              );
            }
          }
        } catch (remoteError) {
          this.logger.error(`Error checking remotes: ${remoteError.message}`);
          throw new Error(`Error checking remotes: ${remoteError.message}`);
        }
      }

      const flowData = JSON.stringify(graphEntity.flow, null, 2);
      fs.writeFileSync(filePath, flowData);
      await git.add({ fs, dir: repoDir, filepath: path.join(subDir, fileName) });

      // Check if there are changes to commit
      const status = await git.status({ fs, dir: repoDir, filepath: path.join(subDir, fileName) });
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
              onAuth: () => ({
                username: gitCredentials,
              }),
            });
            this.logger.info(`Pushed changes to origin/${defaultBranch}`);
          } catch (pushError) {
            this.logger.error(`Push failed: ${pushError.message}`);
            throw new Error(
              `Failed to push changes to remote repository. Please ensure you have write access to ${gitRemoteUrl}`
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

  private async deleteFromGitRepo(canvasId: string, commitMessage: string, token: string) {
    const portalServerApi = new PortalServerAPI(token);
    const gitConfig = await portalServerApi.getConfigByType("dataflow-git-config");
    if (!gitConfig){
      this.logger.info(`Git config not set, skip git operations`);
      return
    }
    const gitConfigValue = JSON.parse(gitConfig.value);
    const defaultBranch = gitConfigValue.branch;
    const gitRemoteUrl = gitConfigValue.repoUrl;
    const gitCredentials = gitConfigValue.pat;

    if (!gitRemoteUrl || !defaultBranch) {
      this.logger.info(
        "Git remote URL or default branch not configured, skipping Git operations"
      );
      return;
    }

    const repoDir = this.gitRepoPath;
    const subDir = "flows"; // New subfolder
    const fileName = `${canvasId}.json`;
    const filePath = path.join(repoDir, subDir, fileName);

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
              onAuth: () => ({
                username: gitCredentials,
              }),
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

      
      try {
        // Remove the file from the filesystem and git
        fs.unlinkSync(filePath);
        await git.remove({ fs, dir: repoDir, filepath: path.join(subDir, fileName) });

        const commitId = await git.commit({
          fs,
          dir: repoDir,
          author,
          message: commitMessage,
        });
        this.logger.info(`Committed deletion with ID: ${commitId}`);
      } catch (error) {
        this.logger.error(`Error removing file: ${error.message}`);
        throw new Error(`Error removing file: ${error.message}`);
      }

      try {
        await git.push({
          fs,
          http,
          dir: repoDir,
          remote: "origin",
          ref: defaultBranch,
          onAuth: () => ({
            username: gitCredentials,
          }),
        });
        this.logger.info(`Pushed deletion to origin/${defaultBranch}`);
      } catch (pushError) {
        this.logger.error(`Push failed: ${pushError.message}`);
        throw new Error(`Push failed: ${pushError.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Git operation failed during deletion: ${error.message}`
      );
      throw new Error(`Git operation failed during deletion: ${error.message}`);
    }
  }

  async overwriteCanvasFromRemote(canvasId: string, token: string) {
    const portalServerApi = new PortalServerAPI(token);
    const gitConfig = await portalServerApi.getConfigByType("dataflow-git-config");
    if (!gitConfig) {
      this.logger.info("Git config not set, skip git operations");
      return {
        message: "Git config not set, skip git operations",
        overwritten: false,
        canvasId: canvasId
      };
    }

    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
    const gitConfigValue = JSON.parse(gitConfig.value);
    const defaultBranch = gitConfigValue.branch;
    const gitRemoteUrl = gitConfigValue.repoUrl;
    const gitCredentials = gitConfigValue.pat;

    if (!gitRemoteUrl || !defaultBranch) {
      throw new Error("Git remote URL or default branch not configured");
    }

    const repoDir = this.gitRepoPath;
    const subDir = "flows";
    const fileName = `${canvasId}.json`;
    const filePath = path.join(repoDir, subDir, fileName);

    try {
      await this.ensureLatestFromRemote(repoDir, gitRemoteUrl, defaultBranch, gitCredentials);

      // Check if file exists in remote
      if (!fs.existsSync(filePath)) {
        return {
          message: `Canvas ${canvasId} not found in remote repository, no action taken`,
          overwritten: false,
          canvasId: canvasId
        };
      }

      const remoteFlowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const localCanvas = await this.getCanvas(canvasId);
    
      let localVersion = 0;
      if (localCanvas && localCanvas.revisions.length > 0) {
        const latestLocalRevision = localCanvas.revisions[0];
        localVersion = latestLocalRevision.version;

        // Ensure the order matches
        const normalizeFlow = (flow: any) => ({
          nodes: flow.nodes || [],
          edges: flow.edges || []
        });
        
        // Compare the actual flow content
        const localFlowContent = JSON.stringify(normalizeFlow(latestLocalRevision.flow));
        const remoteFlowContent = JSON.stringify(normalizeFlow(remoteFlowData));
        
        this.logger.info(`Local flow content: ${localFlowContent}`);
        this.logger.info(`Remote flow conetent: ${remoteFlowContent}`);
        if (localFlowContent === remoteFlowContent) {
          return {
            message: `Canvas ${canvasId} content is identical to remote, no action taken`,
            overwritten: false,
            canvasId: canvasId,
            localVersion: localVersion
          };
        }
      }

      // Create/update canvas from remote data
      if (localCanvas) {
        await this.canvasRepo.update(canvasId, this.addOwner(decodedToken, {
          name: remoteFlowData.name || localCanvas.name,
          type: "datatransformation-flow"
        }));
      } else {
        const canvasEntity = {
          id: canvasId,
          name: remoteFlowData.name || `Imported Canvas ${canvasId}`,
          type: "datatransformation-flow"
        };
        await this.canvasRepo.insert(this.addOwner(decodedToken, canvasEntity, true));
      }

      // Create new revision from remote data
      const newVersion = localVersion + 1;
      const graphEntity = this.graphRepo.create({
        id: uuidv4(),
        canvasId: canvasId,
        flow: remoteFlowData,
        comment: `Overwritten from remote repository (content mismatch detected)`,
        version: newVersion,
      });
      
      await this.graphRepo.insert(this.addOwner(decodedToken, graphEntity, true));
      
      this.logger.info(`Overwritten canvas ${canvasId} from remote with version ${newVersion} (was version ${localVersion})`);
      
      return {
        message: `Successfully overwritten canvas ${canvasId} from remote due to content mismatch`,
        overwritten: true,
        canvasId: canvasId,
        revisionId: graphEntity.id,
        previousVersion: localVersion,
        newVersion: newVersion
      };

    } catch (error) {
      this.logger.error(`Failed to overwrite canvas from remote: ${error.message}`);
      throw error;
    }
  }

  async overwriteAllCanvasesFromRemote(token: string) {
    const portalServerApi = new PortalServerAPI(token);
    const gitConfig = await portalServerApi.getConfigByType("dataflow-git-config");
    if (!gitConfig) {
      throw new Error("Git config not set, cannot sync from remote");
    }

    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
    const gitConfigValue = JSON.parse(gitConfig.value);
    const defaultBranch = gitConfigValue.branch;
    const gitRemoteUrl = gitConfigValue.repoUrl;
    const gitCredentials = gitConfigValue.pat;

    if (!gitRemoteUrl || !defaultBranch) {
      throw new Error("Git remote URL or default branch not configured");
    }

    const repoDir = this.gitRepoPath;
    const subDir = "flows"; // New subfolder
    const subDirPath = path.join(repoDir, subDir);

    try {
      // Ensure we have the latest from remote
      await this.ensureLatestFromRemote(repoDir, gitRemoteUrl, defaultBranch, gitCredentials);

      // Clear all local data transformation canvases and their revisions
      const existingCanvases = await this.canvasRepo
        .createQueryBuilder("canvas")
        .where("canvas.type = :type", { type: "datatransformation-flow" })
        .getMany();

      // Delete all graphs first (due to foreign key constraints)
      for (const canvas of existingCanvases) {
        await this.graphRepo
          .createQueryBuilder()
          .delete()
          .where("canvasId = :canvasId", { canvasId: canvas.id })
          .execute();
      }

      // Delete all canvases
      await this.canvasRepo
        .createQueryBuilder()
        .delete()
        .where("type = :type", { type: "datatransformation-flow" })
        .execute();

      // Read all .json files from the flows subfolder
      let files = [];
      if (fs.existsSync(subDirPath)) {
        files = fs.readdirSync(subDirPath).filter(file => file.endsWith('.json'));
      } else {
        this.logger.info(`flows folder does not exist in repository`);
        return {
          message: `No flows folder found in remote repository`,
          processedCount: 0,
          results: []
        };
      }

      const results = [];

      for (const fileName of files) {
        const canvasId = fileName.replace('.json', '');
        const filePath = path.join(subDirPath, fileName);
        
        try {
          const remoteFlowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Create canvas
          const canvasEntity = {
            id: canvasId,
            name: remoteFlowData.name || `Canvas ${canvasId}`,
            type: "datatransformation-flow"
          };
          await this.canvasRepo.insert(this.addOwner(decodedToken, canvasEntity, true));

          // Create graph revision
          const graphEntity = this.graphRepo.create({
            id: uuidv4(),
            canvasId: canvasId,
            flow: remoteFlowData,
            comment: `Imported from remote repository`,
            version: 1,
          });
          
          await this.graphRepo.insert(this.addOwner(decodedToken, graphEntity, true));
          
          results.push({
            canvasId: canvasId,
            revisionId: graphEntity.id,
            name: canvasEntity.name
          });
          
        } catch (fileError) {
          this.logger.error(`Failed to process file ${fileName}: ${fileError.message}`);
          results.push({
            canvasId: canvasId,
            error: `Failed to process: ${fileError.message}`
          });
        }
      }

      this.logger.info(`Successfully overwritten all canvases from remote. Processed ${files.length} files`);
      
      return {
        message: `Successfully overwritten all canvases from remote`,
        processedCount: files.length,
        results: results
      };

    } catch (error) {
      this.logger.error(`Failed to overwrite all canvases from remote: ${error.message}`);
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
      this.logger.info(`Cloning repository from ${gitRemoteUrl}`);
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
      this.logger.info(`Successfully cloned repository`);
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
            force: true
          });
          this.logger.info(`Force updated local repository to match remote`);
        } catch (checkoutError) {
          this.logger.error(`Failed to force checkout: ${checkoutError.message}`);
          throw new Error(`Failed to force checkout: ${checkoutError.message}`);
        }

      } catch (fetchError) {
        this.logger.error(`Failed to fetch from remote: ${fetchError.message}`);
        throw new Error(`Failed to fetch from remote: ${fetchError.message}`);
      }
    }
  }
}
