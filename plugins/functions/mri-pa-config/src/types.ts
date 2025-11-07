/**
 * this file should have all the types in this repo
 */
// import { PholderTableMapType } from "./qe/settings/Settings";
import { Connection } from "@alp/alp-base-utils";
import ConnectionInterface = Connection.ConnectionInterface;
import { Request } from "express";

export interface IRequest extends Request {
    dbConnections: {
        db: ConnectionInterface;
    };
}

export interface Map<T> {
    [key: string]: T;
}

export type Partial<T> = {
    [P in keyof T]?: T[P];
};

export interface PlaceholderType {
    patient: string;
    interaction: string;
    code: string;
    intMeasure: string;
    related: string;
    observation: string;
    refCodes: string;
    patientdata: string;
    text: string;
}

export interface ConfigMetaType {
    configId: string;
    configVersion: string;
    configStatus: string;
    configName: string;
    dependentConfig: {
        configId: string,
        configVersion: string,
    };
    creator: string;
    created: string;
    modifier: string;
    modified: string;
}

export interface ConfigErrorType {
    config: any;
    definition: string;
    path: string;
}

export interface HPHConfigMetaType {
    meta: any;
    config: any;
    extensions?: any;
}

export interface ConfigDefaultsType {
    INTERACTION_TYPE: string;
    ATTRIBUTE: string;
    ORIGIN: string;
    DATATYPE: string;
}

export interface AssignedConfigType {
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
    assignmentEntityType: "O" | "U" | "Z"; // study | user | default
    assignmentEntityValue: string; // studyId | userId | DEFAULT_CONFIG_ASSIGNMENT
}

export interface MRIEndpointResultType {
    sql: string;
    data: any[];
    measures?: any[];
    categories?: any[];
    totalPatientCount?: number;
    debug?: any;
    noDataReason?: string;
    messageKey?: string;
    messageLevel?: "Warning" | "Error";
    logId?: string;
    kaplanMeierStatistics?: any;
}

export interface PluginEndpointResultType {
    sql: string;
    data: any[];
    totalPatientCount?: number;
    debug?: any;
    noDataReason?: string;
}

export interface CohortDefinitionType {
    axes: any[];
    cards: any;
    limit: number;
    offset: number;
    configData: {
        configId: string;
        configVersion: string;
    };
    columns?: PluginColumnType[];
}

export interface PluginColumnType {
    configPath: string;
    seq: number;
    order: string;
}

export type PluginEndpointFormatType = "csv" | "json";

export interface PluginEndpointRequestType {
    cohortDefinition: CohortDefinitionType;
}

export interface PluginSelectedAttributeType {
    id: string;
    configPath: string;
    order: string;
}

export interface ExtensionMetadata {
    metadata: TableauMetadata[];
}

export interface TableauMetadata {
    id: string;
    alias: string;
    columns: TableauColumnMetadata[];
}

export interface TableauColumnMetadata {
    id: string;
    alias: string;
    dataType: string;
}

export interface QueryEngineType {
    /**
     * @param {string} ifr The IFR Request
     * @returns {Promise<MRIEndpointResultType>}
     */
    start(ifr: string): Promise<MRIEndpointResultType>;
    domainservice(ifr: string): Promise<MRIEndpointResultType>;
}

export interface KMCurvePairType {
    outerEl: string;
    innerEl: string;
}

export type ConfigFormatterSettingsType = Map<ConfigFormatterOptionsType>;

export interface ConfigFormatterOptionsType {
    restrictToLanguage: boolean;
    applyDefaultAttributes: boolean;
    includeDisabledElements: boolean;
    concatOTSAttributes: boolean;
}

export interface QueryObjectResultType<T> {
    data: T;
    sql: string;
    sqlParameters: any[];
}

declare global {
    namespace Express {
        interface Request {
            db: any;
        }
    }
}

export interface IDBCredentialsType {
    database: string;
    schema?: string;
    dialect: string;
    host: string;
    port: number;
    user: string;
    password: string;
    max?: number | undefined;
    min?: number | undefined;
    idleTimeoutMillis?: number | undefined;
  }