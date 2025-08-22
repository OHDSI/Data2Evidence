import { v4 as uuidv4 } from "uuid";
import { PrefectAPI } from "../api/PrefectAPI.ts";
import dataSource from "../db/datasource.ts";
import { Canvas } from "../entities/canvas.ts";
import { Graph } from "../entities/graph.ts";
import { IDataflowDto, IDataflowDuplicateDto } from "../types.ts";

export class AnalysisService {
  private readonly logger = console;
  private canvasRepo;
  private graphRepo;
  private prefectApi: PrefectAPI;

  constructor() {
    this.canvasRepo = dataSource.getRepository(Canvas);
    this.graphRepo = dataSource.getRepository(Graph);
  }

  public async getLastAnalysisflowRevision(id: string) {
    console.log(`getLastAnalysisflowRevision called with id: ${id}`);

    // First, get the canvas information
    const canvas = await this.canvasRepo
      .createQueryBuilder("canvas")
      .select(["canvas.id", "canvas.name", "canvas.lastFlowRunId"])
      .where("canvas.id = :id", { id })
      .andWhere("canvas.type = :type", { type: "analysis-flow" })
      .getOne();

    if (!canvas) {
      console.log(`No canvas found for id: ${id}`);
      return null;
    }

    const revision = await this.graphRepo
      .createQueryBuilder("revision")
      .select([
        "revision.id",
        "revision.flow",
        "revision.comment",
        "revision.createdDate",
        "revision.createdBy",
        "revision.version",
      ])
      .where("revision.canvasId = :canvasId", { canvasId: id })
      .orderBy("revision.createdDate", "DESC")
      .getOne();

    if (!revision) {
      console.log(`No revisions found for canvas id: ${id}`);
      return null;
    }

    return {
      id: canvas.id,
      canvas: {
        id: canvas.id,
        name: canvas.name,
        lastFlowRunId: canvas.lastFlowRunId,
      },
      lastFlowRunId: canvas.lastFlowRunId,
      flow: revision.flow,
    };
  }

  async createAnalysisflow(analysisflowDto: IDataflowDto, token: string) {
    const analysisflowEntity = this.canvasRepo.create({
      id: analysisflowDto.id ? analysisflowDto.id : uuidv4(),
      name: analysisflowDto.name,
      type: "analysis-flow",
    });
    let version = 1;
    const { comment, ...flow } = analysisflowDto.dataflow;

    if (analysisflowDto.id) {
      const lastDataflowRevision = await this.getLastAnalysisflowRevision(
        analysisflowDto.id
      );
      // set version default to 0 if undefined
      const lastVersion = lastDataflowRevision?.version ?? 0;
      version += lastVersion;
      await this.canvasRepo.update(
        analysisflowDto.id,
        this.addOwner(token, analysisflowEntity)
      );
    } else {
      await this.canvasRepo.insert(
        this.addOwner(token, analysisflowEntity, true)
      );
      this.logger.info(
        `Created new analysisflow ${analysisflowEntity.name} with id ${analysisflowEntity.id}`
      );
    }

    const revisionEntity = this.graphRepo.create({
      id: uuidv4(),
      // analysisflowId: analysisflowEntity.id,
      canvasId: analysisflowEntity.id,
      flow,
      comment,
      version,
    });
    await this.graphRepo.insert(this.addOwner(token, revisionEntity, true));
    this.logger.info(
      `Created new revision for analysisflow ${analysisflowEntity.name} with id ${revisionEntity.id}`
    );
    return {
      id: analysisflowEntity.id,
      revisionId: revisionEntity.id,
      version: revisionEntity.version,
    };
  }

  async deleteAnalysisflow(id: string) {
    await this.canvasRepo.delete(id);
    return { id };
  }

  async getResultsByCanvasId(dataflowId: string, token: string) {
    const dataflow = await this.canvasRepo
      .createQueryBuilder("dataflow")
      .select("dataflow.lastFlowRunId")
      .where("dataflow.id = :dataflowId", { dataflowId })
      .andWhere("dataflow.type = :type", { type: "analysis-flow" })
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

      // Transform the results to match the expected format
      const transformedRes = res
        .map((artifact) => {
          const parsedData = JSON.parse(artifact.data);

          return Object.entries(parsedData).map(([nodeName, nodeData]) => {
            const data = nodeData as any;
            return {
              nodeName,
              taskRunResult: {
                result: data,
              },
              error: data.error || false,
              errorMessage: data.error ? data.errorMessage : null,
            };
          });
        })
        .flat();

      console.log(
        `Retrieved ${transformedRes.length} results for analysis flow ${dataflowId}`
      );
      return transformedRes;
    } catch (error) {
      console.log(`Analysis flow result not found: ${error.message}`);
      throw new Error("Analysis flow result not found");
    }
  }

  async createAnalysisflowRun(id, prefectflowRunId) {
    await this.canvasRepo.update({ id }, { lastFlowRunId: prefectflowRunId });
    this.logger.info(
      `Created analysisflow run for analysisflow (${id}) and prefect flow run (${prefectflowRunId})`
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

  async duplicateAnalysisflow(
    id: string,
    revisionId: string,
    analysisflowDuplicateDto: IDataflowDuplicateDto,
    token
  ) {
    const flowEntity = await this.getAnalysisflow(id);
    const revisionEntity = flowEntity.revisions.find(
      (r) => r.id === revisionId
    );

    if (!revisionEntity) {
      throw new Error("Analysisflow Revision does not exist");
    }
    const newAnalysisflowEntity = this.addOwner(
      token,
      this.canvasRepo.create({
        id: uuidv4(),
        name: analysisflowDuplicateDto.name,
        type: "analysis-flow",
      }),
      true
    );
    const newRevisionEntity = this.addOwner(
      token,
      this.graphRepo.create({
        id: uuidv4(),
        // analysisflowId: newAnalysisflowEntity.id,
        canvasId: newAnalysisflowEntity.id,
        flow: revisionEntity.flow,
        version: 1,
      }),
      true
    );

    await this.canvasRepo.insert(newAnalysisflowEntity);
    await this.graphRepo.insert(newRevisionEntity);
    this.logger.info(
      `Created new revision for analysisflow ${newAnalysisflowEntity.name} with id ${newRevisionEntity.id}`
    );
    return {
      id: newAnalysisflowEntity.id,
      revisionId: newRevisionEntity.id,
      version: newRevisionEntity.version,
    };
  }

  async deleteAnalysisflowRevision(flowId: string, revisionId: string) {
    const flowEntity = await this.getAnalysisflow(flowId);
    if (flowEntity && flowEntity.revisions.find((r) => r.id === revisionId)) {
      await this.graphRepo.delete(revisionId);
      this.logger.info(`Deleted analysisflow revision with id ${revisionId}`);

      const lastRev = await this.getLastAnalysisflowRevision(flowId);
      if (!lastRev) {
        await this.canvasRepo.delete(flowId);
      }
      return {
        revisionId,
      };
    }

    throw new Error("Analysisflow and/or analysisflow revision do not match");
  }

  async getAnalysisflows() {
    return await this.canvasRepo
      .createQueryBuilder("analysisflow")
      .where("analysisflow.type = :type", { type: "analysis-flow" })
      .getMany();
  }

  async getAnalysisflow(id) {
    console.log(`getAnalysisflow called with id: ${id}`);

    // First, get the canvas information
    const canvas = await this.canvasRepo
      .createQueryBuilder("canvas")
      .select(["canvas.id", "canvas.name", "canvas.lastFlowRunId"])
      .where("canvas.id = :id", { id })
      .andWhere("canvas.type = :type", { type: "analysis-flow" })
      .getOne();

    if (!canvas) {
      console.log(`No canvas found for id: ${id}`);
      return null;
    }

    console.log(`Canvas found:`, JSON.stringify(canvas, null, 2));

    // Then get all revisions for this canvas
    const revisions = await this.graphRepo
      .createQueryBuilder("revision")
      .select([
        "revision.id",
        "revision.flow",
        "revision.comment",
        "revision.createdDate",
        "revision.createdBy",
        "revision.version",
      ])
      .where("revision.canvasId = :canvasId", { canvasId: id })
      .orderBy("revision.createdDate", "DESC")
      .getMany();

    console.log(`Revisions found:`, JSON.stringify(revisions, null, 2));

    return {
      id: canvas.id,
      name: canvas.name,
      canvas: {
        id: canvas.id,
        name: canvas.name,
        lastFlowRunId: canvas.lastFlowRunId,
      },
      revisions: revisions.map((rev) => ({
        id: rev.id,
        createdBy: rev.createdBy,
        createdDate: rev.createdDate.toISOString(),
        flow: rev.flow,
        comment: rev.comment,
        canvas: {
          id: canvas.id,
          name: canvas.name,
          lastFlowRunId: canvas.lastFlowRunId,
        },
        version: rev.version,
      })),
    };
  }
}
