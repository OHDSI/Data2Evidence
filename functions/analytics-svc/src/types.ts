/**
 * this file should have all the types in this repo
 */
import { PholderTableMapType } from "./qe/settings/Settings";
import { Connection } from "@alp/alp-base-utils";
import ConnectionInterface = Connection.ConnectionInterface;
import { Request } from "express";

export interface IMRIRequest extends Request {
    dbConnections: {
        analyticsConnection: ConnectionInterface;
    };
    dbCredentials: {
        analyticsCredentials: any;
        studyAnalyticsCredential: any;
    };
    studiesDbMetadata: {
        studies: any;
        cachedAt: number;
    };
    selectedstudyDbMetadata: StudyDbMetadata;
    swagger: any;
    fileName?: string;
    usage?: "EXPORT";
}
export interface Map<T> {
    [key: string]: T;
}

export type Partial<T> = {
    [P in keyof T]?: T[P];
};

export type PlaceholderType = {
    patient: string;
    interaction: string;
    code: string;
    intMeasure: string;
    related: string;
    observation: string;
    refCodes: string;
    patientdata: string;
    text: string;
};

export type ConfigMetaType = {
    configId: string;
    configVersion: string;
    configStatus: string;
    configName: string;
    dependentConfig: {
        configId: string;
        configVersion: string;
    };
    creator: string;
    created: string;
    modifier: string;
    modified: string;
};

export type ConfigErrorType = {
    config: any;
    definition: string;
    path: string;
};

export type FilterExprType = {
    filterKey: string;
    filterValue: string;
    op: string;
    attrPath?: string;
    fhirAnnotation?: string;
};

export type FilterType = {
    and: FilterExprType[];
    or: FilterExprType[];
};

export type CDMConfigType = {
    censor?: any;
    patient: CDMConfigPatientType;
    settings: {
        fuzziness: number;
        languages: string[];
        maxResultSize: number;
    };
};

export type CDMConfigPatientType = {
    attributes?: Map<CDMConfigAttributeType>;
    conditions?: Map<{
        name: string;
        interactions: Map<CDMConfigInteractionType>;
    }>;
    interactions?: Map<CDMConfigInteractionType>;
};

export type CDMConfigAttributeType = {
    name:
        | {
              lang: string;
              value: string;
          }[]
        | string;
    type: "text" | "num" | "time" | "datetime";
    defaultFilter?: string;
    expression?: string;
    measureExpression?: string;
    order?: number;
    from?: Partial<PholderTableMapType>;
    annotations?: string[];
    referenceFilter?: string;
    referenceExpression?: string;
    fuzziness?: number;
    eavExpressionKey?: string;
    relationExpressionKey?: string;
    disabledLangName?: string[];
    isDefault?: boolean;
};

export type CDMConfigInteractionType = {
    name:
        | {
              lang: string;
              value: string;
          }[]
        | string;
    defaultFilter: string;
    order: number;
    parentInteraction?: string[];
    parentInteractionLabel?: string;
    from?: Partial<PholderTableMapType>;
    attributes: Map<CDMConfigAttributeType>;
};

export type CDMConfigMetaType = {
    meta: ConfigMetaType;
    config: CDMConfigType;
    template: any[];
};

export type HPHConfigMetaType = {
    meta: any;
    config: any;
    extensions?: any;
};

export type CDMEndpointRequestType = {
    config: CDMConfigType;
    attributePath: string;
};

export type AttributeInfoRequestType = CDMEndpointRequestType & {
    exprToUse: string;
    validationRequest?: any;
};

export type DomainValuesServiceRequestType = CDMEndpointRequestType & {
    exprToUse: string;
    useRefText: boolean;
    suggestionLimit?: number;
};

export type TableSuggestionRequestType = {
    table: string;
    expression: string;
    mapping: PholderTableMapType;
};

export type ColumnSuggestionRequestType = {
    table: string;
    mapping: PholderTableMapType;
};

export type ConfigDefaultsType = {
    INTERACTION_TYPE: string;
    ATTRIBUTE: string;
    ORIGIN: string;
    DATATYPE: string;
};

export type AssignedConfigType = {
    assignmentId: string;
    assignmentName: string;
    configId: string;
    configVersion: string;
    configStatus: string;
    configName: string;
    dependentConfig: {
        configId: string;
        configVersion: string;
    };
    config: Map<string>;
};

export type MRIEndpointResultCategoryType = {
    axis: number;
    id: string;
    name: string;
    order: string; //"ASC" | "DESC";
    type: string;
    value: string;
    binsize?: number;
};

export type MRIEndpointResultMeasureType = {
    group: number;
    id: string;
    name: string;
    type: string;
    value: string;
};

export type MRIEndpointResultType = {
    sql: string;
    data: { totalpcount?: number; [key: string]: string | number }[];
    measures?: MRIEndpointResultMeasureType[];
    categories?: MRIEndpointResultCategoryType[];
    totalPatientCount?: number;
    debug?: any;
    noDataReason?: string;
    messageKey?: string;
    messageLevel?: "Warning" | "Error";
    logId?: string;
    kaplanMeierStatistics?: any;
    postProcessingConfig?: {
        fillMissingValuesEnabled: boolean;
        NOVALUE: string;
        shouldFormatBinningLabels: boolean;
    };
};

export type PluginEndpointResultType = {
    sql: string;
    data: any[];
    totalPatientCount?: number;
    debug?: any;
    noDataReason?: string;
    selectedAttributes?: any[];
    noValue?: string;
};

export type PluginEndpointStreamResultType = {
    entity: string;
    data: NodeJS.ReadableStream;
    debug?: any;
    noDataReason?: string;
    rowCount?: number;
};

export type CohortDefinitionType = {
    axes: any[];
    cards: any;
    limit: number;
    offset: number;
    configData: {
        configId: string;
        configVersion: string;
    };
    columns?: PluginColumnType[];
};

export type PluginColumnType = {
    configPath: string;
    seq: number;
    order: string;
};

export type PluginEndpointFormatType = "csv" | "json";

export type RecontactPatientListRequestType = {
    name: string;
    cohortDefinition: CohortDefinitionType;
    datasetId: string;
};

export type PluginEndpointRequestType = {
    cohortDefinition: CohortDefinitionType;
    datasetId: string;
};

export type PluginSelectedAttributeType = {
    id: string;
    configPath: string;
    order: string;
    annotations: string;
};

export type ExtensionMetadata = {
    metadata: TableauMetadata[];
};

export type TableauMetadata = {
    id: string;
    alias: string;
    columns: TableauColumnMetadata[];
};

export type TableauColumnMetadata = {
    id: string;
    alias: string;
    dataType: string;
};

export interface QueryEngineType {
    /**
     * @param {string} ifr The IFR Request
     * @returns {Promise<MRIEndpointResultType>}
     */
    start(ifr: string): Promise<MRIEndpointResultType>;
    domainservice(ifr: string): Promise<MRIEndpointResultType>;
}

export type KMCurvePairType = {
    outerEl: string;
    innerEl: string;
};

export type ConfigFormatterSettingsType = Map<ConfigFormatterOptionsType>;

export type ConfigFormatterOptionsType = {
    restrictToLanguage: boolean;
    applyDefaultAttributes: boolean;
    includeDisabledElements: boolean;
    concatOTSAttributes: boolean;
};

export type QueryObjectResultType<T> = {
    data: T;
    sql: string;
    sqlParameters: any[];
};

export type CDMConfigMetaDataType = {
    id: string;
    version: string;
};

export type BackendConfigWithCDMConfigMetaDataType = {
    backendConfig: any;
    cdmConfigMetaData: CDMConfigMetaDataType;
};

export type StudyMriConfigMetaDataType = {
    config: any;
    meta: ConfigMetaType;
    schemaName: string;
};

export type QueryResultType = {
    nql: any;
    config: any;
    censoringThreshold: string;
};

export interface IBookmark {
    bookmarkname: string;
    bookmark: string;
    bmkId: string;
}

export interface StudyAnalyticsCredential {
    host: string;
    port: string;
    code: string;
    databaseName: string;
    user: string;
    password: string;
    encrypt: boolean;
    probeSchema: string;
    vocabSchema: string;
    dialect: string;
    schema: string;
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
}

export interface StudyDbMetadata {
    id: string;
    schemaName: string;
    databaseName: string;
    vocabSchemaName: string;
}

export interface StudiesDbMetadata {
    studies: StudyDbMetadata[];
    cachedAt: number;
}

export type QuerySvcResultType = {
    queryString: string;
    queryObject: QueryObjectType;
    pCountQueryObject: QueryObjectType;
    fast: any;
    config: any;
    measures: MRIEndpointResultMeasureType[];
    categories: MRIEndpointResultCategoryType[];
    groupAttrAliases: any;
    cdmConfigMetaData: any;
    selectedAttributes: PluginSelectedAttributeType[];
    entityQueryMap: any;
    ifrRequest: any;
};
export type QueryObjectType = {
    queryString: string;
    parameterPlaceholders: any;
    sqlReturnOn: any;
};

export type CohortDefinitionTableType = {
    id?: number;
    name: string;
    description: string;
    creationTimestamp: Date;
    modificationTimestamp: Date;
    owner: string;
    definitionTypeConceptId?: string;
    subjectConceptId?: number;
    syntax?: string;
};

export type CohortType = CohortDefinitionTableType & {
    patientIds: string[];
};

export type StackedBarchartQueryResultType = {
    data: Array<CohortResultType>;
};

export type CohortResultType = {
    "cohortId": string;
    "cohortName": string;
    "patient.attributes.pcount": Number;
};

export type DcReplacementConfig = {
    results_database_schema: string;
    vocab_database_schema: string;
    conceptId?: string;
};

export type DatabaseSchemaMap = { [key: string]: string[] };

export interface MinMaxRange {
    min: number;
    max: number;
}

export interface IDatasetFilterScopesDto {
    age: MinMaxRange;
    observationYear: MinMaxRange;
    cumulativeObservationMonths: MinMaxRange;
}

export interface IDatasetFilterParamsDto {
    age?: {
        gte: number;
        lte: number;
    };
    observationYear?: {
        gte: number;
        lte: number;
    };
}

export interface IDatasetSchemaFilterResultDto {
    [datasetSchema: string]: { isMatched: boolean };
}
