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

  constructor() {
    this.canvasRepo = dataSource.getRepository(Canvas);
    this.graphRepo = dataSource.getRepository(Graph);
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

    return {
      id: canvas.id,
      revisionId: graphEntity.id,
      version: graphEntity.version,
    };
  }

  async deleteCanvas(id: string) {
    await this.canvasRepo.delete(id);
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
}
