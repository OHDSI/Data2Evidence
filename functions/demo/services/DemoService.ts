import { DatasetAPI } from "../api/DatasetAPI.ts";
import { DbCredentialsAPI } from "../api/DbCredentialsAPI.ts";
import { PortalAPI } from "../api/PortalAPI.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import {
  IDbCreateDto,
  IDbCredentialDto,
  IDemoInput,
  IProgress,
} from "../type.d.ts";
import { env } from "../env.ts";

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

    const exist = datasets.find(
      (dataset) =>
        dataset.databaseCode === env.DEMO_DB_CODE &&
        dataset.schemaName === env.DEMO_DB_CDM_SCHEMA &&
        dataset.vocabSchemaName === env.DEMO_DB_CDM_SCHEMA
    );
    if (exist) {
      this.logger.info(`Dataset exists: ${JSON.stringify(exist)}`);
      return exist;
    }

    const datasetAPI = new DatasetAPI(token);
    const dataset = {
      ...env.DEMO_DATASET,
      databaseCode: env.DEMO_DB_CODE,
      cdmSchemaValue: env.DEMO_DB_CDM_SCHEMA,
      vocabSchemaValue: env.DEMO_DB_CDM_SCHEMA,
    };

    const result = await datasetAPI.createDataset(dataset);
    this.logger.info(`Dataset added: ${JSON.stringify(result)}`);
    return { ...dataset, ...result };
  }

  /*public async createCache(
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

    const { id: datasetId } = dataset;
    const result = await jobPluginsAPI.createCacheFlowRun({ datasetId });

    this.logger.info(`Cache flow-run created: ${JSON.stringify(result.data)}`);
    return result.flowRunId ? result : result.data;
  }*/

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
    const result = await jobPluginsAPI.createDqdFlowRun({
      datasetId,
      releaseId: "",
      vocabSchemaName,
      comment: "Demo setup",
    });

    this.logger.info(`DQD flow-run created: ${JSON.stringify(result.data)}`);
    return result.flowRunId ? result : result.data;
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

    if (!dataset?.plugin) {
      throw new Error("Dataset has empty plugin");
    }

    const result = await jobPluginsAPI.createGetVersionInfoFlowRun({
      flowRunName: `${dataset.plugin}-get_version_info`,
      options: {
        options: {
          flow_action_type: "get_version_info",
          token: "",
          database_code: "",
          data_model: "",
          plugin: dataset.plugin,
          datasets: [dataset],
        },
      },
    });

    this.logger.info(
      `Dataset metadata updated: ${JSON.stringify(result.data)}`
    );
    return result.flowRunId ? result : result.data;
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
