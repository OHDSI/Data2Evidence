import { Connection as connLib, User } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import { Settings } from "../settings/Settings";
import { FfhQeConfig, MESSAGES } from "./config";
import { DbMeta } from "../settings/DbMeta";
import { getAnalyticsConnection } from "../../utils/utils";
import { getDatasetIdFromConfig } from "../settings/Utils";

export class ConfigFacade {
  private settings: Settings;
  private userObj: User;

  constructor(
    private connection: ConnectionInterface,
    private ffhQeConfig: FfhQeConfig,
    private user: User,
    private token: string,
    testMode?: boolean
  ) {
    this.settings = new Settings();
    this.userObj = this.user;
    this.token = this.token;
  }

  public getFfhQeConfig() {
    return this.ffhQeConfig;
  }
  public getSettings() {
    return this.settings;
  }
  public async invokeService(
    request: any,
    callback: CallBackInterface,
    userOrgs?
  ) {
    let analyticsConn;
    switch (request.action) {
      case "getAdminConfig":
        try {
          const result = await this.ffhQeConfig.getAdminConfig(
            request.configId,
            request.configVersion
          );
          callback(null, result);
        } catch (err) {
          return callback(err, null);
        }
        break;
      case "countDependingConfig":
        this.ffhQeConfig.countDependingConfig(
          request.configId,
          request.configVersion,
          (err, result) => {
            if (err) {
              callback(err, null);
            } else {
              let res;
              if (result && result.data) {
                res = result.data.length;
              } else {
                res = 0;
              }
              callback(null, res);
            }
          }
        );
        break;
      case "delete":
        this.ffhQeConfig.deleteConfig(
          request.configId,
          request.configVersion,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            callback(null, result);
          }
        );
        break;
      case "validate":
        const datasetId = getDatasetIdFromConfig(request.config);
        analyticsConn = await getAnalyticsConnection(
          this.userObj,
          this.token,
          datasetId
        );
        this.ffhQeConfig.validateCDMConfigAndTableMappings(
          request.config,
          analyticsConn,
          (err, res) => {
            if (err) {
              return callback(err, null);
            }
            callback(null, { validationResult: res });
          }
        );
        break;
      case "save":
        this.ffhQeConfig.saveConfig(
          request.configId,
          request.configName,
          request.config,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            return callback(null, result);
          }
        );
        break;
      case "autosave":
        analyticsConn = await getAnalyticsConnection(this.userObj, this.token);
        this.ffhQeConfig.autoSaveConfig(
          request.configId,
          request.configVersion,
          request.configName,
          request.config,
          analyticsConn,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            return callback(null, result);
          }
        );
        break;
      case "activate":
        analyticsConn = await getAnalyticsConnection(this.userObj, this.token);
        this.ffhQeConfig.activateConfig(
          request.configId,
          request.configVersion,
          request.configName,
          request.config,
          analyticsConn,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            return callback(null, result);
          }
        );
        break;
      case "suggest":
        this.ffhQeConfig.suggestConfig((err, result) => {
          if (err) {
            return callback(err, null);
          }
          return callback(null, result);
        });
        break;
      case "configDefaults":
        this.ffhQeConfig.blankConfig((err, result) => {
          if (err) {
            return callback(err, null);
          }
          return callback(null, result);
        });
        break;
      case "getMy":
        callback(null, this.ffhQeConfig.getUserConfigs());
        break;
      case "getAll":
        this.ffhQeConfig.getAllConfigs(
          this.ffhQeConfig.FORMAT_FLAG.AGGREGATED_LIST,
          undefined,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            return callback(null, result);
          }
        );
        break;
      case "template":
        callback(null, this.ffhQeConfig.templateConfig(this.connection.conn));
        break;
      case "default_mapping":
        // used as the advanced settings template in the UI
        callback(null, this.settings.getDefaultAdvancedSettings());
        break;
      case "getColumns":
        analyticsConn = await getAnalyticsConnection(this.userObj, this.token);
        let dbMeta = new DbMeta(analyticsConn);
        dbMeta.getColumnsForPlaceHolders(
          request.dbObjectList,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            return callback(null, result);
          }
        );
        break;
      case "migrateOldCdmConfigs":
        this.ffhQeConfig.migrateOldCDMConfigs((err, result) => {
          if (err) {
            return callback(err, null);
          }
          return callback(null, result);
        });
        break;
      case "getDefaultAdvancedSettings":
        this.ffhQeConfig.getDefaultCDMConfigAssignment((err, result) => {
          if (err) {
            return callback(err, null);
          }
          if (result) {
            if (result.config && result.config.advancedSettings) {
              return callback(null, result.config.advancedSettings);
            }
            return callback(
              new Error(MESSAGES.NO_ADV_SETTINGS_IN_DEFAULT_CDW_CONFIG_ERR_MSG),
              null
            );
          }
          return callback(
            new Error(MESSAGES.NO_DEFAULT_CDW_CONFIG_ASSIGNED_ERR_MSG),
            null
          );
        });
        break;
      default:
        return callback(
          new Error("CDW_CONFIG_ERROR_ACTION_NOT_SUPPORTED"),
          null
        );
    }
  }
}
