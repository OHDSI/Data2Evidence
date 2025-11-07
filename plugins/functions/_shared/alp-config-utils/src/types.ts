export interface Map<T> {
    [key: string]: T;
}

export type Partial<T> = {
    [P in keyof T]?: T[P];
};

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

export type ConfigFormatterSettingsType = Map<ConfigFormatterOptionsType>;

export interface ConfigFormatterOptionsType {
    restrictToLanguage: boolean;
    applyDefaultAttributes: boolean;
    includeDisabledElements: boolean;
    concatOTSAttributes: boolean;
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
}

export interface StudyMriConfigMetaDataType {
    config: any;
    meta: ConfigMetaType;
    schemaName: string;
}

export interface ConfigMetaType {
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
}
