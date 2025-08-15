export type UserScope = "Admin" | "Read";
export type ServiceScope = "Internal";

export interface IDemoInput {
  encryptionKeys: string;
}

export interface IStepTask {
  code: string;
  message: string;
  task: (
    token: string,
    input: IDemoInput,
    progress?: IProgress
  ) => Promise<object | void | undefined>;
}

export interface IStepInfo {
  step: number;
  code?: string;
  message: string;
  status: "inprogress" | "completed" | "failed" | "no_status";
  result?: any;
}

export interface IProgress {
  steps: IStepInfo[];
  status: "inprogress" | "completed" | "failed";
}

export interface IDbCredentialDto {
  username: string;
  password: string;
  salt: string;
  userScope: UserScope;
  serviceScope: ServiceScope;
}

export interface IDbCreateDto {
  host: string;
  port: number;
  code: string;
  name: string;
  dialect: "postgres" | "hana";
  extra: { [key in ServiceScope]: object };
  credentials: IDbCredentialDto[];
  vocabSchemas: string[];
}

export interface IDbDto extends IDbCreateDto {
  id: string;
}

export interface IDataset {
  id: string;
  databaseCode: string;
  schemaName: string;
  vocabSchemaName: string;
}

export interface ICacheCreateFlowRun {
  datasetId: string;
}

export interface IDqdCreateFlowRun {
  datasetId: string | undefined;
  comment?: string;
  vocabSchemaName?: string;
  cohortDefinitionId?: string;
  releaseId?: string;
}

export interface IDcCreateFlowRun {
  datasetId: string | undefined;
  comment?: string;
  releaseId?: string;
  excludeAnalysisIds?: string;
}

export interface IGetVersionInfoCreateFlowRun {
  flowRunName: string;
  options?: object;
}

export interface IPhenotypeCreateFlowRun {
  options: {
    databaseCode: string;
    cdmschemaName: string;
    cohortschemaName: string;
    cohortsId: string;
    vocabSchemaName: string;
  };
}
