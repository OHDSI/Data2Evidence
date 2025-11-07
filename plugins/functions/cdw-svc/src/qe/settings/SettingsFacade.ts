import { DEFAULT_USER } from "./OldSettings";
import { Settings } from "./Settings";
import { DbMeta } from "./DbMeta";
import { FfhQeConfig, CONFIG_TYPES, MESSAGES } from "../config/config";
import {
  Connection as connLib,
  EnvVarUtils,
  Constants,
  User,
} from "@alp/alp-base-utils";
import CallBackInterface = connLib.CallBackInterface;
import { getAnalyticsConnection } from "../../utils/utils";
export class SettingsFacade {
  private settings: Settings;
  private config: FfhQeConfig;
  private userObj: User;

  constructor(private user: User) {
    this.settings = new Settings();
    this.userObj = this.user;
  }
  public setFfhQeConfig(config: FfhQeConfig) {
    this.config = config;
  }
  public getSettings() {
    return this.settings;
  }
  public async invokeAdminServices(request: any, callback: CallBackInterface) {
    switch (request.action) {
      // TODO: Should load advanced settings from CDM config by passing the confiig id & version
      case "loadGlobalSettings":
        this.getDefaultConfigAssignment((err, appSettings) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, appSettings);
          }
        });
        break;
      case "getDefaultSettings":
        const result = this.settings.getDefaultAdvancedSettings();
        callback(null, result);
        break;
      case "getColumns":
        let analyticsConnection = await getAnalyticsConnection(this.userObj, request.headers.authorization)
        let dbMeta = new DbMeta(analyticsConnection);
        dbMeta.getColumns(request.dbObject, (err, result) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, result);
          }
        });
        break;
      default:
        const err = new Error("HPH_CFG_ERROR_ACTION_NOT_SUPPORTED");
        callback(err, null);
    }
  }

  /**
   * This mainly returns the developer settings stored in the env variables.
   * For now the response comes in 3 formats.
   * 2 - Existing usecase specific formats: Date Time Format & Genomics Format
   * 1 - Super set of all developer settings to cater the unknown usecases
   * @param request request body from UI
   * @param user requesting user
   * @param callback callback method
   * @returns the required developer settings
   */
  public invokeEndUserServices(
    request: any,
    userObj: User,
    callback: CallBackInterface,
    userOrgs?
  ) {
    try {
      let userSettings: any = {};
      switch (request.action) {
        case "loadDateTimeFormat":
          const pluckFormatSettings = (appSettings, cb) => {
            userSettings.dateFormat = appSettings.dateFormat;
            userSettings.timeFormat = appSettings.timeFormat;
            cb(null, userSettings);
          };
          if (userObj.getUser() === DEFAULT_USER) {
            this.getDefaultConfigAssignment((err, appSettings) => {
              if (err) {
                return callback(err, null);
              }
              pluckFormatSettings(appSettings, callback);
            });
          } else {
            this.config.getUserConfig(
              request.configType,
              userOrgs,
              (err, result) => {
                if (err) {
                  if (err.message === MESSAGES.NO_ASSIGNMENT_FOUND_ERR_MSG) {
                    this.getDefaultConfigAssignment((err, appSettings) => {
                      if (err) {
                        return callback(err, null);
                      }
                      pluckFormatSettings(appSettings, callback);
                    });
                  } else {
                    callback(err, null);
                  }
                } else {
                  const appSettings: any =
                    result.config &&
                    result.config.patient &&
                    result.config.patient.advancedSettings &&
                    result.config.patient.advancedSettings.settings
                      ? result.config.patient.advancedSettings.settings
                      : new Settings().getSettings();

                  pluckFormatSettings(appSettings, callback);
                }
              }
            );
          }
          break;
        case "loadGenomicsSettings":
          userSettings = {
            filterSummaryVisible: false,
            geneSummaryXAxis: false,
            geneAlterationXAxis: false,
            geneAlterationCategory: false,
          };

          userSettings.filterSummaryVisible =
            EnvVarUtils.isFilterSummaryVisibled();
          userSettings.geneSummaryXAxis = EnvVarUtils.isGeneSummaryXAxis();
          userSettings.geneAlterationXAxis =
            EnvVarUtils.isGeneAlterationXAxis();
          userSettings.geneAlterationCategory =
            EnvVarUtils.isGeneAlterationCategory();

          callback(null, userSettings);
          break;
        case "getAllSettings":
          callback(null, Constants.getInstance().getAllEnvVars());
          break;
        case "getOldDevSettings":
          this.config.getConfigsByType(
            CONFIG_TYPES.GLOBAL_SETTINGS,
            (err, results) => {
              const settings = new Settings();
              if (err) {
                if (err.message !== "HPH_CFG_NO_CONFIGS_FOUND") {
                  callback(err, null);
                } else {
                  callback(null, settings.getSettings());
                }
              } else {
                if (results && results.length > 0) {
                  if (results.length > 1) {
                    callback(
                      new Error(MESSAGES.MANY_GLOBAL_SETTINGS_FOUND_ERR_MSG),
                      null
                    );
                  } else {
                    if (results[0].config.settings) {
                      callback(null, results[0].config.settings);
                    } else {
                      callback(null, settings.getSettings());
                    }
                  }
                } else {
                  callback(null, settings.getSettings());
                }
              }
            }
          );
          break;
        default:
          const err = new Error("HPH_CFG_ERROR_ACTION_NOT_SUPPORTED");
          callback(err, null);
      }
    } catch (err) {
      callback(err, null);
    }
  }

  private getDefaultConfigAssignment = (cb) =>
    this.config.getDefaultCDMConfigAssignment((err, data) => {
      if (err) {
        cb(err, null);
      } else {
        if (data) {
          if (data.config) {
            const appSettings: any =
              data.config.advancedSettings &&
              data.config.advancedSettings.settings
                ? data.config.advancedSettings.settings
                : new Settings().getSettings();
            // get the dev settings stored in DB and override with it
            const devSettings = Constants.getInstance().getAllEnvVars();
            if (!devSettings) {
              const err = new Error("HPH_CFG_ERROR_DEV_SETTINGS_NOT_SPECIFIED");
              return cb(err, null);
            } else {
              Object.keys(devSettings).forEach((k) => {
                appSettings[k] = devSettings[k];
              });
            }
            cb(null, appSettings);
          } else {
            cb(
              new Error(MESSAGES.NO_ADV_SETTINGS_IN_DEFAULT_CDW_CONFIG_ERR_MSG),
              null
            );
          }
        } else {
          cb(new Error(MESSAGES.NO_DEFAULT_CDW_CONFIG_ASSIGNED_ERR_MSG), null);
        }
      }
    });
}
