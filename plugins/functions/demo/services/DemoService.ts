import { DatasetAPI } from "../api/DatasetAPI.ts";
import { DbCredentialsAPI } from "../api/DbCredentialsAPI.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import { PortalAPI } from "../api/PortalAPI.ts";
import { UserMgmtAPI } from "../api/UserMgmtAPI.ts";
import { env } from "../env.ts";
import {
  IDbCreateDto,
  IDbCredentialDto,
  IDemoInput,
  IProgress,
} from "../type.d.ts";

const algo: RsaOaepParams = { name: "RSA-OAEP" };

export class DemoService {
  private readonly logger = console; //createLogger(this.constructor.name)
  private credentialsPublicKeys: { [type: string]: string } = {};

  public async addDatabase(token: string, input: IDemoInput) {
    this.logger.info("Adding database");

    const dbCredentialsAPI = new DbCredentialsAPI(token);
    const dbList = await dbCredentialsAPI.getDbList();

    const exist = dbList.find((db) => db.code === env.DEMO_DB_CODE);
    if (exist) {
      this.logger.info(`Database exist: ${JSON.stringify(exist)}`);
      return exist;
    }

    const credentials: IDbCredentialDto[] = [];
    if (env.DEMO_DB_USER && env.DEMO_DB_PASSWORD) {
      try {
        this.credentialsPublicKeys = JSON.parse(input.encryptionKeys);
        this.logger.debug(
          `Loaded credentials public keys: ${JSON.stringify(
            this.credentialsPublicKeys
          )}`
        );
      } catch (err) {
        this.logger.error(
          `Error while loading credentials public keys: ${JSON.stringify(err)}`
        );
        throw new Error("Error while configuring for credential encryption");
      }

      const salt = this.createSalt();
      const encryptedPassword = await this.encrypt(env.DEMO_DB_PASSWORD, salt);

      credentials.push(
        {
          username: env.DEMO_DB_USER,
          password: encryptedPassword,
          serviceScope: "Internal",
          salt,
          userScope: "Admin",
        },
        {
          username: env.DEMO_DB_USER,
          password: encryptedPassword,
          serviceScope: "Internal",
          salt,
          userScope: "Read",
        }
      );
    }

    const db: IDbCreateDto = {
      ...env.DEMO_DB_DEFAULT,
      code: env.DEMO_DB_CODE,
      vocabSchemas: [env.DEMO_DB_CDM_SCHEMA],
      credentials: credentials,
    };
    const result = await dbCredentialsAPI.createDb(db);
    this.logger.info(`Database added: ${JSON.stringify(result)}`);

    return result;
  }

  public async addDataset(token: string) {
    this.logger.info("Adding dataset");

    const portalAPI = new PortalAPI(token);
    const datasets = await portalAPI.getDatasets();

    const existingDataset = datasets.find(
      (dataset) =>
        dataset.databaseCode === env.DEMO_DB_CODE &&
        dataset.schemaName === env.DEMO_DB_CDM_SCHEMA &&
        dataset.vocabSchemaName === env.DEMO_DB_CDM_SCHEMA &&
        dataset.sourceStudyId == null &&
        dataset.visibilityStatus !== "HIDDEN"
    );

    if (existingDataset) {
      this.logger.info(`Dataset exists: ${JSON.stringify(existingDataset)}`);
      return existingDataset;
    }

    const datasetAPI = new DatasetAPI(token);
    const dataset = {
      ...env.DEMO_DATASET,
      databaseCode: env.DEMO_DB_CODE,
      cdmSchemaValue: env.DEMO_DB_CDM_SCHEMA,
      vocabSchemaValue: env.DEMO_DB_CDM_SCHEMA,
      resultsSchemaValue: env.DEMO_DB_RESULT_SCHEMA,
    };

    const result = await datasetAPI.createDataset(dataset);
    this.logger.info(`Dataset added: ${JSON.stringify(result)}`);

    // Look the dataset back up so we always carry the server-assigned id forward,
    // regardless of which fields the gateway echoes in its response.
    const refreshed = await portalAPI.getDatasets();
    const createdDataset =
      (result?.id && refreshed.find((d) => d.id === result.id)) ||
      refreshed.find(
        (d) =>
          d.databaseCode === env.DEMO_DB_CODE &&
          d.schemaName === env.DEMO_DB_CDM_SCHEMA &&
          d.vocabSchemaName === env.DEMO_DB_CDM_SCHEMA &&
          d.sourceStudyId == null &&
          d.visibilityStatus !== "HIDDEN"
      );

    if (!createdDataset?.id) {
      throw new Error(
        `Dataset created but not visible in portal (result=${JSON.stringify(result)})`
      );
    }
    this.logger.info(`Dataset confirmed in portal: ${JSON.stringify(createdDataset)}`);
    return createdDataset;
  }

  // Poll cache status until bao reports COMPLETED. The dataset POST returns as
  // soon as the row is inserted, so DQD/DC would otherwise race against the
  // still-building TrexSQL cache and fail with cache-not-ready errors.
  public async waitForCache(token: string, _input: any, progress?: IProgress) {
    this.logger.info("Waiting for cache");

    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;
    if (!dataset?.id) {
      throw new Error("Dataset not found in progress; cannot wait for cache");
    }

    const portalAPI = new PortalAPI(token);
    const pollTimeoutMs = 15 * 60 * 1000;
    const pollIntervalMs = 5000;
    const deadline = Date.now() + pollTimeoutMs;
    let lastStatus;
    while (Date.now() < deadline) {
      lastStatus = await portalAPI.getCacheStatus(dataset.id);
      if (lastStatus.ready) {
        this.logger.info(
          `Cache ready for dataset ${dataset.id}: ${JSON.stringify(lastStatus)}`
        );
        return lastStatus;
      }
      if (
        lastStatus.lastJobStatus &&
        ["FAILED", "STOPPED", "ABANDONED"].includes(lastStatus.lastJobStatus)
      ) {
        throw new Error(
          `Cache build for dataset ${dataset.id} ${lastStatus.lastJobStatus}: ${lastStatus.lastJobError ?? "no error message"}`
        );
      }
      this.logger.info(
        `Cache not ready yet for dataset ${dataset.id}: ${JSON.stringify(lastStatus)}`
      );
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(
      `Cache build for dataset ${dataset.id} did not become ready within ${pollTimeoutMs}ms (last=${JSON.stringify(lastStatus)})`
    );
  }

  public async runDQD(token: string, _input: IDemoInput, progress?: IProgress) {
    this.logger.info("Running DQD");

    const jobPluginsAPI = new JobPluginsAPI(token);
    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const { id: datasetId, vocabSchemaName } = dataset;
    const dqdFlowRun = await jobPluginsAPI.createDqdFlowRun({
      datasetId,
      releaseId: "",
      vocabSchemaName,
      comment: "Demo setup",
    });

    // Normalize result to always be { flowRunId: string }
    let result: { flowRunId: string };
    if (dqdFlowRun?.flowRunId) {
      result = { flowRunId: dqdFlowRun.flowRunId };
    } else if (dqdFlowRun?.data?.flowRunId) {
      result = { flowRunId: dqdFlowRun.data.flowRunId };
    } else {
      throw new Error(
        `No flowRunId found in response: ${JSON.stringify(dqdFlowRun)}`
      );
    }

    this.logger.info(`DQD flow-run created: ${JSON.stringify(result)}`);

    const flowRunId = result.flowRunId;

    const dqdResults = await jobPluginsAPI.getDqdFlowRunOverviewResults({
      flowRunId,
      datasetId,
    });

    // Assert correctedPassPercentage is at least 94 (CDM 5.4 baseline; was 95 with prior Achilles)
    const correctedPassPercentage =
      dqdResults?.total?.total?.correctedPassPercentage;
    const pct = parseInt(
      String(correctedPassPercentage ?? "").replace("%", ""),
      10
    );
    if (Number.isNaN(pct) || pct < 94) {
      throw new Error(
        `DQD results assertion failed: correctedPassPercentage is ${correctedPassPercentage}, expected >= 94`
      );
    }

    this.logger.info(`DQD flow-run results: ${JSON.stringify(dqdResults)}`);
    return dqdResults ? dqdResults : dqdResults.data;
  }

  public async runDC(token: string, _input: any, progress?: IProgress) {
    this.logger.info("Running DC");

    const jobPluginsAPI = new JobPluginsAPI(token);
    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const { id: datasetId } = dataset;
    const result = await jobPluginsAPI.createDcFlowRun({
      datasetId,
      releaseId: "",
      comment: "Demo setup",
    });

    this.logger.info(`DC flow-run created: ${JSON.stringify(result.data)}`);
    return result.flowRunId ? result : result.data;
  }

  public async createCache(
    token: string,
    _input: IDemoInput,
    progress?: IProgress
  ) {
    this.logger.info("Creating cache");

    const jobPluginsAPI = new JobPluginsAPI(token);
    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;

    if (!dataset) {
      throw new Error("Dataset not found");
    }

    const { id: datasetId, cacheId: cacheDatasetId } = dataset;
    const result = await jobPluginsAPI.createCacheFlowRun({
      datasetId,
      cacheDatasetId,
    });

    this.logger.info(`Cache flow-run created: ${JSON.stringify(result.data)}`);
    const flowRunId = result.flowRunId ? result : result.data;

    const cacheStatusResponse = await jobPluginsAPI.getCacheFlowRunStatus(
      flowRunId
    );
    this.logger.info(
      `Cache flow-run status: ${JSON.stringify(cacheStatusResponse)}`
    );

    return cacheStatusResponse.flowRunId
      ? cacheStatusResponse
      : cacheStatusResponse.data;
  }

  public async updateDatasetMetadata(
    token: string,
    _input: any,
    progress?: IProgress
  ) {
    this.logger.info("Updating metadata");

    const jobPluginsAPI = new JobPluginsAPI(token);
    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;

    if (!dataset) {
      throw new Error("Dataset not found");
    }
    const portalAPI = new PortalAPI(token);
    const { id: datasetId } = dataset;

    const cacheDataset = await portalAPI.getDataset(datasetId);

    if (!cacheDataset) {
      throw new Error("Cache dataset not found");
    }

    if (!dataset?.plugin) {
      throw new Error("Dataset has empty plugin");
    }

    if (!cacheDataset?.plugin) {
      throw new Error("Cache dataset has empty plugin");
    }

    const result = await jobPluginsAPI.createGetVersionInfoFlowRun({
      flowRunName: `cache-get_version_info`,
      options: {
        options: {
          flowActionType: "get_version_info",
          token: "",
          database_code: "",
          data_model: "",
          plugin: "create_cachedb_file_plugin",
          datasets: [cacheDataset],
        },
      },
    });

    this.logger.info(
      `Dataset metadata updated: ${JSON.stringify(result.data)}`
    );
    return result.flowRunId ? result : result.data;
  }

  public async runPhenotype(
    token: string,
    _input: IDemoInput,
    progress?: IProgress
  ) {
    this.logger.info("Running Phenotype");

    const jobPluginsAPI = new JobPluginsAPI(token);
    const userMgmtAPI = new UserMgmtAPI(token);
    const user = await userMgmtAPI.getMe();
    const roles = await userMgmtAPI.getMyRoles();
    const accessibleDatasetIds = new Set(
      roles.datasetRoles
        .filter((r) => r.role === "RESEARCHER")
        .map((r) => r.datasetId),
    );
    // For standalone phenotype flow, get the first dataset the user has access to
    const datasetId = Array.from(accessibleDatasetIds)[0];
    if (!datasetId) {
      throw new Error("No accessible datasets available for the current user");
    }

    const result = await jobPluginsAPI.createPhenotypeFlowRun({
      options: {
        materialize: false,
        cohorts_id: "default",
        dataset_id: datasetId,
        user_name: user.username,
      },
    });

    this.logger.info(
      `Phenotype flow-run created: ${JSON.stringify(result.data || result)}`
    );
    return result.flowRunId ? result : result.data;
  }

  public async addResearcherRoleToDataset(
    token: string,
    _input: any,
    progress?: IProgress
  ) {
    this.logger.info("Adding researcher role to demo dataset");
    const dataset = progress?.steps?.find(
      (step) => step.code === "dataset"
    )?.result;
    const { id: datasetId } = dataset;

    if (!dataset) {
      this.logger.error("Dataset not found in progress");
      throw new Error("Dataset not found");
    }

    const userMgmtAPI = new UserMgmtAPI(token);
    const result = await userMgmtAPI.registerStudyRoles({
      userIds: ["a6660e40-261e-4782-873e-f76b4328aecf"],
      tenantId: "e0348e4d-2e17-43f2-a3c6-efd752d17c23",
      studyId: datasetId,
      roles: ["RESEARCHER"],
    });
    this.logger.info(
      `Researcher role added to admin: ${JSON.stringify(result)}`
    );
    return result;
  }

  private async encrypt(data: string, salt: string) {
    const pub = this.credentialsPublicKeys["Internal"];
    if (!pub) {
      const errorMessage = `No public key defined for credential encryption`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const publicKey = await crypto.subtle.importKey(
        "spki",
        this.convertPEMtoBinary(pub),
        { ...algo, hash: "SHA-256" },
        true,
        ["encrypt"]
      );

      const dataText = this.setupData(data, salt);
      const enc = new TextEncoder();
      const encoded = enc.encode(dataText);
      const buffer = await window.crypto.subtle.encrypt(
        algo,
        publicKey,
        encoded
      );
      return this.convertBufferToBase64(buffer);
    } catch (error) {
      const errorMsg = "Error while encrypting data";
      console.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  private createSalt(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return btoa(String.fromCharCode(...randomBytes));
  }

  private setupData(data: string | object, salt: string) {
    if (typeof data === "object") {
      return JSON.stringify(data);
    }
    return this.addSalt(data, salt);
  }

  private addSalt(value: string, salt: string) {
    const max = value.length;
    const min = 0;
    const index = Math.floor(Math.random() * (max - min + 1) + min);
    return value.slice(0, index) + salt + value.slice(index);
  }

  private convertBufferToBase64(buffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private convertPEMtoBinary(pem: string): ArrayBuffer {
    const pemContents = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\n/g, "");

    return this.base64ToArrayBuffer(pemContents);
  }

  private base64ToArrayBuffer(b64: string) {
    const byteString = atob(b64);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return byteArray;
  }
}
