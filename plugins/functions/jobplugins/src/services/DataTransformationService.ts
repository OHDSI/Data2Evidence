import { JwtPayload, decode } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Git } from "../../../_shared/git/Git.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import { GIT_REPO_CONSTANTS } from "../const.ts";
import dataSource from "../db/datasource.ts";
import { Canvas } from "../entities/canvas.ts";
import { Graph } from "../entities/graph.ts";
import { env } from "../env.ts";
import {
  CanvasResult,
  IDataflowDto,
  IDataflowDuplicateDto,
  NodeData,
  TemplateDto,
  TemplateFhirDto,
} from "../types.ts";

const JSON_FILE_FILTER = /\.json$/;

export class TransformationService {
  private readonly logger = console;
  private canvasRepo;
  private graphRepo;
  private prefectApi;
  private readonly gitRepoPath = "./DataTransformation";
  private readonly templateRepoPath = "./DataTransformationTemplates";
  private readonly defaultAuthor = {
    name: "Dataflow System",
    email: "we@data4life-asia.care",
  };

  constructor() {
    this.canvasRepo = dataSource.getRepository(Canvas);
    this.graphRepo = dataSource.getRepository(Graph);
  }

  // --- Git helpers ---

  private async getMainGit(token: string): Promise<Git | null> {
    const portalServerApi = new PortalServerAPI(token);
    const gitConfig = await portalServerApi.getConfigSecretByType(
      "dataflow-git-config",
    );
    if (!gitConfig?.value) return null;
    const cfg = JSON.parse(gitConfig.value) as {
      repoUrl?: string;
      branch?: string;
      pat?: string;
    };
    if (!cfg.repoUrl || !cfg.branch) return null;
    return new Git({
      repoDir: this.gitRepoPath,
      repoUrl: cfg.repoUrl,
      branch: cfg.branch,
      pat: cfg.pat,
      subDir: GIT_REPO_CONSTANTS.FLOWS_SUBDIR,
    });
  }

  private getTemplateGit(): Git {
    return new Git({
      repoDir: this.templateRepoPath,
      repoUrl: env.DATAFLOW_TEMPLATE_REPO_URL,
      branch: env.DATAFLOW_TEMPLATE_BRANCH,
      subDir: GIT_REPO_CONSTANTS.FLOWS_SUBDIR,
    });
  }

  private getFhirTemplateGit(): Git {
    return new Git({
      repoDir: this.templateRepoPath,
      repoUrl: env.FHIR_STRUCTURE_MAP_TEMPLATE_REPO_URL,
      branch: env.FHIR_STRUCTURE_MAP_TEMPLATE_REPO_BRANCH,
      subDir: GIT_REPO_CONSTANTS.FHIR_SUBDIR,
    });
  }

  private buildAuthor(name?: string) {
    return {
      name: name || this.defaultAuthor.name,
      email: this.defaultAuthor.email,
    };
  }

  // --- Public methods (DB / business logic, unchanged) ---

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
      const res =
        await this.prefectApi.getFlowRunsArtifactsByFlowRunId(lastFlowRunId);
      return res
        .map((artifact: { data: string }) => {
          const parsedData = JSON.parse(artifact.data);
          return Object.entries(parsedData).map(([nodeName, nodeData]) => {
            const data = nodeData as NodeData;
            return {
              nodeName,
              taskRunResult: { result: data },
              error: data.error,
              errorMessage: data.error ? data.errorMessage : null,
            };
          });
        })
        .flat();
    } catch (error: any) {
      console.log(`Data transformation result not found: ${error.message}`);
      throw new Error("Data transformation result not found");
    }
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

    if (
      await this.checkCanvasNameExists(
        dataflowDto.name,
        dataflowDto.id || undefined,
      )
    ) {
      throw new Error(
        `Dataflow with name '${dataflowDto.name}' already exists`,
      );
    }

    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
    console.log(`createCanvas with canvas id: ${id}`);
    let version = 1;
    if (dataflowDto.id) {
      const lastDataflowRevision = await this.getLatestGraphByCanvasId(
        dataflowDto.id,
      );
      version += lastDataflowRevision.version;
      await this.canvasRepo.update(
        dataflowDto.id,
        this.addOwner(decodedToken, canvas),
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
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`,
    );

    await this.saveToGitRepo(
      canvas.id,
      graphEntity,
      `Created new revision for dataflow ${canvas.name} with id ${graphEntity.id}`,
      token,
    );

    return {
      id: canvas.id,
      revisionId: graphEntity.id,
      version: graphEntity.version,
    };
  }

  async checkCanvasNameExists(
    name: string,
    excludeId?: string | undefined,
  ): Promise<boolean> {
    const existingCanvasQuery = this.canvasRepo
      .createQueryBuilder("canvas")
      .select("canvas.id")
      .where("canvas.type = :type", { type: "datatransformation-flow" })
      .andWhere("LOWER(canvas.name) = LOWER(:name)", { name });

    if (excludeId) {
      existingCanvasQuery.andWhere("canvas.id != :id", { id: excludeId });
    }

    const existingCanvas = await existingCanvasQuery.getOne();
    return !!existingCanvas;
  }

  async deleteCanvas(id: string, token: string) {
    await this.canvasRepo.delete(id);
    await this.deleteFromGitRepo(id, `Deleted dataflow with id ${id}`, token);
    return { id };
  }

  async createDataflowRun(id, prefecflowRunId) {
    await this.canvasRepo.update({ id }, { lastFlowRunId: prefecflowRunId });
    this.logger.info(
      `Created dataflow run for dataflow ${id} with lastflowRunId ${prefecflowRunId}`,
    );
  }

  async duplicateCanvas(
    id: string,
    revisionId: string,
    dataflowDuplicateDto: IDataflowDuplicateDto,
    token,
  ) {
    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
    const flowEntity = await this.getCanvas(id);
    if (!flowEntity) throw new Error("Dataflow does not exist");
    const revisionEntity = flowEntity.revisions.find(
      (r) => r.id === revisionId,
    );
    if (!revisionEntity) throw new Error("Dataflow Revision does not exist");

    const newDataflowEntity = this.addOwner(
      decodedToken,
      {
        id: uuidv4(),
        name: dataflowDuplicateDto.name,
        type: "datatransformation-flow",
      },
      true,
    );

    const newRevisionEntity = this.addOwner(
      decodedToken,
      {
        id: uuidv4(),
        canvasId: newDataflowEntity.id,
        flow: revisionEntity.flow,
        version: 1,
      },
      true,
    );

    await this.canvasRepo.save(newDataflowEntity);
    await this.graphRepo.save(newRevisionEntity);
    this.logger.info(
      `Created new revision for dataflow ${newDataflowEntity.name} with id ${newRevisionEntity.id}`,
    );

    await this.saveToGitRepo(
      newDataflowEntity.id,
      newRevisionEntity,
      `Created new revision for dataflow ${newDataflowEntity.name} with id ${newRevisionEntity.id}`,
      token,
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
        token,
      );

      return { revisionId };
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

    if (!result.length) return null;

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

  async overwriteCanvasFromRemote(canvasId: string, token: string) {
    const git = await this.getMainGit(token);
    if (!git) {
      this.logger.info("Git config not set, skip git operations");
      return {
        message: "Git config not set, skip git operations",
        overwritten: false,
        canvasId,
      };
    }

    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;
    const fileName = `${canvasId}.json`;

    let remoteFlowData: any;
    try {
      remoteFlowData = JSON.parse(await git.readFile(fileName));
    } catch {
      return {
        message: `Canvas ${canvasId} not found in remote repository, no action taken`,
        overwritten: false,
        canvasId,
      };
    }

    const localCanvas = await this.getCanvas(canvasId);
    let localVersion = 0;

    if (localCanvas && localCanvas.revisions.length > 0) {
      const latestLocalRevision = localCanvas.revisions[0];
      localVersion = latestLocalRevision.version;

      const normalizeFlow = (flow: any) => ({
        nodes: flow.nodes || [],
        edges: flow.edges || [],
      });

      const localFlowContent = JSON.stringify(
        normalizeFlow(latestLocalRevision.flow),
      );
      const remoteFlowContent = JSON.stringify(normalizeFlow(remoteFlowData));

      if (localFlowContent === remoteFlowContent) {
        return {
          message: `Canvas ${canvasId} content is identical to remote, no action taken`,
          overwritten: false,
          canvasId,
          localVersion,
        };
      }
    }

    if (localCanvas) {
      await this.canvasRepo.update(
        canvasId,
        this.addOwner(decodedToken, {
          name: remoteFlowData.name || localCanvas.name,
          type: "datatransformation-flow",
        }),
      );
    } else {
      const canvasEntity = {
        id: canvasId,
        name: remoteFlowData.name || `Imported Canvas ${canvasId}`,
        type: "datatransformation-flow",
      };
      await this.canvasRepo.insert(
        this.addOwner(decodedToken, canvasEntity, true),
      );
    }

    const newVersion = localVersion + 1;
    const graphEntity = this.graphRepo.create({
      id: uuidv4(),
      canvasId,
      flow: remoteFlowData,
      comment: "Overwritten from remote repository (content mismatch detected)",
      version: newVersion,
    });

    await this.graphRepo.insert(this.addOwner(decodedToken, graphEntity, true));

    this.logger.info(
      `Overwritten canvas ${canvasId} from remote with version ${newVersion} (was version ${localVersion})`,
    );

    return {
      message: `Successfully overwritten canvas ${canvasId} from remote due to content mismatch`,
      overwritten: true,
      canvasId,
      revisionId: graphEntity.id,
      previousVersion: localVersion,
      newVersion,
    };
  }

  async checkCanvasDiffFromRemote(canvasId: string, token: string) {
    const git = await this.getMainGit(token);
    if (!git) return { hasDifferences: false, reason: "Git config not set" };

    const fileName = `${canvasId}.json`;

    let remoteFlowData: any;
    try {
      remoteFlowData = JSON.parse(await git.readFile(fileName));
    } catch {
      return {
        hasDifferences: false,
        reason: "Canvas not found in remote repository",
      };
    }

    const localCanvas = await this.getCanvas(canvasId);
    if (!localCanvas || localCanvas.revisions.length === 0) {
      return { hasDifferences: true, reason: "No local canvas found" };
    }

    const latestLocalRevision = localCanvas.revisions[0];
    const normalizeFlow = (flow: any) => ({
      nodes: flow.nodes || [],
      edges: flow.edges || [],
    });

    const localFlowNormalized = JSON.stringify(
      normalizeFlow(latestLocalRevision.flow),
    );
    const remoteFlowNormalized = JSON.stringify(normalizeFlow(remoteFlowData));
    const hasDifferences = localFlowNormalized !== remoteFlowNormalized;

    return {
      hasDifferences,
      reason: hasDifferences
        ? "Content differs from remote"
        : "Content is identical to remote",
      localVersion: latestLocalRevision.version,
    };
  }

  async overwriteAllCanvasesFromRemote(token: string) {
    const git = await this.getMainGit(token);
    if (!git) throw new Error("Git config not set, cannot sync from remote");

    const decodedToken = decode(token.replace(/bearer /i, "")) as JwtPayload;

    await git.ensureLatest();
    const fileNames = await git.listFiles(JSON_FILE_FILTER);

    const existingCanvases = await this.canvasRepo
      .createQueryBuilder("canvas")
      .where("canvas.type = :type", { type: "datatransformation-flow" })
      .getMany();

    for (const canvas of existingCanvases) {
      await this.graphRepo
        .createQueryBuilder()
        .delete()
        .where("canvasId = :canvasId", { canvasId: canvas.id })
        .execute();
    }

    await this.canvasRepo
      .createQueryBuilder()
      .delete()
      .where("type = :type", { type: "datatransformation-flow" })
      .execute();

    if (fileNames.length === 0) {
      this.logger.info("flows folder does not exist in repository");
      return {
        message: "No flows folder found in remote repository",
        processedCount: 0,
        results: [],
      };
    }

    const results: CanvasResult[] = [];

    for (const fileName of fileNames) {
      const canvasId = fileName.replace(".json", "");
      try {
        const remoteFlowData = JSON.parse(await git.readFile(fileName));
        const canvasEntity = {
          id: canvasId,
          name: remoteFlowData.name || `Canvas ${canvasId}`,
          type: "datatransformation-flow",
        };
        await this.canvasRepo.insert(
          this.addOwner(decodedToken, canvasEntity, true),
        );

        const graphEntity = this.graphRepo.create({
          id: uuidv4(),
          canvasId,
          flow: remoteFlowData,
          comment: "Imported from remote repository",
          version: 1,
        });

        await this.graphRepo.insert(
          this.addOwner(decodedToken, graphEntity, true),
        );

        results.push({
          canvasId,
          revisionId: graphEntity.id,
          name: canvasEntity.name,
        });
      } catch (fileError: any) {
        this.logger.error(
          `Failed to process file ${fileName}: ${fileError.message}`,
        );
        results.push({
          canvasId,
          error: `Failed to process: ${fileError.message}`,
        });
      }
    }

    this.logger.info(
      `Successfully overwritten all canvases from remote. Processed ${fileNames.length} files`,
    );

    return {
      message: "Successfully overwritten all canvases from remote",
      processedCount: fileNames.length,
      results,
    };
  }

  async getTemplates() {
    const git = this.getTemplateGit();
    const fileNames = await git.listFiles(JSON_FILE_FILTER);

    const templates: TemplateDto[] = [];
    for (const fileName of fileNames) {
      const templateId = fileName.replace(".json", "");
      try {
        const templateData = JSON.parse(await git.readFile(fileName));
        templates.push({
          id: templateId,
          name: templateData.name || templateId,
          description: templateData.description || `Template: ${templateId}`,
          nodes: templateData.nodes || [],
          edges: templateData.edges || [],
        });
      } catch (fileError: any) {
        this.logger.error(
          `Failed to process template file ${fileName}: ${fileError.message}`,
        );
      }
    }

    this.logger.info(`Found ${templates.length} templates`);
    return templates;
  }

  async getFhirTemplates() {
    this.logger.info("Fetching FHIR Structure Map templates");
    const git = this.getFhirTemplateGit();
    const fileNames = await git.listFiles(JSON_FILE_FILTER);

    const templates: TemplateFhirDto[] = [];
    for (const fileName of fileNames) {
      const templateId = fileName.replace(".json", "");
      try {
        const templateData = JSON.parse(await git.readFile(fileName));
        templates.push({
          id: templateId,
          name: templateData.name || templateId,
          description: templateData.description || `Template: ${templateId}`,
          structureMap: templateData || "",
        });
      } catch (fileError: any) {
        this.logger.error(
          `Failed to process template file ${fileName}: ${fileError.message}`,
        );
      }
    }

    this.logger.info(`Found ${templates.length} templates`);
    return templates;
  }

  async createCanvasFromTemplate(
    templateId: string,
    name: string,
    comment: string,
    token: string,
  ) {
    const git = this.getTemplateGit();
    const fileName = `${templateId}.json`;

    let templateData: any;
    try {
      templateData = JSON.parse(await git.readFile(fileName));
    } catch {
      throw new Error(`Template ${templateId} not found`);
    }

    const dataflowDto: IDataflowDto = {
      name,
      dataflow: {
        ...templateData,
        comment: comment || `Created from template: ${templateId}`,
      },
    };

    const result = await this.createCanvas(dataflowDto, token);

    this.logger.info(
      `Created new canvas from template ${templateId} with id ${result.revisionId}`,
    );

    return result;
  }

  // --- Private helpers ---

  private async saveToGitRepo(
    canvasId: string,
    graphEntity: any,
    commitMessage: string,
    token: string,
  ) {
    const git = await this.getMainGit(token);
    if (!git) {
      this.logger.info("Git config not set, skip git operations");
      return;
    }

    const author = this.buildAuthor(graphEntity?.createdBy);
    const fileName = `${canvasId}.json`;
    const content = JSON.stringify(graphEntity?.flow ?? {}, null, 2);

    await git.saveFile(fileName, content, commitMessage, author);
  }

  private async deleteFromGitRepo(
    canvasId: string,
    commitMessage: string,
    token: string,
  ) {
    const git = await this.getMainGit(token);
    if (!git) {
      this.logger.info("Git config not set, skip git operations");
      return;
    }

    const author = this.buildAuthor();
    await git.deleteFile(`${canvasId}.json`, commitMessage, author);
  }

  private addOwner<T>(owner, object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: owner.sub,
        modifiedBy: owner.sub,
      };
    }
    return { ...object, modifiedBy: owner.sub };
  }
}
