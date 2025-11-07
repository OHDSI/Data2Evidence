import {
  Connection as connLib,
  QueryObject as qo,
  User,
  utils as utilsLib,
  Logger as logLib,
} from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
const QueryObject = qo.QueryObject;
import * as qeFormatter from "./qe-formatter";
import CallBackInterface = connLib.CallBackInterface;
import {
  ConfigFormatterSettingsType,
  HPHConfigMetaType,
  AssignedConfigType,
} from "../types";
import { Buffer } from 'node:buffer';

const log = logLib.CreateLogger("config-utils");

export const CONFIG_FORMATTER_SETTINGS: ConfigFormatterSettingsType = {
  UNMODIFIED: {
    restrictToLanguage: false,
    applyDefaultAttributes: false,
    includeDisabledElements: true,
    concatOTSAttributes: false,
  },
  REDUCED: {
    restrictToLanguage: true,
    applyDefaultAttributes: true,
    includeDisabledElements: false,
    concatOTSAttributes: true,
  },
};

export class FFHConfig {
  constructor(private conn: ConnectionInterface, private user: User) {}

  public async getCDWConfig({
    configId,
    configVersion,
    lang,
    callback,
  }: {
    configId: string;
    configVersion: string;
    lang: string;
    callback: connLib.CallBackInterface;
  }) {
    try {
      const configDetails = {
        configId,
        configVersion: configVersion || undefined,
        configStatus: configVersion ? undefined : "A",
      };
      const result = await this.getConfig(configDetails);
      if (Object.keys(result.config).length === 0) {
        throw new Error(
          `CDW Config not found! ${JSON.stringify(configDetails)}`,
        );
      }

      const cdwConfig = qeFormatter.format({
        config: result.config,
        options: CONFIG_FORMATTER_SETTINGS.REDUCED,
        lang,
      });
      callback(null, cdwConfig);
    } catch (err) {
      callback(err, null);
    }
  }

  public getAllConfigs(configType, callback: CallBackInterface) {
    this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
    const querySql = this.getQueries().GET_LIST;
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

        data.push(element);
      });

      callback(null, data);
    });
  }

  public async getAssignedConfigs(configType: string, userObj: User, callback, options?: { studiesToInclude?: string[] }) {
    // a list of study Ids
    const user = userObj.userObject;
    const studiesToInclude = !options?.studiesToInclude
      ? [] : typeof options.studiesToInclude === 'string'
      ? [options.studiesToInclude] : options.studiesToInclude
    const orgsDummyQuery = studiesToInclude
      .map((org) => `UNION
      SELECT 'O' as ENTITY_TYPE, '${org.toUpperCase()}' as ENTITY_VALUE FROM dummy`);

    const query = QueryObject.format(
      this.getQueries().GET_ASSIGNED_CONFIGURATIONS,
      user.userId,
      orgsDummyQuery.join(" "),
      configType,
    );

    log.debug(query.queryString);
    log.debug(query.parameterPlaceholders);
    query.executeQuery(this.conn, (err, rs) => {
        if (err) {
          return callback(err, null);
        }

        const result = [];
        const resultID = [];

        rs.data.forEach((value) => {
          if (resultID.indexOf(value.CONFIG_ID) < 0) {
            resultID.push(value.CONFIG_ID);
            result.push({
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
              config: value.DATA ? JSON.parse(value.DATA.toString()) : null,
              assignmentEntityType: value.ASSIGNMENT_ENTITY_TYPE,
              assignmentEntityValue: value.ASSIGNMENT_ENTITY_VALUE,
            });
          }
        });
        callback(null, result);
      },
    );
  }

  public getConfig(oSettings: {
    configId?: string;
    configVersion?: string;
    configStatus?: string;
  }) {
    return new Promise<HPHConfigMetaType>((resolve, reject) => {
      try {
        this.assertNotEmpty(
          oSettings.configId,
          "HPH_CFG_CONFIG_ID_NOT_SPECIFIED",
        );

        let query = this.getQueries().GET_CONFIG;
        const versionFilter = ' AND "Version" = %s';
        const statusFilter = ' AND "Status" = %s';

        const params: any[] = [];
        const param = { CONFIG_ID: "", CONFIG_VERSION: "", CONFIG_STATUS: "" };
        // let statement;
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

        params.unshift(query); // insert at the beginning
        const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

        let meta: any = {};
        let config: any = {};
        queryObj.executeQuery(this.conn, (err, result) => {
          if (err) {
            return reject(err);
          }

          if (result != null && result.data.length > 1) {
            reject(new Error("HPH_CFG_CONFIG_FOUND_MULTIPLE_MATCHES"));
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
            /*if (meta.configType === CONFIG_TYPES.CDW) {
                            if (config
                                && !config.hasOwnProperty("advancedSettings")) {
                                const settings = new Settings();
                                config.advancedSettings = settings.getDefaultAdvancedSettings();
                            }
                        }*/
          }
          resolve({ meta, config });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getAuditThreshold(cb) {
    try {
      let auditLogThreshold = 0;
      const auditLogConfigDetails = {
        configId: "audit.configId",
        configVersion: "1",
      };
      const auditLogThresholdConfigDetails = {
        configId: "CHPAuditLogThreshold",
        configVersion: "2",
      };
      const auditLogConfig = await this.getConfig(auditLogConfigDetails);
      if (auditLogConfig
        && auditLogConfig.config
        && auditLogConfig.config === true) {
          const auditLogThresholdConfig = await this.getConfig(auditLogThresholdConfigDetails);
          if (auditLogThresholdConfig
            && auditLogThresholdConfig.config
            && !isNaN(auditLogThresholdConfig.config)) {
              auditLogThreshold = auditLogThresholdConfig.config;
          } else {
            log.warn("AUDITLOG THRESHOLD IS NOT CONFIGURED IN DATABASE!");
          }
      }
      cb(null, auditLogThreshold);
    } catch (err) {
      cb(err, null);
    }
  }

  public checkDependingConfig(oSettings, callback: CallBackInterface) {
    this.assertNotEmpty(oSettings.configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");

    let querySql = this.getQueries().GET_DEPENDING_CONFIGS;

    const param = {
      CONFIG_ID: null,
      CONFIG_VERSION: null,
    };
    param.CONFIG_ID = oSettings.configId;

    const params: any[] = [];
    params.push(param.CONFIG_ID);

    if (oSettings.configVersion || oSettings.configVersion === "0") {
      querySql = this.getQueries().GET_DEPENDING_CONFIGS_VERSION;
      param.CONFIG_VERSION = oSettings.configVersion;
      params.push(param.CONFIG_VERSION);
    }

    params.unshift(querySql); // insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

    queryObj.executeQuery(this.conn, (err, result) => {
      callback(null, result);
    });
  }

  public deleteMultipleConfig(
    configurations: any[],
    index: number,
    callback: CallBackInterface,
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
    try {
      this.assertNotEmpty(
        oSettings.configId,
        "HPH_CFG_CONFIG_ID_NOT_SPECIFIED",
      );

      const querySql = this.getQueries().DELETE_CONFIG.procedure;
      const params: any = {};
      const hasVersion = typeof oSettings.configVersion !== "undefined";
      const hasStatus = typeof oSettings.configStatus !== "undefined";

      params.CONFIG_ID = oSettings.configId;

      if (hasVersion) {
        params.CONFIG_VERSION = oSettings.configVersion;
      } else {
        params.CONFIG_VERSION = null;
      }

      if (hasStatus) {
        params.CONFIG_STATUS = oSettings.configStatus;
      } else {
        params.CONFIG_STATUS = null;
      }

      this.conn.executeProc(querySql,
        [params.CONFIG_ID, params.CONFIG_VERSION, params.CONFIG_STATUS],
        (err, resultSet) => {
          if (err) {
            return callback(err, null);
          }
          this.conn.commit();
          callback(null, 1);
        },
      );
    } catch (err) {
      callback(err, null);
    }
  }

  public saveConfig(oSettings, callback: CallBackInterface) {
    try {
      this.assertNotEmpty(
        oSettings.configType,
        "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED",
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
        settings.configId = utilsLib.createGuid();
        postExecute();
      }
    } catch (err) {
      callback(err, null);
    }
  }

  public clearDefault(
    username: string,
    configType: string,
    callback: CallBackInterface,
  ) {
    try {
      this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
      this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");

      const querySql = this.getQueries().CLEAR_DEFAULT;
      const params: any[] = [];

      params.push(username);
      params.push(configType);
      params.unshift(querySql); // insert at the beginning
      const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

      queryObj.executeUpdate(this.conn, (err, linesEffected) => {
        if (err) {
          return callback(err, null);
        }
        this.conn.commit();
        callback(null, linesEffected === 1);
      });
    } catch (err) {
      callback(err, null);
    }
  }

  /**
   * Get the default assigned configs for the given types.
   * Note: This could return default assignments with the same underlying config.
   * @param configType Config type
   * @param callback
   */
  public getDefaultConfigAssignment(configType, callback) {
    const user = "DEFAULT_CONFIG_ASSIGNMENT";
    const GET_DEFAULT_CONFIG_ASSIGNMENT = `SELECT
                assignment."Id" as "ASSIGNMENT_ID",
                assignment."Name" as "ASSIGNMENT_NAME",
                config."Id" as "CONFIG_ID",
                config."Version" as "CONFIG_VERSION",
                config."Status" as "CONFIG_STATUS",
                config."Name" as "CONFIG_NAME",
                config."ParentId" as "DEPENDENT_CONFIG_ID",
                config."ParentVersion" as "DEPENDENT_CONFIG_VERSION",
                config."Data" as "DATA"
            FROM "ConfigDbModels_Assignment" as assignment
                JOIN "ConfigDbModels_Config" as config
                    ON assignment."ConfigId" = config."Id" AND assignment."ConfigVersion" = config."Version"
            WHERE config."Type" = ?
                AND config."Id" is not null
                AND assignment."EntityType" = 'U'
                AND assignment."EntityValue" = ?`;
    const params = [
      { value: configType, type: "string" },
      { value: user, type: "string" },
    ];
    this.conn.executeQuery(
      GET_DEFAULT_CONFIG_ASSIGNMENT,
      params,
      (err, result) => {
        if (err) {
          callback(err, null);
        }
        const defaultConfigAssignments: AssignedConfigType[] = [];
        if (result && result.length > 0) {
          for (let i = 0; i < result.length; i++) {
            try {
              const value = result[i];
              const config = value.DATA;
              let defaultConfigAssignment: AssignedConfigType;
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
              defaultConfigAssignments.push(defaultConfigAssignment);
            } catch (err) {
              log.error(
                `Error getting assigned configs: configType: ${configType}, user: ${user}`,
              );
              callback(err, null);
            }
          }
        }
        callback(null, defaultConfigAssignments);
      },
    );
  }

  public setDefault(
    username,
    configType,
    configId,
    configVersion,
    callback: CallBackInterface,
  ) {
    try {
      this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
      this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
      this.assertNotEmpty(configId, "HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
      this.assertNotEmpty(
        configVersion,
        "HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED",
      );

      const querySql = this.getQueries().SET_DEFAULT;
      const params = [querySql, username, configType, configId, configVersion];

      const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

      queryObj.executeUpdate(this.conn, (err, linesEffected) => {
        if (err) {
          return callback(err, null);
        }
        this.conn.commit();
        callback(null, linesEffected);
      });
    } catch (err) {
      callback(err, null);
    }
  }

  public getDefault(
    username: string,
    configType: string,
    callback: CallBackInterface,
  ) {
    try {
      this.assertNotEmpty(username, "HPH_CFG_USERNAME_NOT_SPECIFIED");
      this.assertNotEmpty(configType, "HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");

      const querySql = this.getQueries().GET_DEFAULT;
      const params: any[] = [];

      params.push(username);
      params.push(configType);

      params.unshift(querySql); // insert at the beginning
      const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

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
    } catch (err) {
      callback(err, null);
    }
  }

  public getFullConfigsByType(type: string, callback: CallBackInterface) {
    const query = this.getQueries().GET_CONFIG_BY_TYPE;
    const params: any[] = [];
    params.push(type);
    params.unshift(query); // insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments
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

  public setOthersState(oSettings, callback: CallBackInterface) {
    try {
      this.assertNotEmpty(
        oSettings.configId,
        "HPH_CFG_CONFIG_ID_NOT_SPECIFIED",
      );
      this.assertNotEmpty(
        oSettings.configVersion,
        "HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED",
      );
      this.assertNotEmpty(
        oSettings.newStatus,
        "HPH_CFG_CONFIG_STATUS_NOT_SPECIFIED",
      );

      const param = { CONFIG_ID: null, CONFIG_VERSION: null, NEW_STATUS: null };
      param.CONFIG_ID = oSettings.configId;
      param.CONFIG_VERSION = oSettings.configVersion;
      param.NEW_STATUS = oSettings.newStatus;

      const querySql = this.getQueries().SET_OTHERS_STATE;
      const params: any[] = [];
      params.push(param.NEW_STATUS);
      params.push(param.CONFIG_ID);
      params.push(param.CONFIG_VERSION);

      params.unshift(querySql); // insert at the beginning
      const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

      queryObj.executeUpdate(this.conn, (err, linesEffected) => {
        if (err) {
          return callback(err, null);
        }
        this.conn.commit();
        const value = linesEffected > 0;
        callback(null, value);
      });
    } catch (err) {
      callback(err, null);
    }
  }

  public getList(callback: CallBackInterface) {
    const querySql = this.getQueries().GET_META_LIST;
    const query = QueryObject.format(querySql);
    query.executeQuery(this.conn, (err, result) => {
      if (err) {
        return callback(err, null);
      }

      const configs = [];
      result.data.forEach((row) => {
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

  public getNewVersion(configId, callback: CallBackInterface) {
    if (!configId) {
      callback(null, "1");
    } else {
      const querySql = this.getQueries().GET_NEW_VERSION;
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

  private getProcedures() {
    const procedureName =
      "ConfigDbProcedures_DeleteConfiguration";

    return { deleteConfig: procedureName };
  }

  private getQueries() {
    const procs = this.getProcedures();

    return {
      GET_CONFIG:
        `SELECT "Version", "Status", "Name", "Type", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion",
             "Creator", "Created", "Modifier", "Modified", "Data" FROM "ConfigDbModels_Config" WHERE "Id" = %s`,
      GET_CONFIG_BY_TYPE: `SELECT "Id", "Version", "Status", "Name", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion",
        "Creator", "Created", "Modifier", "Modified", "Data" FROM "ConfigDbModels_Config" WHERE "Type" = %s`,
      DELETE_CONFIG: { procedure: procs.deleteConfig },
      WRITE_CONFIG:
        `INSERT INTO "ConfigDbModels_Config"
            ("Id", "Version", "Status", "Name", "Type", "ParentId", "ParentVersion",
            "Creator", "Created", "Modifier", "Modified","Data")
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%t,%s,%t,TO_NCLOB(%s))`,
      UPDATE_CONFIG: `UPDATE "ConfigDbModels_Config"
                SET "Name" = %s, "Data" = TO_NCLOB(%s), "Status" = %s,
                "ParentId" = %s, "ParentVersion" = %s, "Modifier" = %s, "Modified" = %t
                WHERE "Id" = %s AND "Version" = %s`,
      GET_NEW_VERSION:
        `SELECT TO_VARCHAR(COALESCE(max(TO_INTEGER("Version")),0)+1) as "Version"
        FROM "ConfigDbModels_Config" WHERE "Id" = %s`,
      GET_LIST:
        `SELECT "Id", "Version", "Status", "Name", "ParentId" as "ParentId", "ParentVersion" as "ParentVersion",
             "Creator", "Created", "Modifier", "Modified" FROM "ConfigDbModels_Config"
              WHERE "Type" = %s ORDER BY "Id", "Version" ASC`,
      SET_OTHERS_STATE: `UPDATE "ConfigDbModels_Config"  SET "Status" = %s WHERE "Id" = %s AND NOT "Version" = %s
             AND NOT "Version" = '0'`,
      GET_DEPENDING_CONFIGS:
        `SELECT "Id", "Version" FROM "ConfigDbModels_Config" WHERE "ParentId" = %s`,
      GET_DEPENDING_CONFIGS_VERSION: `SELECT "Id", "Version" FROM "ConfigDbModels_Config" WHERE "ParentId" = %s
            and "ParentVersion" = %s`,
      CLEAR_DEFAULT:
        `DELETE FROM "ConfigDbModels_UserDefaultConfig" WHERE "User" = %s AND "ConfigType" = %s`,
      SET_DEFAULT:
        `UPSERT "ConfigDbModels_UserDefaultConfig" ("User", "ConfigType", "ConfigId", "ConfigVersion") VALUES (%s,%s,%s,%s) WITH PRIMARY KEY`,
      GET_DEFAULT:
        `SELECT "ConfigId" as "ConfigId", "ConfigVersion" as "ConfigVersion"
        FROM "ConfigDbModels_UserDefaultConfig" WHERE "User" = %s AND "ConfigType" = %s`,
      DELETE_DEFAULTS_FOR_CONFIG:
        'DELETE FROM "ConfigDbModels_UserDefaultConfig" WHERE "ConfigId" = %s',
      GET_META_LIST:
        `SELECT "Id", "Version", "Name", "Type" FROM "ConfigDbModels_Config"`,
      GET_ASSIGNED_CONFIGURATIONS: `
                                SELECT
                                  assignment."Id" as "ASSIGNMENT_ID",
                                  assignment."Name" as "ASSIGNMENT_NAME",
                                  config."Id" as "CONFIG_ID",
                                  config."Version" as "CONFIG_VERSION",
                                  config."Status" as "CONFIG_STATUS",
                                  config."Name" as "CONFIG_NAME",
                                  config."ParentId" as "DEPENDENT_CONFIG_ID",
                                  config."ParentVersion" as "DEPENDENT_CONFIG_VERSION",
                                  config."Data" as "DATA",
                                  UPPER(assignment."EntityType") as "ASSIGNMENT_ENTITY_TYPE",
                                  assignment."EntityValue" as "ASSIGNMENT_ENTITY_VALUE"
                            FROM
                                (
                                  SELECT 'U' as ENTITY_TYPE, %s as ENTITY_VALUE FROM dummy
                                  %UNSAFE
                                )
                                as ENT
                                JOIN
                                  "ConfigDbModels_Assignment" as assignment
                                  ON assignment."EntityType" = ENT.ENTITY_TYPE
                                  AND UPPER(assignment."EntityValue") = UPPER(ENT.ENTITY_VALUE)
                                JOIN
                                  "ConfigDbModels_Config" as config
                                  ON assignment."ConfigId" = config."Id"
                                  AND assignment."ConfigVersion" = config."Version"
                            WHERE
                                config."Type" = %s AND config."Id" is not null
                            `,
    };
  }

  private assertNotEmpty(value, error) {
    if (!value || value === "") {
      throw new Error(error);
    }
  }

  private _updateConfig(config, settings, callback: CallBackInterface) {
    let querySql = this.getQueries().UPDATE_CONFIG;
    const params: any[] = [];
    params.push(settings.configName);
    params.push(
      utilsLib.isXS2()
        ? Buffer.from(JSON.stringify(config), "utf8")
        : JSON.stringify(config),
    );
    params.push(settings.configStatus);

    if (settings.dependentConfig.configId) {
      params.push(settings.dependentConfig.configId);
      params.push((typeof settings.dependentConfig.configVersion === "undefined" ||
                      settings.dependentConfig.configVersion === null) ? "" : String(settings.dependentConfig.configVersion));
    } else {
      params.push(null);
      params.push(null);
      // since null value is being set
      querySql = querySql.replace(
        '"ParentId" = %s, "ParentVersion" = %s,',
        '"ParentId" = %UNSAFE, "ParentVersion" = %UNSAFE,',
      );
    }

    params.push(this.user.getUser());

    const currDate = new Date();
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate,
    );
    params.push(settings.configId);
    params.push(settings.configVersion);

    querySql = utilsLib.isXS2()
      ? querySql.replace('"Data" = TO_NCLOB(%s)', '"Data" = %b')
      : querySql;
    params.unshift(querySql); // insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }

  private _createConfig(config, settings, callback: CallBackInterface) {
    let querySql: string = this.getQueries().WRITE_CONFIG;
    const params: any[] = [];

    params.push(settings.configId);
    params.push(settings.configVersion);
    params.push(settings.configStatus);
    params.push(settings.configName);
    params.push(settings.configType);

    if (settings.dependentConfig.configId) {
      params.push(settings.dependentConfig.configId);
      params.push((typeof settings.dependentConfig.configVersion === "undefined" ||
                      settings.dependentConfig.configVersion === null) ? "" : String(settings.dependentConfig.configVersion));
    } else {
      params.push(null);
      params.push(null);
      querySql = querySql.replace(
        "VALUES (%s,%s,%s,%s,%s,%s,%s",
        "VALUES (%s,%s,%s,%s,%s,%UNSAFE,%UNSAFE",
      ); // since null value is being set
    }

    params.push(this.user.getUser());
    const currDate = new Date();
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate,
    );
    params.push(this.user.getUser());
    params.push(
      utilsLib.isXS2()
        ? currDate.toISOString().substring(0, currDate.toISOString().length - 1)
        : currDate,
    );
    params.push(
      utilsLib.isXS2()
        ? Buffer.from(JSON.stringify(config), "utf8")
        : JSON.stringify(config),
    );

    querySql = utilsLib.isXS2()
      ? querySql.replace("TO_NCLOB(%s)", "%b")
      : querySql;

    params.unshift(querySql); // insert at the beginning
    const queryObj = QueryObject.format.apply(this, params); // Pass array as set of arguments

    queryObj.executeUpdate(this.conn, (err, linesEffected) => {
      if (err) {
        return callback(err, null);
      }
      this.conn.commit();
      callback(null, linesEffected);
    });
  }
}
