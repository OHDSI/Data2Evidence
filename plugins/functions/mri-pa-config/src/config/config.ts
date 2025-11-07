/*
    Patient Analytics Configuration Logic
*/

import * as configDefinitionLib from "./configDefinition";
import * as mFormatter from "./formatter";
import {validator as validatorlib, configTools, GetUser, FFHConfig} from "@alp/alp-config-utils";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import { Logger, utils} from "@alp/alp-base-utils";
import {configDefaultValues} from "../../cfg/pa/configDefaultValues.ts"
import { dirname, normalize, join } from 'node:path';
import { cwd } from 'node:process';

import { AssignedConfigType, HPHConfigMetaType } from "../types";
// import { FFHConfig } from "./utils/FFHConfig";
// import { Settings } from "../../qe/settings/Settings";
// import { User } from "./utils/GetUser";
import User = GetUser.User;
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const logger = Logger.CreateLogger("mri-config-log");

export class MRIConfig {
    private CONFIG_TYPE = "HC/MRI/PA";
    private VERSION = {
        ACTIVE: "A",
        INACTIVE: "I",
    };

    private formatter: mFormatter.Formatter;
    private ffhConfig: FFHConfig.FFHConfig;

    constructor(
        private oConnection: ConnectionInterface,
        private oUser: User,
        private fs: any,
        private token: string) {
        this.ffhConfig = new FFHConfig.FFHConfig(oConnection, oUser);
        this.formatter = new mFormatter.Formatter(this.fs);
    }

    public getAllConfigs(callback) {
        this.ffhConfig.getAllConfigs("HC/HPH/CDW", (err, cdwConfigs) => {
            if (err) {
                callback(err, null);
                return;
            }
            this.ffhConfig.getAllConfigs(this.CONFIG_TYPE, (err, configList) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                callback(null, this.formatter.formatList(configList, cdwConfigs));
            });
        });

    }

    public getFrontendConfig({ inConfigId, inConfigVersion, lang, callback }:
        { inConfigId: string, inConfigVersion: string, lang: string, callback: connLib.CallBackInterface }) {
        // close to pa config, enhanced by cdw. Trimmed to relevant properties
        let configId = inConfigId;
        let configVersion = inConfigVersion;
        const getConfigData = async () => {
            try {
                const configObj = await this._getConfig({
                    configId,
                    configVersion,
                    formatter: this.formatter.formatFrontendConfig,
                    noAssignmentCheck: false,
                    lang,
                });
                callback(null, configObj);
            } catch (err) {
                callback(err, null);
            }
        };

        if (!configId) {
            this.getDefault((err, defaultConfig) => {
                if (err) {
                    return callback(err, null);
                }
                configId = defaultConfig.configId;
                configVersion = defaultConfig.configVersion;
                getConfigData();
            });
        } else {
            getConfigData();
        }
    }

    public async getBackendConfig({ configId, configVersion, lang }:
        { configId: string, configVersion: string, lang: string }) {

        return new Promise<HPHConfigMetaType>(async (resolve, reject) => {
            // close to cdw
            if (!configId) {
                throw new Error("CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED");
            }
            try {
                const configObj = await this._getConfig({
                    configId,
                    configVersion,
                    formatter: this.formatter.formatBackendConfig,
                    noAssignmentCheck: false,
                    lang,
                });

                resolve(configObj);
            } catch (err) {
                reject(err);
            }
        });
    }

    public async getConfig({ configId, configVersion, lang }:
        { configId: string, configVersion: string, lang: string }) {

        return new Promise<HPHConfigMetaType>(async (resolve, reject) => {
            // close to cdw
            if (!configId) {
                throw new Error("CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED");
            }
            try {
                const configObj = await this.ffhConfig.getConfig({
                    configId,
                    configVersion,
                });

                resolve(configObj);
            } catch (err) {
                reject(err);
            }
        });
    }

    public async getAdminConfig({ configId, configVersion, lang }:
        { configId: string, configVersion: string, lang: string }) {
        // plain pa config with names from cdw
        if (!configId) {
          return Promise.reject(new Error("CONFIG_ERROR_NO_CONFIG_ID_SPECIFIED"));
        }

        return await this._getConfig({
            configId,
            configVersion,
            formatter: this.formatter.formatAdminConfig,
            noAssignmentCheck: true,
            lang,
        });
    }

    public validateConfig(config, dependentConfig, callback: connLib.CallBackInterface) {
        this.ffhConfig.getCDWConfig({
            configId: dependentConfig.configId,
            configVersion: dependentConfig.configVersion + "",
            lang: "",
            callback: (err, cdwConfig) => {
                if (err) {
                    return callback(err, null);
                }
                const definition = configDefinitionLib.getDefinition(cdwConfig);
                const validator = new validatorlib.Validator(this.oConnection);
                const validationResult = validator.validateConfiguration(config, definition);
                callback(null, {
                    errors: validationResult.errors,
                    warnings: validationResult.warnings,
                    valid: validationResult.errors.length === 0,
                });
            },
        });
    }

    public saveConfig(configId, configName, config, dependentConfig, language, callback: connLib.CallBackInterface) {
        this._saveConfig(configId, this.VERSION.INACTIVE, configName, config, dependentConfig, language, callback);
    }

    public deleteConfig(configId, configVersion, callback: connLib.CallBackInterface) {
        if (!configId) {
            return callback(new Error("MRI_PA_CFG_ERROR_NO_CONFIG_SPECIFIED"), null);
        }
        if (configVersion) { // delete one state
            this.ffhConfig.deleteConfig({
                configId,
                configVersion,
            }, callback);
        } else { // delete active and inactive
            this.ffhConfig.deleteConfig({
                configId,
            }, callback);
        }
    }

    public async activateConfig(inConfigId, configName, inConfig, inDependentConfig, lang, callback: connLib.CallBackInterface) {
        let configId = inConfigId;
        let config = this._cleanConfigAnnotation(inConfig);
        let dependentConfig = inDependentConfig;

        const validateAndSaveConfig = () => {
            if (!config) {
                return callback(new Error("MRI_PA_CFG_ERROR_CONFIG_NO_TO_ACTIVATE"), null);
            }
            // validate the config before activating
            this.validateConfig(config, dependentConfig, (err, validationResult) => {
                if (err) {
                    return callback(err, null);
                }
                if (!validationResult.valid) {
                    validationResult.activated = false;
                    callback(null, validationResult);
                } else {
                    // save as active version
                    let saveResult: any = {};
                    this._saveConfig(configId, this.VERSION.ACTIVE, configName, config, dependentConfig, lang, (err, result) => {
                        if (err) {
                            return callback(err, null);
                        }
                        saveResult = result;
                        const modifyValidationResult = () => {
                            validationResult.activated = saveResult.saved;
                            validationResult.meta = saveResult.meta;
                            validationResult.config = saveResult.config;
                            callback(null, validationResult);
                        };

                        // remove inactive version after activating successfully
                        if (saveResult.saved) {
                            configId = saveResult.meta.configId;
                            this.deleteConfig(configId, this.VERSION.INACTIVE, (err, data) => {
                                if (err) {
                                    return callback(err, null);
                                }
                                modifyValidationResult();
                            });
                        } else {
                            modifyValidationResult();
                        }
                    });
                }
            });
        };

        // if no config is specified, try to get an inactive version of the given id
        if (!config) {

            try {
                const inactiveConfig = await this.getAdminConfig({
                    configId,
                    configVersion: this.VERSION.INACTIVE,
                    lang,
                });
                config = inactiveConfig.config;
                dependentConfig = inactiveConfig.meta.dependentConfig;
                validateAndSaveConfig();
            } catch (err) {
                return callback(err, null);
            }

        } else {
            validateAndSaveConfig();
        }
    }

    public loadFromFile(filePath, configId, configName, dependentConfig, language, callback: connLib.CallBackInterface) {
        if (!dependentConfig || !dependentConfig.configId || !dependentConfig.configVersion) {
            return callback(new Error("MRI_PA_CFG_ERROR_MISSING_DEPENDENT_CONFIG_DETAILS"), null);
        }
        const file = configTools.extractPackageAndFile(filePath);
        if (file[2] !== "json") {
            return callback(new Error("MRI_PA_CFG_ERROR_LOAD_FILE_ERROR_INVALID_FILE_EXTENSION"), null);
        }
        const config = configTools.loadFile(file[0], file[1], file[2], this.fs);
        this.activateConfig(configId, configName, config, dependentConfig, language, (err, saveResult) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, this.formatter.loadFromFileResult(saveResult));
        });
    }

    public getDefaultValues() {
        const defaultValues = this._loadDefaultValues();
        return {
            filtercards: defaultValues.filtercards,
            attributes: defaultValues.attributes,
        };
    }

    public suggestConfig(dependentConfig, lang, callback: connLib.CallBackInterface) {
        if (!dependentConfig || !dependentConfig.configId || !dependentConfig.configVersion) {
            return callback(new Error("CONFIG_ERROR_CDW_CONFIG_NOT_DEFINED"), null);
        }
        this.ffhConfig.getCDWConfig({
            configId: dependentConfig.configId,
            configVersion: dependentConfig.configVersion + "",
            lang,
            callback: (err, dmConfig) => {
                if (err) {
                    return callback(err, null);
                }
                const defaultValues = this._loadDefaultValues();

                let fcOrder = 0;

                function suggestFiltercard(path, dmInteraction) {
                    fcOrder += 1;
                    let attrOrder = 0;
                    const attributeNo = Object.keys(dmInteraction.attributes).length;
                    // let attributeKey;

                    function suggestAttribute(attributePath, dmAttribute) {
                        attrOrder += 1;
                        return {
                            modelName: dmAttribute.name,
                            source: attributePath,
                            ordered: dmAttribute.type === "num" || defaultValues.attributes.ordered,
                            cached: defaultValues.attributes.cached,
                            useRefText: Boolean(dmAttribute.referenceExpression) || defaultValues.attributes.useRefText,
                            useRefValue: Boolean(dmAttribute.referenceExpression) || defaultValues.attributes.useRefValue,
                            category: dmAttribute.type !== "freetext" && !dmAttribute.measureExpression && defaultValues.attributes.category,
                            measure: dmAttribute.type === "num" && !dmAttribute.referenceExpression && defaultValues.attributes.measure,
                            filtercard: {
                                initial: defaultValues.attributes.filtercard.initial && !dmAttribute.isDefault,
                                visible: !dmAttribute.measureExpression && defaultValues.attributes.filtercard.visible,
                                order: dmAttribute.order || (dmAttribute.order === 0 ? 0 : attributeNo + 1),
                            },
                            patientlist: {
                                initial: !dmAttribute.measureExpression && defaultValues.attributes.patientlist.initial,
                                visible: !dmAttribute.measureExpression && defaultValues.attributes.patientlist.visible,
                                linkColumn: defaultValues.attributes.patientlist.linkColumn,
                            },
                            annotations: dmAttribute.annotations || [],
                        };
                    }

                    let attrPath;
                    const attributes = [];

                    Object.keys(dmInteraction.attributes).map((attributeKey) => {
                        attrPath = path + ".attributes." + attributeKey;
                        attributes.push(suggestAttribute(attrPath, dmInteraction.attributes[attributeKey]));
                    });

                    attributes.sort((a, b) => {
                        return a.filtercard.order - b.filtercard.order;
                    });
                    for (let i = 0; i < attributes.length; i++) {
                        attributes[i].filtercard.order = i + 1;
                    }

                    let modelName;

                    if (path === "patient") {
                        try {
                            modelName = utils.TextLib.getText2(`${normalize(join(__dirname, "../../i18n/mri-pa-config.properties"))}`,
                            "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA", lang);
                        } catch (err) {
                            console.log("formatter.ts: getText2 Error:");
                            console.log(err);
                            modelName = "Basic Data";
                        }
                    } else {
                        modelName = dmInteraction.name;
                    }

                    return {
                        modelName,
                        source: path,
                        visible: defaultValues.filtercards.visible,
                        order: dmInteraction.order || 0,
                        initial: path === "patient" ? true : defaultValues.filtercards.initial,
                        attributes,
                    };
                }

                let fcPath;
                const filtercards = [];
                // let interactionid;
                // let conditionId;
                let filterCard;
                filtercards.push(suggestFiltercard("patient", dmConfig.patient));

                Object.keys(dmConfig.patient.interactions).map((interactionid) => {
                    fcPath = "patient.interactions." + interactionid;
                    filterCard = suggestFiltercard(
                        fcPath,
                        dmConfig.patient.interactions[interactionid],
                    );
                    filtercards.push(filterCard);
                });

                Object.keys(dmConfig.patient.conditions).map((conditionId) => {
                    Object.keys(dmConfig.patient.conditions[conditionId].interactions).map((interactionid) => {
                        fcPath = "patient.conditions." + conditionId + ".interactions." + interactionid;
                        filterCard = suggestFiltercard(
                            fcPath,
                            dmConfig.patient.conditions[conditionId].interactions[interactionid],
                        );
                        filtercards.push(filterCard);
                    });
                });

                filtercards.sort((a, b) => {
                    return a.order - b.order;
                });
                for (let i = 0; i < filtercards.length; i++) {
                    filtercards[i].order = i + 1;
                }

                const chartOptions = defaultValues.chartOptions;
                chartOptions.vb.enabled = false;
                chartOptions.vb.visible = defaultValues.chartOptions.vb.visible;
                const panelOptions = defaultValues.panelOptions;
                callback(null, {
                    filtercards,
                    chartOptions,
                    configInformations: defaultValues.configInformations,
                    panelOptions,
                });
            },
        });
    }

    public clearDefault(callback: connLib.CallBackInterface) {
        this.ffhConfig.clearDefault(this.oUser.getUser(), this.CONFIG_TYPE, callback);
    }

    public async setDefault(configId, configVersion, callback: connLib.CallBackInterface) {
        try {
            await this.assertConfigAssignment(configId, configVersion);
            this.ffhConfig.setDefault(this.oUser.getUser(), this.CONFIG_TYPE, configId, configVersion, callback);
        } catch (err) {
            return callback(err, null);
        }
    }

    public getDefault(callback: connLib.CallBackInterface) {
        this.ffhConfig.getDefault(this.oUser.getUser(), this.CONFIG_TYPE, callback);
    }

    public async getUserConfig({ lang = 'en', configId }:{lang: string, configId: string}) {
        return new Promise<any[]>((resolve, reject) => {

            const buildSingleFrontEndConfig = (configs: AssignedConfigType[]) => {
                this.ffhConfig.getCDWConfig({
                    configId: configs[0].dependentConfig.configId,
                    configVersion: configs[0].dependentConfig.configVersion,
                    lang,
                    callback: (err, cdwConfig) => {
                        if (err) {
                            return reject(err);
                        }

                        const { config: paConfig, ...metaWithoutPaConfig } =
                          configs[0];
                        // delete configs[0].config;
                        const finalConfig = {
                          meta: metaWithoutPaConfig,
                          config: this.formatter.formatFrontendConfig({
                            mriConfig: paConfig,
                            dmConfig: cdwConfig,
                            lang,
                          }),
                        };

                        resolve([finalConfig]);
                    },
                });
            };

            const checkDefaultConfig = (assignedConfigs: AssignedConfigType[], doneCb: () => void) => {
                this.getDefault((err, defaultConfigDetails: { configId: string; configVersion: string; }) => {
                    if (err || !defaultConfigDetails) {
                        // ignore error and if there's no default config
                        return doneCb();
                    }

                    // found a default config!.
                    // Delete default config if it is not assigned
                    const filtered = assignedConfigs.filter((assigned) =>
                        assigned.configId === defaultConfigDetails.configId
                        && assigned.configVersion === defaultConfigDetails.configVersion,
                    );

                    // default config is not assigned so delete the default config
                    if (filtered.length === 0) {
                        return this.clearDefault(() => {
                            doneCb();
                        });
                    }

                    // default config is assigned!
                    try {
                        this.getFrontendConfig({
                            inConfigId: defaultConfigDetails.configId,
                            inConfigVersion: defaultConfigDetails.configVersion,
                            lang,
                            callback: (err, defaultConfig) => {
                                if (err) {
                                    return this.clearDefault(() => {
                                        doneCb();
                                    });
                                }
                                resolve([defaultConfig]);
                            },
                        });
                    } catch (e) { // can't get the default config. e.g. config is missing or assignment got deleted
                        this.clearDefault(() => {
                            doneCb();
                        });
                    }

                });
            };

            const getAssignedConfig = () =>{
                // return the list of assigned configs
                this.ffhConfig.getAssignedConfigs(this.CONFIG_TYPE, this.oUser, (err, configs: AssignedConfigType[]) => {
                    if (err) {
                        return reject(err);
                    }
                    checkDefaultConfig(configs, () => {
                        if (configs.length === 1) {
                            // if the user only got one config assigned, add the actual config to reduce the number of requests
                            buildSingleFrontEndConfig(configs);
                        } else if (configs.length > 1) {
                            resolve(this.formatter.formatUserList(configs));
                        } else {
                            // get default config Assignment
                            this.ffhConfig.getDefaultConfigAssignment(this.CONFIG_TYPE, (err, defaultConfigs: AssignedConfigType[]) => {
                                if (err) {
                                    return reject(err);
                                } else if (defaultConfigs && defaultConfigs.length > 0) {
                                    buildSingleFrontEndConfig([...defaultConfigs]);
                                } else {
                                    // no assigned config
                                    resolve(configs);
                                }
                            });
                        }
                    });
                });
            }

            if(configId){
                //get config selected for input configId
                const configVersion = 'A' // get the active config
                this._getConfigById(configId, configVersion, (err, config) => {
                    const returnConfig = config.meta;
                    returnConfig.config = config.config
                    buildSingleFrontEndConfig([returnConfig]);
                })
            }else{
                // return the list of assigned configs
                getAssignedConfig()
            }
        });
    }

    public getUserConfigList(callback: connLib.CallBackInterface, options: { studiesToInclude?: string[] }) {
        this.getDefault((err, defaultConfigDetails: { configId: string; configVersion: string; }) => {
            this.ffhConfig.getAssignedConfigs(this.CONFIG_TYPE, this.oUser, (err, configs) => {
                if (err) {
                    return callback(err, null);
                }
                this.ffhConfig.getDefaultConfigAssignment(this.CONFIG_TYPE, (err, defaultConfigs: AssignedConfigType[]) => {
                    if (err) {
                        return callback(err, null);
                    }
                    // Just check if the default config Assignments happens to be in the assigned configs already
                    if (defaultConfigs && defaultConfigs.length > 0) {
                        // get all default assignment config Ids
                        const defaultConfigIds: string[]
                            = defaultConfigs.map((config) => config.configId);

                        if (configs && configs.length > 0) {
                            const isDefaultConfigExits = configs.some((config) => {
                                return defaultConfigIds.includes(config.configId);
                            });
                            if (isDefaultConfigExits === false) {
                                configs.push(...defaultConfigs); // Add default config assignments to the list as well
                            }
                        } else {
                            configs = [...defaultConfigs]; // Add default config assignments to the list as well
                        }
                    }
                    callback(null, this.formatter
                        .formatUserList(
                            configs.map((config) => ({
                                ...config,
                                default: defaultConfigDetails.configId === config.configId,
                            })),
                        ));
                });
            }, options);
        });
    }

    private async getUserConfigAssignmentForGivenConfig(configId, configVersion): Promise<AssignedConfigType> {
        return new Promise<AssignedConfigType>((resolve, reject) => {
            this.ffhConfig.getAssignedConfigs(this.CONFIG_TYPE, this.oUser, (err, configs: AssignedConfigType[]) => {
                if (err) {
                    return reject(err);
                }
                this.ffhConfig.getDefaultConfigAssignment(this.CONFIG_TYPE, (err, defaultConfigs: AssignedConfigType[]) => {

                    // Just check if the default config Assignments happens to be in the assigned configs already
                    if (defaultConfigs && defaultConfigs.length > 0) {
                        // get all default assignment config Ids
                        const defaultConfigIds: string[]
                            = defaultConfigs.map((config) => config.configId);

                        if (configs && configs.length > 0) {
                            const isDefaultConfigExits = configs.some((config) => {
                                return defaultConfigIds.includes(config.configId);
                            });
                            if (isDefaultConfigExits === false) {
                                configs.push(...defaultConfigs); // Add default config assignments to the list as well
                            }
                        } else {
                            configs = [...defaultConfigs]; // Add default config assignments to the list as well
                        }
                    }
                    const configAssignment =  configs.filter((x) => x.configId === configId && x.configVersion === configVersion);
                    const user = this.oUser.userObject;

                    if (configAssignment.length === 0) {
                        return reject(new Error(`No config assignment found for
                            user: ${user.userId}
                            configId: ${configId}
                            configVersion: ${configVersion}
                        `));
                    }

                    resolve(configAssignment[0]);
                });
            }, {});
        });
    }

    private async checkConfigAssignment(configId, configVersion): Promise<boolean> {
       try {
        await this.getUserConfigAssignmentForGivenConfig(configId, configVersion);
        return Promise.resolve(true);
       } catch (err) {
           return Promise.reject(err);
       }
    }

    private assertConfigAssignment(configId, configVersion) {
        return new Promise(async (resolve, reject) => {
            try {
                const assigned =  await this.checkConfigAssignment(configId, configVersion);

                if (!assigned) {
                    logger.error("SECURITY INCIDENT! Current user tried to access not assigned config (Id: " + configId + " Version: " + configVersion);
                    return reject(new Error("MRI_PA_CFG_ERROR_NOT_ALLOWED_TO_USE_CONFIG"));
                }

                resolve(true);

            } catch (err) {
                reject(err);
            }
        });
    }

    private _getConfig({ configId, configVersion, formatter, noAssignmentCheck, lang }:
        {
            configId: string,
            configVersion: string,
            formatter: any,
            noAssignmentCheck: boolean,
            lang: string,
        }) {

        return new Promise<HPHConfigMetaType>(async (resolve, reject) => {

            if (!configVersion) {
                // if no config version is specified, query the active one
                configVersion = this.VERSION.ACTIVE;
            }

            const postExecute = async () => {
                try {
                    const configObj = await this.ffhConfig.getConfig({
                        configId,
                        configVersion,
                    });

                    const validateAndFormatConfig = (cdwConfig?: any) => {
                        if (!cdwConfig) {
                            return reject(new Error("MRI_PA_CFG_ERROR_DEPENDENT_CDW_CONFIG_NOT_FOUND"));
                        }
                        configObj.config = formatter.call(this.formatter, { mriConfig: configObj.config, dmConfig: cdwConfig, lang });
                        resolve(configObj);
                    };

                    if (configObj.meta.dependentConfig && configObj.meta.dependentConfig.configId) {
                        this.ffhConfig.getCDWConfig({
                            configId: configObj.meta.dependentConfig.configId,
                            configVersion: configObj.meta.dependentConfig.configVersion,
                            lang,
                            callback: (err, result) => {
                                if (err) {
                                    return reject(err);
                                }
                                validateAndFormatConfig(result);
                            },
                        });
                    } else {
                        validateAndFormatConfig();
                    }

                } catch (err) {
                    reject(err);
                }
            };

            if (!noAssignmentCheck) {
                try {
                    //await this.assertConfigAssignment(configId, configVersion);
                    postExecute();
                } catch (err) {
                    return reject(err);
                }
            } else {
                postExecute();
            }

        });
    }

    private _cleanConfigAnnotation(config) {
        const configWalkFunction = utils.getJsonWalkFunctionWithArrays(config);
        configWalkFunction("filtercards.*").concat(configWalkFunction("filtercards.*.attributes.*")).forEach((filtercard) => {
            if (filtercard.obj.annotations) {
                delete filtercard.obj.annotations;
            }
        });
        return config;
    }

    private _saveConfig(configId, configVersion, configName, config, dependentConfig, lang, callback: connLib.CallBackInterface) {
        config = this.formatter.trimConfigForSaving(config);

        let saveResult: any = {};

        this.ffhConfig.saveConfig({
            configId,
            configVersion,
            configType: this.CONFIG_TYPE,
            configName,
            config,
            dependentConfig,
        }, async (err, result) => {
            if (err) {
                return callback(err, null);
            }
            saveResult = result;
            if (saveResult.saved) {
                try {
                    const newConfig = await this.getAdminConfig({
                        configId: saveResult.meta.configId,
                        configVersion: saveResult.meta.configVersion,
                        lang,
                    });
                    saveResult.meta = newConfig.meta;
                    saveResult.config = newConfig.config;
                    callback(null, saveResult);
                } catch (err) {
                    callback(err, null);
                }

            } else {
                callback(null, saveResult);
            }
        });
    }

    private _loadDefaultValues() {
        return configDefaultValues;
    }

    private async _getConfigById(configId, configVersion, callback) {
    try {
      const result = await this.ffhConfig.getConfig({
        configId,
        configVersion: configVersion || undefined,
      });
      callback(null, result);
    } catch (err) {
      callback(err, null);
    }
  }
}
