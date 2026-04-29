import * as attributeInfosServiceLib from "./attribute_infos_service";
import * as columnSuggestionServiceLib from "./column_suggestion_service";
import * as domainValuesServiceLib from "./domain_values_service";
import * as tableSuggestionServiceLib from "./table_suggestion_service";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import * as settingsLib from "../settings/Settings";
import Settings = settingsLib.Settings;
import { FfhQeConfig } from "./config";

const processResultForUserPrivilege = (
  hasEndUserPrivilege: boolean,
  res: AttributeInfoResponseType
): AttributeInfoResponseType => {
  const returnObj = { ...res };
  if (hasEndUserPrivilege && returnObj && returnObj.data && returnObj.data[0]) {
    returnObj.data[0].permission = true;
  } else if (returnObj && returnObj.data && returnObj.data[0]) {
    delete returnObj.data[0].count;
    delete returnObj.data[0].max;
    delete returnObj.data[0].min;
    returnObj.data[0].permission = false;
  }

  return returnObj;
};

export class CDWServicesFacade {
  private settings: Settings;

  constructor(
    private connection: ConnectionInterface,
    private ffhQeConfig: FfhQeConfig,
    testMode: boolean = false
  ) {
    this.settings = new Settings();
  }

  public getFfhQeConfig() {
    return this.ffhQeConfig;
  }
  public invokeService(
    action: string,
    body: any,
    hasEndUserPrivilege: boolean,
    callback: CallBackInterface
  ) {
    let validationRes: ConfigValidationResultType;
    switch (action) {
      case "attribute_infos_service":
        validationRes = this.ffhQeConfig.validateConfig(body.config, this.connection);
        if (!validationRes.cdmConfigValidationResult.valid) {
          return callback(new Error("HPH_CDM_CFG_VALIDITY_ERROR"), null);
        }
        this.settings.initAdvancedSettings(body.config.advancedSettings);
        attributeInfosServiceLib.processRequest({
          request: body,
          connection: this.connection,
          placeholderSettings: {
            placeholderTableMap: body.config.advancedSettings.tableMapping,
            tableTypePlaceholderMap:
              body.config.advancedSettings.tableTypePlaceholderMap,
          },
          callback: (err, result) => {
            if (err) {
              callback(err, null);
              return;
            }
            callback(
              null,
              processResultForUserPrivilege(hasEndUserPrivilege, result)
            );
          },
        });

        break;
      case "domain_values_service":
        validationRes = this.ffhQeConfig.validateConfig(body.config, this.connection);
        if (!validationRes.cdmConfigValidationResult.valid) {
          const err = new Error("HPH_CDM_CFG_VALIDITY_ERROR");
          callback(err, null);
        } else {
          this.settings.initAdvancedSettings(body.config.advancedSettings);
          domainValuesServiceLib.processRequest({
            request: body,
            connection: this.connection,
            placeholderSettings: {
              placeholderTableMap: body.config.advancedSettings.tableMapping,
              tableTypePlaceholderMap:
                body.config.advancedSettings.tableTypePlaceholderMap,
            },
            callback: (err, result) => {
              if (err) {
                callback(err, null);
                return;
              }
              let res;
              if (hasEndUserPrivilege) {
                res = result;
              } else {
                res = result;
                if (res && res.data) {
                  res.data = [];
                }
              }
              callback(null, res);
            },
          });
        }
        break;
      case "table_suggestion_service":
        tableSuggestionServiceLib.processRequest(
          body,
          this.connection,
          body.mapping,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            callback(null, result);
          }
        );
        break;
      case "column_suggestion_service":
        columnSuggestionServiceLib.processRequest(
          body,
          this.connection,
          body.mapping,
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            callback(null, result);
          }
        );
        break;
      case "attributeType_service":
        try {
          callback(null, this.ffhQeConfig.getAttributeTypes());
        } catch (err) {
          callback(err, null);
        }
        break;
      default:
        const err = new Error("CDW_SERVICES_ERROR_ACTION_NOT_SUPPORTED");
        callback(err, null);
    }
  }
}
