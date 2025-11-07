import { Connection as connLib, Logger } from "@alp/alp-base-utils";
import { MRIConfig } from "./config";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
const logger = Logger.CreateLogger("mri-config-log");

const HTTP_METHOD_POST: number = 1;
const HTTP_METHOD_GET: number = 3;
const HTTP_BAD_REQUEST: number = 400;
const HTTP_OK: number = 200;
export class ConfigFacade {
    constructor(
        private connection: ConnectionInterface,
        private config: MRIConfig,
        testMode: boolean = false,
        fs: any = null) {
    }

    public getFfhConfig() {
        return this.config;
    }

    public async invokeService(request: any, callback: CallBackInterface) {
        switch (request.action) {
            case "getMyConfig":
                try {
                    const result = await this.config.getUserConfig({ lang: request.language, configId: request.configId });
                    callback(null, result);
                } catch (err) {
                    callback(err, null);
                }

                break;
            case "getMyConfigList":
                this.config.getUserConfigList((err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                }, { studiesToInclude: request.studiesToInclude });
                break;
            case "getMyStudyConfigList":
                this.config.getUserConfigList((err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                }, {});
                break;
            case "getFrontendConfig":
                this.config.getFrontendConfig({
                    inConfigId: request.configId,
                    inConfigVersion: request.configVersion,
                    lang: request.language,
                    callback: (err, result) => {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, result);
                        }
                    },
                });
                break;
            case "getCDWConfig":
            case "getBackendConfig":
                try {
                    const result = await this.config.getBackendConfig({
                        configId: request.configId,
                        configVersion: request.configVersion,
                        lang: request.language,
                    });

                    callback(null, result);
                } catch (err) {
                    callback(err, null);
                }
                break;
            case "getConfig":
                try {
                    const result = await this.config.getConfig({
                        configId: request.configId,
                        configVersion: request.configVersion,
                        lang: request.language,
                    });

                    callback(null, result);
                } catch (err) {
                    callback(err, null);
                }
                break;
            case "getAdminConfig":
                try {
                    const result = await this.config.getAdminConfig({
                        configId: request.configId,
                        configVersion: request.configVersion,
                        lang: request.language,
                    });
                    callback(null, result);
                } catch (err) {
                    callback(err, null);
                }
                break;
            case "delete":
                this.config.deleteConfig(request.configId, request.configVersion, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "validate":
                this.config.validateConfig(request.config, request.dependentConfig, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "save":
                this.config.saveConfig(request.configId, request.configName, request.config, request.dependentConfig, request.language, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "activate":
                this.config.activateConfig(request.configId, request.configName, request.config, request.dependentConfig, request.language, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "getAll":
                this.config.getAllConfigs((err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "suggest":
                this.config.suggestConfig(request.dependentConfig, request.language, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "clearDefault":
                this.config.clearDefault((err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "setDefault":
                this.config.setDefault(request.configId, request.configVersion, (err, result) => {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
                break;
            case "loadFromFile":
                this.config.loadFromFile(request.filePath,
                    request.configId,
                    request.configName,
                    JSON.parse(request.dependentConfig),
                    request.language,
                    (err, result) => {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, result);
                        }
                    });
                break;
            case "export":
                try {
                    const result = await this.config.getAdminConfig({
                        configId: request.configId,
                        configVersion: request.configVersion,
                        lang: request.language,
                    });
                    let configName = "PatientAnalyticsConfig";
                    if (result && result.hasOwnProperty("meta") && result.meta.hasOwnProperty("configName")) {
                        configName = result.meta.configName;
                    }
                    const filename = configName + ".json";
                    callback(null, { config: JSON.stringify(result.config, null, 4), filename });
                } catch (err) {
                    callback(err, null);
                }
                break;
            default:
                const err = new Error("MRI_PA_CFG_ERROR_ACTION_NOT_SUPPORTED");
                callback(err, null);
        }
    }

    /**
     * Returns list of authorized users based on param action
     * @param action
     * @param callback
     */
    private getPrivilegeMap(action: string, callback: CallBackInterface) {
        switch (action) {
            case "getFrontendConfig":
            case "clearDefault":
            case "setDefault":
            case "getMyConfig":
            case "getMyConfigList": return ["mri-users", "mri-admin"];
            case "getMyStudyConfigList": return ["mri-users", "mri-admin"];
            case "save":
            case "validate":
            case "activate":
            case "delete":
            case "suggest":
            case "getAll":
            case "export":
            case "getAdminConfig":
            case "loadFromFile": return ["mri-admin"];
            default: return callback(new Error("MRI_PA_CFG_ERROR_ACTION_NOT_SUPPORTED"), null);
        }
    }
}
