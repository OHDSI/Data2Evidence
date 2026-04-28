/*
    Clinical Data Model Configuration Logic
*/
//import * as async from "async";
import * as cfg from "@alp/alp-config-utils";
import { CreateLogger } from "../../utils/Logger";
import { isXS2 } from "../../utils/utils";
import { CDWValidator } from "./CDWValidation";
import * as configDefinitionLib from "./configDefinition";
import * as configSuggestionLib from "./configSuggestion";
import * as configTemplateLib from "./configTemplate";
import * as formatterLib from "./formatter";
const configTools = cfg.configTools;
const FfhConfig = cfg.FFHConfig.FFHConfig;
import * as settingsLib from "../settings/OldSettings";
import { Settings } from "../settings/Settings";
import {
  User,
  Connection as connLib,
  Constants,
  EnvVarUtils,
} from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;

export interface AssignementInterface {
  hasConfigAssigned(oSettings: any, callback?: any): boolean;
  getAssignedConfigs(configType, callback?): any[];
}

export const CONFIG_TYPES = {
  GLOBAL_SETTINGS: "HC/HPH/GLOBAL",
  CDW: "HC/HPH/CDW",
  PA: "HC/MRI/PA",
  PS: "HC/HPH/PATIENT",
};
export const MESSAGES = {
  NO_OLD_CONFIGS_FOUND_MSG:
    "No old CDM configurations found, hence no migration required.",
  MIGRATION_COMPLETED_MSG:
    "Successfully migrated all old CDM configurations to the new format.",
  NO_GLOBAL_SETTINGS_FOUND_ERR_MSG: "No global settings found in DB!",
  MANY_GLOBAL_SETTINGS_FOUND_ERR_MSG: "Many global settings found in DB!",
  NO_ASSIGNMENT_FOUND_ERR_MSG: "No assignment found in DB!",
  NO_DEFAULT_CDW_CONFIG_ASSIGNED_ERR_MSG:
    "No default CDM config assigned/ the assigned CDM config no longer has an ACTIVE version!",
  NO_ADV_SETTINGS_IN_DEFAULT_CDW_CONFIG_ERR_MSG:
    "Default CDW config does not have advanced settings defined!",
};

export class FfhQeConfig {
  public FORMAT_FLAG;
  private utilsLib: any;
  private CONFIG_TYPE;
  private CONFIG_FORMATTER_SETTINGS;
  private PRIVILEGES;
  private ffhConfig: cfg.FFHConfig.FFHConfig;
  private emptyConfigValidationResult: ConfigValidationResultType = {
    cdmConfigValidationResult: {
      errors: [],
      warnings: [],
      valid: true,
    },
    advancedConfigValidationResult: {
      valid: true,
      messages: [],
      result: [],
    },
  };

  constructor(
    private conn: ConnectionInterface,
    private assignmentLib: AssignementInterface,
    private settingsObj: Settings,
    private userObj: User,
    private testMode: boolean = false
  ) {
    this.conn = conn;
    this.utilsLib = configTools;
    this.ffhConfig = new FfhConfig(conn, this.userObj);

    this.CONFIG_TYPE = "HC/HPH/CDW";

    this.CONFIG_FORMATTER_SETTINGS = {
      UNMODIFIED: {
        restrictToLanguage: false,
        applyDefaultAttributes: false,
        includeDisabledElements: true,
        concatOTSAttributes: false,
        applyDefaultPlaceholderMeta: true,
      },
      REDUCED: {
        restrictToLanguage: true,
        applyDefaultAttributes: true,
        includeDisabledElements: false,
        concatOTSAttributes: true,
        applyDefaultPlaceholderMeta: true,
      },
    };

    this.FORMAT_FLAG = {
      AGGREGATED_LIST: "aggr",
    };

    this.PRIVILEGES = {
      GET: "get",
      GET_AS_ADMIN: "getAsAdmin",
      SAVE: "save",
      VALIDATE: "validate",
      ACTIVATE: "activate",
      DELETE: "delete",
      SUGGEST: "suggest",
      GET_ALL: "getAll",
    };
  }

  public getFfhConfigObj() {
    return this.ffhConfig;
  }

  public async getAdminConfig(configId, configVersion) {
    return new Promise<CDMConfigMetaType>((resolve, reject) => {
      try {
        this.assertPermission(this.PRIVILEGES.GET_AS_ADMIN);
        this._getConfig(configId, configVersion, (err, configObj) => {
          if (err) {
            return reject(err);
          }
          configObj.config = formatterLib.format(
            configObj.config,
            this.CONFIG_FORMATTER_SETTINGS.UNMODIFIED
          );
          try {
            configObj.template = this.templateConfig(this.conn);
          } catch (e) {
            //No Template was found, which is OK. Just Proceed
          }
          return resolve(configObj);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public getBackendConfig(
    configId,
    configVersion,
    noAssignmentCheck,
    callback: CallBackInterface
  ) {
    const that = this;
    this.assertPermission(this.PRIVILEGES.GET);
    if (!noAssignmentCheck) {
      const hasConfigAssigned = this.assignmentLib.hasConfigAssigned({
        configId,
        configVersion,
      });
      if (!hasConfigAssigned) {
        callback(
          new Error("HPH_CDM_CFG_ERROR_NOT_ALLOWED_TO_USE_CONFIG"),
          null
        );
        return;
      }
    }

    this._getConfig(configId, configVersion, (err, configObj) => {
      if (err) {
        callback(err, null);
        return;
      }
      const flags = that.CONFIG_FORMATTER_SETTINGS.REDUCED;
      configObj.config = formatterLib.format(configObj.config, flags);
      callback(null, configObj);
    });
  }

  public deleteConfig(configId, configVersion, callback) {
    try {
      this.assertPermission(this.PRIVILEGES.DELETE);
      this.ffhConfig.deleteConfig(
        {
          configId,
          configVersion,
        },
        callback
      );
    } catch (err) {
      callback(err, null);
    }
  }

  public countDependingConfig(configId, configVersion, callback) {
    try {
      this.assertPermission(this.PRIVILEGES.DELETE);
      this.ffhConfig.checkDependingConfig(
        {
          configId,
          configVersion,
        },
        callback
      );
    } catch (err) {
      callback(err, null);
    }
  }

  public validateConfig(config, analyticsConnection): ConfigValidationResultType {
    const result = this.emptyConfigValidationResult;
    this.assertPermission(this.PRIVILEGES.VALIDATE);
    const definition = configDefinitionLib.getDefinition(
      config.advancedSettings.tableMapping
    );
    const validator = new CDWValidator(analyticsConnection, config);
    const tmpValidationResult = validator.validateConfiguration(definition);
    result.cdmConfigValidationResult = {
      errors: tmpValidationResult.errors,
      warnings: tmpValidationResult.warnings,
      valid: tmpValidationResult.errors.length === 0,
    };
    return result;
  }

  // // TODO: Should be removed later
  // public async testAttribute(config, callback: CallBackInterface) {
  //   this.assertPermission(this.PRIVILEGES.VALIDATE);
  //   const definition = configDefinitionLib.getDefinition(
  //     config.advancedSettings
  //   );
  //   if(this.analyticsConnection == null || this.analyticsConnection == ''){
  //     this.analyticsConnection = await getAnalyticsConnection(this.userObj)
  //   }
  //   const validator = new CDWValidator(this.analyticsConnection, config);
  //   const preValidation = validator.validateConfiguration(definition);

  //   if (!(preValidation.errors.length === 0)) {
  //     return callback(null, {
  //       errors: preValidation.errors,
  //       warnings: preValidation.warnings,
  //       valid: preValidation.errors.length === 0,
  //     });
  //   }

  //   try {
  //     const validationResult = await validator.testAllAttributes(definition);

  //     callback(null, {
  //       errors: validationResult.errors,
  //       warnings: validationResult.warnings,
  //       valid: validationResult.errors.length === 0,
  //     });
  //   } catch (err) {
  //     return callback(err, null);
  //   }
  // }

  public saveConfig(configId, configName, config, callback) {
    try {
      this.assertPermission(this.PRIVILEGES.SAVE);
      this._saveConfig(
        configId,
        null,
        configName,
        formatterLib.STATUS.INACTIVE,
        config,
        async (err, saveResult) => {
          if (err) {
            callback(err, null);
            return;
          }

          const deleteAndSaveConfig = () => {
            if (!(configId === "")) {
              this.deleteConfig(configId, "0", (err, result) => {
                if (err) {
                  callback(err, null);
                } else {
                  callback(null, saveResult);
                }
              });
            } else {
              callback(null, saveResult);
            }
          };

          if (saveResult.saved) {
            try {
              const adminConfig: any = await this.getAdminConfig(
                saveResult.meta.configId,
                saveResult.meta.configVersion
              );
              saveResult.config = adminConfig.config;
              saveResult.template = adminConfig.template;
              deleteAndSaveConfig();
            } catch (err) {
              return callback(err, null);
            }
          } else {
            deleteAndSaveConfig();
          }
        }
      );
    } catch (err) {
      callback(err, null);
    }
  }

  public autoSaveConfig(configId, configVersion, configName, config, analyticsConnection, callback) {
    try {
      this.assertPermission(this.PRIVILEGES.SAVE);
      this._saveConfigWithoutValidation(
        configId,
        configVersion,
        configName,
        formatterLib.STATUS.DRAFT,
        config,
        analyticsConnection,
        async (err, autoSaveResult) => {
          if (err) {
            callback(err, null);
            return;
          }
          if (autoSaveResult.saved) {
            try {
              const result = await this.getAdminConfig(
                autoSaveResult.meta.configId,
                autoSaveResult.meta.configVersion
              );
              autoSaveResult.config = result.config;
              callback(null, autoSaveResult);
            } catch (err) {
              return callback(err, null);
            }
          } else {
            callback(null, autoSaveResult);
          }
        }
      );
    } catch (err) {
      callback(err, null);
    }
  }

  public async activateConfig(
    configId,
    configVersion,
    configName,
    config,
    analyticsConnection,
    callback
  ) {
    try {
      this.assertPermission(this.PRIVILEGES.ACTIVATE);
      let newConfig = false;

      const saveConfig = () => {
        this._saveConfig(
          configId,
          configVersion,
          configName,
          formatterLib.STATUS.ACTIVE,
          config,
          (err, saveResult) => {
            if (err) {
              return callback(err, null);
            }

            if (saveResult.saved) {
              this.ffhConfig.setOthersState(
                {
                  configId: saveResult.meta.configId,
                  configVersion: saveResult.meta.configVersion,
                  config,
                  newStatus: formatterLib.STATUS.INACTIVE,
                },
                async (err, result) => {
                  if (err) {
                    return callback(err, null);
                  }

                  try {
                    const adminConfig = await this.getAdminConfig(
                      saveResult.meta.configId,
                      saveResult.meta.configVersion
                    );

                    saveResult.config = adminConfig.config;
                    saveResult.template = adminConfig.template;
                    if (newConfig && configId) {
                      this.deleteConfig(configId, "0", (err, result) => {
                        if (err) {
                          callback(err, null);
                        } else {
                          callback(null, saveResult);
                        }
                      });
                    } else {
                      callback(null, saveResult);
                    }
                  } catch (err) {
                    return callback(err, null);
                  }
                }
              );
            } else {
              callback(null, saveResult);
            }
          }
        );
      };

      const validateConfig = () => {
        if (!config) {
          return callback(
            new Error("HPH_CDM_CFG_ERROR_NO_CONFIG_TO_ACTIVATE"),
            null
          );
        }

        const globalSettingsObj = this.settingsObj.getSettings();
        if (EnvVarUtils.isCDWValidationEnabled()) {
          this.validateCDMConfigAndTableMappings(
            config,
            analyticsConnection,
            (err, validationResult) => {
              if (err) {
                return callback(err, null);
              }

              if (
                !validationResult.cdmConfigValidationResult.valid ||
                !validationResult.advancedConfigValidationResult.valid
              ) {
                validationResult.saved = false;
                callback(null, { validationResult });
              } else {
                saveConfig();
              }
            }
          );
        } else {
          saveConfig();
        }
      };

      if ((!config || !config.patient) && configId && configVersion) {
        // activate existing config
        try {
          const result = await this.getAdminConfig(configId, configVersion);
          config = result.config;
          validateConfig();
        } catch (err) {
          return callback(err, null);
        }
      } else {
        //create a new config and activate it
        this.ffhConfig.getNewVersion(configId, (err, result) => {
          if (err) {
            return callback(err, null);
          }
          configVersion = result;
          newConfig = true;
          validateConfig();
        });
      }
    } catch (err) {
      callback(err, null);
    }
  }

  public getUserConfigs() {
    this.assertPermission(this.PRIVILEGES.GET);
    return this.assignmentLib.getAssignedConfigs(this.CONFIG_TYPE);
  }

  public getAllConfigs(formatFlag, includeDraft = true, callback) {
    try {
      this.assertPermission(this.PRIVILEGES.GET_ALL);

      //For CDM Config, include all Drafts
      this.ffhConfig.getAllConfigs(this.CONFIG_TYPE, (err, configList) => {
        if (err) {
          callback(err, null);
          return;
        }
        if (formatFlag === this.FORMAT_FLAG.AGGREGATED_LIST) {
          configList = formatterLib.formatOverview(configList);
        }
        callback(null, configList);
      });
    } catch (err) {
      callback(err, null);
    }
  }

  // Not being called anywhere
  // public loadFromFile(filePath, configId, configName, fsLib, callback) {
  //   this.assertPermission(this.PRIVILEGES.ACTIVATE);
  //   const file = this.utilsLib.extractPackageAndFile(filePath);
  //   if (file[2] !== "json") {
  //     // throw new Error("HPH_CDM_CFG_ERROR_LOAD_FILE_ERROR_INVALID_FILE_EXTENSION");
  //     callback(
  //       new Error("HPH_CDM_CFG_ERROR_LOAD_FILE_ERROR_INVALID_FILE_EXTENSION"),
  //       null
  //     );
  //     return;
  //   }
  //   const config = this.utilsLib.loadFile(file[0], file[1], file[2], fsLib);
  //   this.activateConfig(
  //     configId,
  //     null,
  //     configName,
  //     config,
  //     (err, saveResult) => {
  //       if (err) {
  //         callback(err, null);
  //         return;
  //       }
  //       callback(null, formatterLib.loadFromFileResult(saveResult));
  //     }
  //   );
  // }

  public suggestConfig(callback: CallBackInterface) {
    try {
      this.assertPermission(this.PRIVILEGES.SUGGEST);
      configSuggestionLib.suggestConfig(this.conn, this.settingsObj, callback);
    } catch (err) {
      callback(err, null);
    }
  }

  public blankConfigWithDefaultAttributes(callback: CallBackInterface) {
    this.assertPermission(this.PRIVILEGES.SUGGEST);
    configSuggestionLib.generateConfigWithDefaultAttributes(
      this.settingsObj,
      callback
    );
  }

  public blankConfig(callback: CallBackInterface) {
    configSuggestionLib.generateEmptyConfig(callback);
  }

  public templateConfig(conn) {
    this.assertPermission(this.PRIVILEGES.GET_AS_ADMIN);
    return configTemplateLib.templateConfig(conn, this.settingsObj);
  }

  public getAttributeTypes() {
    return configTemplateLib.getAttributeTypes();
  }

  private logMissingPermission(privilege) {
    let missingPrivilege = [];
    if (privilege instanceof Array) {
      missingPrivilege = privilege;
    } else {
      missingPrivilege = [privilege];
    }

    if (!isXS2()) {
      CreateLogger().error(
        "User does not have any of the required privileges: " +
          missingPrivilege.join(", ")
      );
      //$.trace.error("User does not have any of the required privileges: " + missingPrivilege.join(", "));
    }
  }

  private checkPermission(privilege) {
    try {
      const appPrivilege = "legacy.cdw.config.services::" + privilege;
      let existsPrivilege;

      if (isXS2()) {
        existsPrivilege = true; //no check #pure_node
      } else {
        // existsPrivilege = true;
        //existsPrivilege = $.session.hasAppPrivilege(appPrivilege);
      }
      return existsPrivilege;
    } catch (e) {
      this.logMissingPermission(privilege);
      throw new Error("HPH_CDM_CFG_ERROR_APPLICATION_PRIVILEGE_NOT_FOUND");
    }
  }

  private assertPermission(privilege) {
    if (!this.checkPermission(privilege)) {
      this.logMissingPermission(privilege);
      throw new Error("HPH_CDM_CFG_ERROR_MISSING_APPLICATION_PRIVILEGE");
    }
  }

  private _saveConfig(
    configId,
    configVersion,
    configName,
    configStatus,
    config,
    callback
  ) {
    const that = this;
    let saveResult: any = {};
    const saveConfig = () => {
      that.ffhConfig.saveConfig(
        {
          configId,
          configVersion,
          configStatus,
          configName,
          configType: that.CONFIG_TYPE,
          config,
        },
        (err, result) => {
          if (err) {
            callback(err, null);
            return;
          }
          saveResult = result;
          saveResult.validationResult = this.emptyConfigValidationResult;
          callback(null, saveResult);
        }
      );
    };

    configVersion
      ? saveConfig()
      : this.ffhConfig.getNewVersion(configId, (err, result) => {
          if (err) {
            callback(err, null);
            return;
          }
          configVersion = result;
          saveConfig();
        });
  }

  private _saveConfigWithoutValidation(
    configId,
    configVersion,
    configName,
    configStatus,
    config,
    analyticsConnection,
    callback
  ) {
    const validationResult = this.validateConfig(config, analyticsConnection);
    const that = this;

    let saveResult: any = {};
    if (configId) {
      const saveConfig = () => {
        that.ffhConfig.saveConfig(
          {
            configId,
            configVersion,
            configStatus,
            configName,
            configType: that.CONFIG_TYPE,
            config,
          },
          (err, result) => {
            if (err) {
              callback(err, null);
              return;
            }
            saveResult = result;
            saveResult.validationResult = validationResult;
            callback(null, saveResult);
          }
        );
      };
      configVersion
        ? saveConfig()
        : this.ffhConfig.getNewVersion(configId, (err, result) => {
            if (err) {
              callback(err, null);
              return;
            }
            configVersion = result;
            saveConfig();
          });
    } else {
      const settings: any = {};
      settings.configId = configId;
      settings.configVersion = configVersion;
      settings.configStatus = configStatus;
      settings.configName = configName;
      settings.configType = this.CONFIG_TYPE;
      settings.dependentConfig = {};

      saveResult = { meta: settings, saved: false };
      saveResult.validationResult = validationResult;
      callback(null, saveResult);
    }
  }

  /**
   * Convenience function to get the config by id and version.
   * @private
   * @param {String} configId Config id
   * @param {String} [configVersion] Optional config version
   * @returns {Object} Config object.
   */
  private async _getConfig(configId, configVersion, callback) {
    try {
      const result = await this.ffhConfig.getConfig({
        configId,
        configVersion: configVersion || undefined,
        configStatus: configVersion ? undefined : formatterLib.STATUS.ACTIVE,
      });
      callback(null, result);
    } catch (err) {
      callback(err, null);
    }
  }

  public async validateCDMConfigAndTableMappings(
    config: CDMConfigType,
    analyticsConnection: ConnectionInterface,
    callback: CallBackInterface
  ) {
    try {
      this.assertPermission(this.PRIVILEGES.VALIDATE);
      const validationResult = {
        cdmConfigValidationResult: {},
        advancedConfigValidationResult: {},
      };
      const { advancedSettings } = config;
      await new Promise(async (resolve, reject) => {
        settingsLib.validateSettings(
          analyticsConnection,
          advancedSettings,
          (err1, messages: ValidationMessageType[]) => {
            if (err1) {
              return reject(err1);
            }

            validationResult.advancedConfigValidationResult = {
              valid: messages.length === 0 ? true : false,
              messages,
              result: [],
            };
            return resolve(null);
          }
        );
      });

      await new Promise(async (resolve, reject) => {
        const definition = configDefinitionLib.getDefinition(
          config.advancedSettings.tableMapping
        );
        const validator = new CDWValidator(analyticsConnection, config);
        const preValidation = validator.validateConfiguration(definition);

        if (!(preValidation.errors.length === 0)) {
          validationResult.cdmConfigValidationResult = {
            errors: preValidation.errors,
            warnings: preValidation.warnings,
            valid: preValidation.errors.length === 0,
          };
          return resolve(null);
        }

        try {
          const result = await validator.testAllAttributes(definition);

          validationResult.cdmConfigValidationResult = {
            errors: result.errors,
            warnings: result.warnings,
            valid: result.errors.length === 0,
          };
          return resolve(null);
        } catch (err) {
          return reject(err);
        }
      });

      callback(null, validationResult);
    } catch (err) {
      callback(err, null);
    }
  }

  public getUserConfig(
    configType: string,
    userOrgs,
    callback: CallBackInterface
  ) {
    // get the given user and config type get all assigned configs
    this.CONFIG_TYPE = configType;
    this.ffhConfig.getAssignedConfigs(
      configType,
      this.userObj,
      (err, assignedConfigs) => {
        if (err) {
          callback(err, null);
        } else {
          let assignedConfig: any;
          if (!assignedConfigs || assignedConfigs.length === 0) {
            callback(new Error(MESSAGES.NO_ASSIGNMENT_FOUND_ERR_MSG), null);
          } else if (assignedConfigs.length === 1) {
            // get the underlying cdw config
            assignedConfig = assignedConfigs[0];
            this._getConfig(
              assignedConfig.configId,
              assignedConfig.configVersion,
              (err, cdwConfig) => {
                if (err) {
                  callback(err, null);
                } else {
                  assignedConfig.config.patient = cdwConfig.patient;
                  assignedConfig.config.advancedSettings =
                    cdwConfig.advancedSettings;
                  callback(null, assignedConfig);
                }
              }
            );
          } else if (assignedConfigs.length > 1) {
            // if >1 configs found, check against the default config assigned
            this.ffhConfig.getDefault(
              this.userObj.getUser(),
              configType,
              (err, defaultConfig) => {
                if (err) {
                  callback(err, null);
                } else {
                  assignedConfig = assignedConfigs.find((el) => {
                    return (
                      el.configId === defaultConfig.configId &&
                      el.configVersion === defaultConfig.configVersion
                    );
                  });
                  // get the underlying cdw config
                  this._getConfig(
                    assignedConfig.configId,
                    assignedConfig.configVersion,
                    (err, cdwConfig) => {
                      if (err) {
                        callback(err, null);
                      } else {
                        assignedConfig.config.patient = cdwConfig.patient;
                        assignedConfig.config.advancedSettings =
                          cdwConfig.advancedSettings;
                        callback(null, assignedConfig);
                      }
                    }
                  );
                }
              }
            );
          }
        }
      },
      {}
    );
  }
  /*
   * Migrate the old CDW configs to new MRI 3.0 format.
   * @param {CallBackInterface} callback
   */
  public migrateOldCDMConfigs(callback: CallBackInterface) {
    try {
      // get all cdw configs
      const oldConfigs = [];
      this.ffhConfig.getFullConfigsByType(CONFIG_TYPES.CDW, (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          if (result && result.length > 0) {
            result.forEach((el) => {
              if (!el.config.hasOwnProperty("advancedSettings")) {
                oldConfigs.push(el);
              }
            });
            if (oldConfigs.length === 0) {
              callback(null, MESSAGES.NO_OLD_CONFIGS_FOUND_MSG);
            } else {
              this.ffhConfig.getFullConfigsByType(
                CONFIG_TYPES.GLOBAL_SETTINGS,
                (err, data) => {
                  if (err) {
                    if (err.message === "HPH_CFG_NO_CONFIGS_FOUND") {
                      callback(
                        new Error(MESSAGES.NO_GLOBAL_SETTINGS_FOUND_ERR_MSG),
                        null
                      );
                    } else {
                      callback(err, null);
                    }
                  } else {
                    if (data) {
                      if (data.length === 0) {
                        callback(
                          new Error(MESSAGES.NO_GLOBAL_SETTINGS_FOUND_ERR_MSG),
                          null
                        );
                      } else if (data.length > 1) {
                        callback(
                          new Error(
                            MESSAGES.MANY_GLOBAL_SETTINGS_FOUND_ERR_MSG
                          ),
                          null
                        );
                      } else {
                        oldConfigs.forEach((el) => {
                          el.config.advancedSettings = data[0].config;
                        });

                        async.each(
                          oldConfigs,
                          (oldConfig, cb) => {
                            this._saveConfig(
                              oldConfig.meta.configId,
                              oldConfig.meta.configVersion,
                              oldConfig.meta.configName,
                              oldConfig.meta.configStatus,
                              oldConfig.config,
                              cb
                            );
                          },
                          (err) => {
                            if (err) {
                              callback(err, null);
                            } else {
                              callback(null, MESSAGES.MIGRATION_COMPLETED_MSG);
                            }
                          }
                        );
                      }
                    }
                  }
                }
              );
            }
          }
        }
      });
    } catch (err) {
      callback(err, null);
    }
  }

  /*
   * Migrate the old CDW configs to new MRI 3.0 format.
   * @param {CallBackInterface} callback
   */
  public getConfigsByType(configType: string, callback: CallBackInterface) {
    this.ffhConfig.getFullConfigsByType(configType, (err, results) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, results);
      }
    });
  }

  /**
   * Get the default assigned config for the given types.
   * @param configType Config type
   * @param callback
   */
  public getDefaultCDMConfigAssignment(callback) {
    const user = "DEFAULT_CONFIG_ASSIGNMENT";
    const GET_DEFAULT_CONFIG_ASSIGNMENT = `SELECT
                assignment."Id" as ASSIGNMENT_ID,
                assignment."Name" as ASSIGNMENT_NAME,
                config."Id" as CONFIG_ID,
                config."Version" as CONFIG_VERSION,
                config."Status" as CONFIG_STATUS,
                config."Name" as CONFIG_NAME,
                config."ParentId" as DEPENDENT_CONFIG_ID,
                config."ParentVersion" as DEPENDENT_CONFIG_VERSION,
                config."Data" as "DATA"
            FROM "ConfigDbModels_Assignment" as assignment
                JOIN "ConfigDbModels_Config" as config
                    ON assignment."ConfigId" = config."Id"
            WHERE config."Type" = ?
                AND config."Id" is not null
                AND config."Status" = 'A'
                AND assignment."EntityType" = 'U'
                AND assignment."EntityValue" = ?`;
    const params = [
      { value: CONFIG_TYPES.CDW, type: "string" },
      { value: user, type: "string" },
    ];
    this.conn.executeQuery(
      GET_DEFAULT_CONFIG_ASSIGNMENT,
      params,
      (err, result) => {
        if (err) {
          callback(err, null);
        }
        let defaultConfigAssignment: any;
        if (result && result.length > 0) {
          try {
            const value = result[0];
            const config = value.DATA;
            defaultConfigAssignment = {
              assignmentId: value.ASSIGNMENT_ID,
              assignmentName: value.ASSIGNMENT_NAME,
              configId: value.CONFIG_ID,
              configVersion: value.CONFIG_VERSION,
              configStatus: value.CONFIG_STATUS,
              configName: value.CONFIG_NAME,
              dependentConfig: {
                configId: value.DEPENDENT_CONFIG_ID,
                configVersion: value.DEPENDENT_CONFIG_VERSION,
              },
              config: config ? JSON.parse(config) : null,
            };
          } catch (err) {
            // tslint:disable-next-line:no-console
            console.error(
              `Error getting assigned configs: configType: ${CONFIG_TYPES.CDW}, user: ${user}`
            );
            callback(err, null);
          }
        }
        callback(null, defaultConfigAssignment);
      }
    );
  }
}
