/*
    Central Configuration Service
*/

import * as configToolsUtils from "@alp/alp-base-utils";
import { QueryObject as qo, Connection as connLib } from "@alp/alp-base-utils";
const QueryObject = qo.QueryObject;
type ConnectionInterface = connLib.ConnectionInterface;
type CallBackInterface = connLib.CallBackInterface;
import { Settings } from "../qe/settings/Settings";
import * as utilsLib from "../utils/utils";
import { Buffer } from "node:buffer";

const CONFIG_TYPES = {
  GLOBAL_SETTINGS: "HC/HPH/GLOBAL",
  CDW: "HC/HPH/CDW",
};

export class FfhConfig {
  private conn: ConnectionInterface;

  private getProcedures() {
    return {
      deleteConfig: "ConfigDbProcedures_DeleteConfiguration",
    };
  }
  private PROCEDURES;

  private getQueries() {
    return {
      GET_CONFIG:
        'SELECT "Version", "Status", "Name", "Type", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion", "Creator", "Created", "Modifier", "Modified", "Data" ' +
        'FROM "ConfigDbModels_Config" WHERE "Id" = %s',
      GET_CONFIG_BY_TYPE:
        'SELECT "Id", "Version", "Status", "Name", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion", "Creator", "Created", "Modifier", "Modified", "Data" ' +
        'FROM "ConfigDbModels_Config" WHERE "Type" = %s',
      DELETE_CONFIG: { procedure: this.PROCEDURES.deleteConfig },
      WRITE_CONFIG:
        'INSERT INTO "ConfigDbModels_Config" ' +
        '("Id", "Version", "Status", "Name", "Type", "ParentId", "ParentVersion", "Creator", "Created", "Modifier", "Modified", "Data") ' +
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%t,%s,%t,TO_NCLOB(%s))",
      UPDATE_CONFIG:
        'UPDATE "ConfigDbModels_Config" ' +
        'SET "Name" = %s, "Data" = TO_NCLOB(%s), "Status" = %s, "ParentId" = %s, "ParentVersion" = %s, "Modifier" = %s, "Modified" = %t ' +
        'WHERE "Id" = %s AND "Version" = %s',
      GET_NEW_VERSION:
        'SELECT TO_VARCHAR(COALESCE(max(TO_INTEGER("Version")),0)+1) as "Version" ' +
        'FROM "ConfigDbModels_Config" ' +
        'WHERE "Id" = %s',
      GET_LIST:
        'SELECT "Id", "Version", "Status", "Name", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion", "Creator", "Created", "Modifier", "Modified" ' +
        'FROM "ConfigDbModels_Config" ' +
        'WHERE "Type" = %s ORDER BY "Id", "Version" ASC',
      SET_OTHERS_STATE:
        'UPDATE "ConfigDbModels_Config"  SET "Status" = %s WHERE "Id" = %s AND NOT "Version" = %s AND NOT "Version" = \'0\'',
      GET_DEPENDING_CONFIGS:
        'SELECT "Id", "Version" FROM "ConfigDbModels_Config" WHERE "ParentId" = %s',
      GET_DEPENDING_CONFIGS_VERSION:
        'SELECT "Id", "Version" FROM "ConfigDbModels_Config" WHERE "ParentId" = %s and "ParentVersion" = %s',
      CLEAR_DEFAULT:
        'DELETE FROM "ConfigDbModels_UserDefaultConfig" WHERE "User" = %s AND "ConfigType" = %s',
      SET_DEFAULT:
        'UPSERT "ConfigDbModels_UserDefaultConfig" ' +
        '("User", "ConfigType", "ConfigId", "ConfigVersion") VALUES (%s,%s,%s,%s) WITH PRIMARY KEY',
      GET_DEFAULT:
        'SELECT "ConfigId" as "ConfigId", "ConfigVersion" as "ConfigVersion" ' +
        'FROM "ConfigDbModels_UserDefaultConfig" WHERE "User" = %s AND "ConfigType" = %s',
      DELETE_DEFAULTS_FOR_CONFIG:
        'DELETE FROM "ConfigDbModels_UserDefaultConfig" WHERE "ConfigId" = %s',
      GET_META_LIST:
        'SELECT "Id", "Version", "Name", "Type" FROM "ConfigDbModels_Config"',
    };
  }
  private QUERIES;

  constructor(conn: ConnectionInterface, testMode: boolean) {
    this.conn = conn;
    this.PROCEDURES = this.getProcedures();

    if (testMode) {
      const procedures = this.getProcedures();
      for (const member in this.PROCEDURES) {
        if (this.PROCEDURES.hasOwnProperty(member)) {
          delete this.PROCEDURES[member]; //remove all properties of object
        }
      }
      Object.keys(procedures).forEach((key) => {
        this.PROCEDURES[key] = procedures[key];
      });
    }

    this.QUERIES = this.getQueries(); //this Assignment shoud come after the executing the above testmode condition only
  }

  public getNewVersion(configId, callback: CallBackInterface) {
    if (!configId) {
      callback(null, "1");
    } else {
      const querySql = this.QUERIES.GET_NEW_VERSION;
      const query = QueryObject.format(querySql, configId);
      query.executeQuery(this.conn, (err, result) => {
        if (err) {
          return callback(err, null);
        }

        if (result === null || result.data.length === 0) {
          callback(new Error("HPH_CFG_UNEXPECTED_ERROR"), null);
        } else {
          callback(null, result.data[0].Version);
        }
      });
    }
  }

  private _updateConfig(config, settings, callback: CallBackInterface) {
    let querySql = this.QUERIES.UPDATE_CONFIG;
    const params: any[] = [];
    params.push(settings.configName);
    params.push(
      utilsLib.isXS2()
        ? Buffer.from(JSON.stringify(config), "utf8")
        : JSON.stringify(config)
    );
    params.push(settings.configStatus);

    if (settings.dependentConfig.configId) {
      params.push(settings.dependentConfig.configId);
      params.push(settings.dependentConfig.configVersion || "");
    } else {
      params.push(null);
      params.push(null);
      querySql = querySql.replace(
        '"ParentId" = %s, "ParentVersion" = %s,',
        '"ParentId" = %UNSAFE, "ParentVersion" = %UNSAFE,'
      ); //since null value is being set
    }

    params.push(utilsLib.getUsername());

    const currDate = new Date();
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate
    );
    params.push(settings.configId);
    params.push(settings.configVersion);

    querySql = utilsLib.isXS2()
      ? querySql.replace('"Data" = TO_NCLOB(%s)', '"Data" = %b')
      : querySql;
    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }

  private _createConfig(config, settings, callback: CallBackInterface) {
    let querySql: string = this.QUERIES.WRITE_CONFIG;
    const params: any[] = [];

    params.push(settings.configId);
    params.push(settings.configVersion);
    params.push(settings.configStatus);
    params.push(settings.configName);
    params.push(settings.configType);

    if (settings.dependentConfig.configId) {
      params.push(settings.dependentConfig.configId);
      params.push(settings.dependentConfig.configVersion || "");
    } else {
      params.push(null);
      params.push(null);
      querySql = querySql.replace(
        "VALUES (%s,%s,%s,%s,%s,%s,%s",
        "VALUES (%s,%s,%s,%s,%s,%UNSAFE,%UNSAFE"
      ); //since null value is being set
    }

    params.push(utilsLib.getUsername());
    const currDate = new Date();
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate
    );
    params.push(utilsLib.getUsername());
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate
    );
    params.push(
      utilsLib.isXS2()
        ? Buffer.from(JSON.stringify(config), "utf8")
        : JSON.stringify(config)
    );

    querySql = utilsLib.isXS2()
      ? querySql.replace("TO_NCLOB(%s)", "%b")
      : querySql;

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }

  private assertNotEmpty(value, error) {
    if (!value || value === "") {
      throw new Error(error);
    }
  }

  /*
        oSettings := {
            *config: Object,
            *configType: String,
            configId: String, //generates a new one, if not specified
            configVersion: String,
            configStatus: String,
            configName: String,
            dependentConfig: {
                configId: String,
                configVersion: String
            }
        }
    */
  public saveConfig(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(
      oSettings.configType,
      "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED"
    );
    this.assertNotEmpty(oSettings.config, "HPH_CFG_CONFIG_NOT_SPECIFIED");

    const settings: any = {};
    const postExecute = () => {
      settings.configVersion = oSettings.configVersion || "";
      settings.configStatus = oSettings.configStatus || "";
      settings.configName = oSettings.configName || "";
      settings.configType = oSettings.configType;
      settings.dependentConfig = oSettings.dependentConfig || {};

      const config = oSettings.config;

      this._updateConfig(config, settings, (err, linesEffected) => {
        if (err) {
          return callback(err, null);
        }
        if (!(linesEffected > 0)) {
          this._createConfig(config, settings, (err, linesEffected) => {
            if (err) {
              return callback(err, null);
            }
            const data = {
              meta: settings,
              saved: linesEffected > 0,
            };
            callback(null, data);
          });
        } else {
          const data = {
            meta: settings,
            saved: linesEffected > 0,
          };
          callback(null, data);
        }
      });
    };
    if (oSettings.configId) {
      //  #pure_node
      settings.configId = oSettings.configId;
      postExecute();
    } else {
      settings.configId = configToolsUtils.createGuid();
      postExecute();
    }
  }

  /*
        oSettings := {
            *configId: String,
            configVersion: String,
            configStatus: String
        }
    */
  public getConfig(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(oSettings.configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");

    let query = this.QUERIES.GET_CONFIG;
    const versionFilter = ' AND "Version" = %s';
    const statusFilter = ' AND "Status" = %s';

    const params: any[] = [];
    const param = {
      CONFIG_ID: null,
      CONFIG_VERSION: null,
      CONFIG_STATUS: null,
    };

    const hasVersion = typeof oSettings.configVersion !== "undefined";
    const hasStatus = typeof oSettings.configStatus !== "undefined";

    param.CONFIG_ID = oSettings.configId;
    if (hasVersion) {
      param.CONFIG_VERSION = oSettings.configVersion;
      query += versionFilter;
    }
    if (hasStatus) {
      param.CONFIG_STATUS = oSettings.configStatus;
      query += statusFilter;
    }

    params.push(param.CONFIG_ID);
    if (hasVersion) {
      params.push(param.CONFIG_VERSION);
    }
    if (hasStatus) {
      params.push(param.CONFIG_STATUS);
    }

    params.unshift(query); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    let meta: any = {};
    let config: any = {};
    queryObj.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }

      if (result != null && result.data.length > 1) {
        return callback(
          new Error("HPH_CFG_CONFIG_FOUND_MULTIPLE_MATCHES"),
          null
        );
      } else if (result != null && result.data.length === 1) {
        // CONFIG_VERSION, CONFIG_STATUS, CONFIG_NAME, DEPENDENT_CONFIG_ID, DEPENDENT_CONFIG_VERSION, CREATOR, CREATED, MODIFIER, MODIFIED, DATA
        meta = {
          configId: param.CONFIG_ID,
          configVersion: result.data[0].Version,
          configStatus: result.data[0].Status,
          configName: result.data[0].Name,
          configType: result.data[0].Type,
          dependentConfig: {
            configId: result.data[0].ParentId,
            configVersion: result.data[0].ParentVersion,
          },
          creator: result.data[0].Creator,
          created: result.data[0].Created,
          modifier: result.data[0].Modifier,
          modified: result.data[0].Modified,
        };

        config = JSON.parse(result.data[0].Data);

        // for the old CDW configs to work
        // first check for CDW config,
        // if so, check for availability of advanced settings
        // if advanced settings not available, assign default settings.
        if (meta.configType === CONFIG_TYPES.CDW) {
          if (config && !config.hasOwnProperty("advancedSettings")) {
            const settings = new Settings();
            config.advancedSettings = settings.getDefaultAdvancedSettings();
          }
        }
      }

      callback(null, {
        meta,
        config,
      });
    });
  }

  public getFullConfigsByType(type: string, callback: CallBackInterface) {
    const query = this.QUERIES.GET_CONFIG_BY_TYPE;
    const params: any[] = [];
    params.push(type);
    params.unshift(query); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    let meta = {};
    let config: any = {};
    const configs = [];
    queryObj.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }

      if (result && result.data && result.data.length > 0) {
        result.data.forEach((el) => {
          // CONFIG_VERSION, CONFIG_STATUS, CONFIG_NAME, DEPENDENT_CONFIG_ID, DEPENDENT_CONFIG_VERSION, CREATOR, CREATED, MODIFIER, MODIFIED, DATA
          meta = {
            configId: el.Id,
            configVersion: el.Version,
            configStatus: el.Status,
            configName: el.Name,
            dependentConfig: {
              configId: el.ParentId,
              configVersion: el.ParentVersion,
            },
            creator: el.Creator,
            created: el.Created,
            modifier: el.Modifier,
            modified: el.Modified,
          };
          config = JSON.parse(el.Data);
          configs.push({
            meta,
            config,
          });
        });
      } else {
        callback(new Error("HPH_CFG_NO_CONFIGS_FOUND"), null);
      }

      callback(null, configs);
    });
  }

  /*
        oSettings := {
            *configId: String,
            *configVersion: String,
            *newStatus: String
        }
    */

  public setOthersState(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(oSettings.configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
    this.assertNotEmpty(
      oSettings.configVersion,
      "HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED"
    );
    this.assertNotEmpty(
      oSettings.newStatus,
      "HPH_CFG_CONFIG_STATUS_NOT_SPECIFIED"
    );

    const param = {
      CONFIG_ID: null,
      CONFIG_VERSION: null,
      NEW_STATUS: null,
    };
    param.CONFIG_ID = oSettings.configId;
    param.CONFIG_VERSION = oSettings.configVersion;
    param.NEW_STATUS = oSettings.newStatus;

    const querySql = this.QUERIES.SET_OTHERS_STATE;
    const params: any[] = [];
    params.push(param.NEW_STATUS);
    params.push(param.CONFIG_ID);
    params.push(param.CONFIG_VERSION);

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      const value = linesEffected > 0;
      callback(null, value);
    });
  }

  /*
        oSettings := {
            *configId: String,
            configVersion: String,
            configStatus: String
        }
    */
  public checkDependingConfig(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(oSettings.configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");

    let querySql = this.QUERIES.GET_DEPENDING_CONFIGS;

    const param = {
      CONFIG_ID: null,
      CONFIG_VERSION: null,
    };
    param.CONFIG_ID = oSettings.configId;

    const params: any[] = [];
    params.push(param.CONFIG_ID);

    if (oSettings.configVersion || oSettings.configVersion === "0") {
      querySql = this.QUERIES.GET_DEPENDING_CONFIGS_VERSION;
      param.CONFIG_VERSION = oSettings.configVersion;
      params.push(param.CONFIG_VERSION);
    }

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeQuery(this.conn, (err, result) => {
      callback(null, result);
    });
  }

  public deleteMultipleConfig(
    configurations: any[],
    index: number,
    callback: CallBackInterface
  ) {
    if (configurations.length > index + 1) {
      this.deleteConfig(configurations[index], (err, result) => {
        if (err) {
          return callback(err, null);
        }
        this.deleteMultipleConfig(configurations, index + 1, callback);
      });
    } else {
      this.deleteConfig(configurations[index], callback);
    }
  }

  public deleteConfig(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(oSettings.configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");

    const querySql = this.QUERIES.DELETE_CONFIG.procedure;
    const params: any[] = [];
    const hasVersion = typeof oSettings.configVersion !== "undefined";
    const hasStatus = typeof oSettings.configStatus !== "undefined";

    params.push(oSettings.configId);

    if (hasVersion) {
      params.push(oSettings.configVersion);
    } else {
      params.push(null);
    }

    if (hasStatus) {
      params.push(oSettings.configStatus);
    } else {
      params.push(null);
    }

    this.conn.executeProc(
      '"' + querySql + '"(?,?,?)',
      params,
      (err, resultSet) => {
        if (err) {
          return callback(err, null);
        }
        this.conn.commit();
        callback(null, 1);
      }
    );
  }

  private _deleteDependingConfigs(oSettings, callback: CallBackInterface) {
    let querySql = this.QUERIES.GET_DEPENDING_CONFIGS;
    const versionFilter = ' AND "ParentVersion" = ?';
    const hasVersion = typeof oSettings.configVersion !== "undefined";
    const params: any[] = [];

    params.push(oSettings.configId);

    if (hasVersion) {
      querySql += versionFilter;
      params.push(oSettings.configVersion);
    }

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }
      result.data.forEach((row) => {
        this.deleteConfig(
          {
            configId: row.Id,
            configVersion: row.Version,
          },
          (err, result) => {
            if (err) {
              return callback(err, null);
            }
            callback(null, result);
          }
        );
      });
    });
  }
  /*
        configType: String
    */
  public getAllConfigs(
    configType,
    includeDraft = false,
    callback: CallBackInterface
  ) {
    this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");

    const querySql = this.QUERIES.GET_LIST;
    const query = QueryObject.format(querySql, configType);
    query.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }

      const data = [];
      result.data.forEach((row) => {
        const element = {
          configId: row.Id,
          configVersion: row.Version,
          configStatus: row.Status,
          configName: row.Name,
          dependentConfig: {
            configId: row.ParentId ? row.ParentId : null,
            configVersion: row.ParentVersion ? row.ParentVersion : null,
          },
          creator: row.Creator,
          created:
            row.Created && utilsLib.isXS2()
              ? row.Created + "Z"
              : row.Created && !utilsLib.isXS2()
              ? row.Created
              : "",
          modifier: row.Modifier,
          modified:
            row.Modified && utilsLib.isXS2()
              ? row.Modified + "Z"
              : row.Modified && !utilsLib.isXS2()
              ? row.Modified
              : "",
        };

        if (row.Status !== "D" || includeDraft) {
          data.push(element);
        }
      });

      callback(null, data);
    });
  }

  public getList(callback: CallBackInterface) {
    const querySql = this.QUERIES.GET_META_LIST;
    const query = QueryObject.format(querySql);
    query.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }

      const configs = [];
      result.data.forEach(function (row) {
        configs.push({
          configId: row.Id,
          configVersion: row.Version,
          configName: row.Name,
          configType: row.Type,
        });
      });
      callback(null, configs);
    });
  }

  /****************************************/
  /*    Handling of user default config   */
  /****************************************/

  public clearDefault(
    username: string,
    configType: string,
    callback: CallBackInterface
  ) {
    this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
    this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");

    const querySql = this.QUERIES.CLEAR_DEFAULT;
    const params: any[] = [];

    params.push(username);
    params.push(configType);
    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected === 1);
    });
  }

  public setDefault(
    username,
    configType,
    configId,
    configVersion,
    callback: CallBackInterface
  ) {
    this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
    this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
    this.assertNotEmpty(configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
    this.assertNotEmpty(configVersion, "HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED");

    const querySql = this.QUERIES.SET_DEFAULT;
    const params: any[] = [];

    params.push(username);
    params.push(configType);
    params.push(configId);
    params.push(configVersion);

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }

  public getDefault(
    username: string,
    configType: string,
    callback: CallBackInterface
  ) {
    this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
    this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");

    const querySql = this.QUERIES.GET_DEFAULT;
    const params: any[] = [];

    params.push(username);
    params.push(configType);

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }
      let value = null;

      if (result != null && result.data.length > 0) {
        value = {
          configId: result.data[0].ConfigId,
          configVersion: result.data[0].ConfigVersion,
        };
      } else {
        value = false;
      }
      callback(null, value);
    });
  }

  private _deleteDefaultsForConfig(oSettings, callback: CallBackInterface) {
    let querySql = this.QUERIES.DELETE_DEFAULTS_FOR_CONFIG;
    const versionFilter = ' AND "ConfigVersion" = %s';
    const hasVersion = typeof oSettings.configVersion !== "undefined";

    const params: any[] = [];

    if (hasVersion) {
      querySql += versionFilter;
    }

    params.push(oSettings.configId);
    if (hasVersion) {
      params.push(oSettings.configVersion);
    }

    params.unshift(querySql); //insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); //Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }
}
