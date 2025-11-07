import  * as textLib from "../../utils/text";
import {
  Connection as connLib,
  Constants,
  EnvVarUtils,
} from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import { isXS2, cloneJson } from "../../utils/utils";
import { replacePlaceholderWithTables } from "../utils/queryutils";
import { generateDefaultAttributes, getEmptyConfig } from "./DefaultAttributes";
import { Settings } from "../settings/Settings";
let settings;
let placeholder;
let placeholderMap: PholderTableMapType;
let QUERY;

function initializeSettings(settingsObj: Settings) {
  settings = settingsObj.getSettings();
  placeholder = settingsObj.getPlaceholder();
  placeholderMap = settingsObj.getPlaceholderMap();

  QUERY = {
    GENERATE_CONFIG_DEFAULTS_DETAILS: `SELECT DISTINCT inter.${
      placeholderMap["@INTERACTION.INTERACTION_TYPE"]
    } AS "INTERACTION_TYPE",
         interDetails.${placeholderMap["@CODE.ATTRIBUTE"]} AS "ATTRIBUTE",
         'INTERACTION_DETAILS' AS origin,
         dataType.dataType as DATATYPE
         FROM  ${placeholder.interaction} inter
         INNER JOIN  ${placeholder.code} interDetails ON inter.${
      placeholderMap["@INTERACTION.INTERACTION_ID"]
    }
         = interDetails.${placeholderMap["@CODE.INTERACTION_ID"]}
         INNER JOIN (Select DATA_TYPE_NAME as dataType from VIEW_COLUMNS WHERE VIEW_NAME
         = '${
           parseDbObjectName(placeholderMap[placeholder.code]).tableName
         }' AND COLUMN_NAME = '${placeholderMap["@CODE.VALUE"].replace(
      /"/g,
      ""
    )}'
         UNION Select DATA_TYPE_NAME as dataType from TABLE_COLUMNS WHERE TABLE_NAME
         = '${
           parseDbObjectName(placeholderMap[placeholder.code]).tableName
         }' AND COLUMN_NAME
         = '${placeholderMap["@CODE.VALUE"].replace(/"/g, "")}') dataType ON 1=1
         WHERE interDetails.${
           placeholderMap["@CODE.ATTRIBUTE"]
         } IS NOT NULL AND inter.${
      placeholderMap["@INTERACTION.INTERACTION_TYPE"]
    } IS NOT NULL`,

    GENERATE_CONFIG_DEFAULTS_MEASURES: `SELECT DISTINCT inter.${placeholderMap["@INTERACTION.INTERACTION_TYPE"]} AS "INTERACTION_TYPE",
         interMeasures.${placeholderMap["@MEASURE.ATTRIBUTE"]} AS "ATTRIBUTE",
         'INTERACTION_MEASURES' AS origin,
         'DECIMAL' AS DATATYPE
         FROM ${placeholder.interaction} inter
         INNER JOIN ${placeholder.intMeasure} interMeasures ON inter.${placeholderMap["@INTERACTION.INTERACTION_ID"]}
         = interMeasures.${placeholderMap["@MEASURE.INTERACTION_ID"]}
         WHERE inter.${placeholderMap["@INTERACTION.INTERACTION_TYPE"]} IS NOT NULL`,

    GENERATE_CONFIG_BASIC_DATA_OBS: `SELECT DISTINCT ${placeholderMap["@OBS.OBS_TYPE"]} AS BASIC_TYPE,
        'OBS' AS origin, 'NVARCHAR' as DATATYPE FROM ${placeholder.observation}`,

    GENERATE_CONFIG_BASIC_DATA_PATIENT: `SELECT DISTINCT COLUMN_NAME AS BASIC_TYPE, 'PATIENT' AS origin, DATA_TYPE_NAME as DATATYPE FROM VIEW_COLUMNS
        WHERE VIEW_NAME='${
          parseDbObjectName(placeholderMap[placeholder.patient]).tableName
        }'
        UNION SELECT DISTINCT COLUMN_NAME AS BASIC_TYPE, 'PATIENT' AS origin, DATA_TYPE_NAME as DATATYPE FROM VIEW_COLUMNS
        WHERE VIEW_NAME='${
          parseDbObjectName(placeholderMap[placeholder.patient]).tableName
        }'`,
  };
}

function parseDbObjectName(dbObject: string): { tableName: string } {
  const tableName = dbObject.replace(/^"(.*)"$/, `$1`);

  return {
    tableName,
  };
}

function translateDBType(dbType: string): string {
  switch (dbType) {
    case "TINYINT":
    case "SMALLINT":
    case "INTEGER":
    case "BIGINT":
    case "FLOAT":
    case "REAL":
    case "DOUBLE":
    case "DECIMAL":
    case "SMALLDECIMAL":
      return "num";
    case "SECONDDATE":
    case "DATE":
      return "date";
    case "TIMESTAMP":
    case "TIME":
      return "dateTime";
    default:
      return "text";
  }
}

/**
 * Returns the query after replacing the schema with an alternative one, if provided.
 * @param   {String}   query             Query Name
 * @param   {[String]} alternativeSchema Optional, Alternative Schema to replace the default "CDMDEFAULT".
 * @returns {String}   SQL Statement, after optional replacement.
 */
function getQueryString(queryName, alternativeSchema?) {
  let query = QUERY[queryName];
  if (alternativeSchema) {
    query = query.replace("CDMDEFAULT", alternativeSchema);
  } else {
    query = query.replace("CDMDEFAULT", settings.hhpSchemaName);
  }
  return query;
}

/**
 * Validates if a configuration key is in alphanumeric underscore notation and transforms otherwise.
 *
 * @param {string}
 *            configKey - The configuration key to be validated/transformed
 *
 * @returns {string} transformed configuration key
 */
function transformConfigurationKey(configKey) {
  const res = configKey.match(/[a-zA-Z0-9_]+/g);
  if (res) {
    return res.join("_");
  }
  return "";
}

/**
 * Generates and adds to a configuration the recommended attributes for Basic Data
 * (retrieved from DB - Observation and Patient views)
 *
 * @returns Recommended configuration
 */
function addBasicDataRecommendationToConfig(
  configData,
  connection: ConnectionInterface,
  callback
) {
  let conn;
  if (isXS2()) {
    conn = connection;
  } else {
    //conn = new Connection($.hdb.getConnection({ isolationLevel: $.hdb.isolation.SERIALIZABLE }));
  }
  const queryPatient = getQueryString("GENERATE_CONFIG_BASIC_DATA_PATIENT");

  let query =
    getQueryString("GENERATE_CONFIG_BASIC_DATA_OBS") +
    " union all " +
    queryPatient;

  query = replacePlaceholderWithTables(placeholderMap, query);
  conn.executeQuery(query, [], (err, result) => {
    if (err) {
      callback(err, null);
      return;
    }
    const prevAttrId = null;
    let attrID;
    let attribute;
    let attrIDRaw;
    let origin;
    let defaultFilter;
    let expression;

    const rs = result;

    if (Object.keys(rs).length !== 0) {
      for (const key in rs) {
        if (rs[key]) {
          const row = rs[key];

          attrIDRaw = row.BASIC_TYPE;
          origin = row.ORIGIN;

          attrID = transformConfigurationKey(attrIDRaw);

          switch (origin) {
            case "OBS":
              defaultFilter = `@OBS.${placeholderMap["@OBS.OBS_TYPE"]} = '${attrIDRaw}'`;
              expression = `@OBS.${placeholderMap["@OBS.OBS_CHAR_VAL"]}`;
              break;
            case "PATIENT":
              defaultFilter = "";
              expression = `@PATIENT."${attrIDRaw}"`;
              break;
            default:
          }

          if (prevAttrId !== attrIDRaw) {
            attribute = {
              name: [
                {
                  lang: "",
                  value: attrIDRaw,
                },
              ],
              type: translateDBType(row.DATATYPE),
              defaultFilter,
              expression,
              isSuggestion: true,
            };
          }

          if (configData.patient.attributes[attrID]) {
            callback(
              new Error(
                textLib.get(
                  "HPH_CDM_CFG_ERROR_ATTRIBUTEID_NOT_UNIQUE_AFTER_TRANSFORMATION"
                ) +
                  attrID +
                  "(" +
                  attrIDRaw +
                  "," +
                  configData.patient.attributes[attrID].name +
                  ")"
              ),
              null
            );
            return;
          }

          configData.patient.attributes[attrID] = attribute;
        }
      }
    }

    callback(null, configData);
  });
}

/**
 * Generates and adds to a configuration the receomended attributes and filter
 * cards (by the existing records in the DB as interaction details etc.)
 *
 *
 * @returns Recommended configuration
 */
function addRecommendationToConfig(
  configData: { patient: CDMConfigPatientType },
  connection: ConnectionInterface,
  callback
) {
  let conn;
  if (isXS2()) {
    conn = connection;
  } else {
    //conn = new Connection($.hdb.getConnection({ isolationLevel: $.hdb.isolation.SERIALIZABLE }));
  }

  let query = `${getQueryString("GENERATE_CONFIG_DEFAULTS_DETAILS")}  union all
         ${getQueryString("GENERATE_CONFIG_DEFAULTS_MEASURES")}
         order by "INTERACTION_TYPE", "ATTRIBUTE"`;

  query = replacePlaceholderWithTables(placeholderMap, query);

  conn.executeQuery(query, [], (err, result) => {
    if (err) {
      callback(err, null);
      return;
    }
    configData = buildRecommendation(configData, result, placeholderMap);

    callback(null, configData);
  });
}

/**
 * Builds the default attributes with values from DB
 *
 * @export
 * @param {{ patient: CDMConfigPatientType; }} config - config with default patient attributes
 * @param {Map<ConfigDefaultsType>} result - default values (interactions and measures) from db
 * @returns {any} - augmented patient attributes with values from db
 */
export function buildRecommendation(
  config: { patient: CDMConfigPatientType },
  result: ConfigDefaultsType[],
  placeholderMap: PholderTableMapType
): { patient: CDMConfigPatientType } {
  let prevInterId = null;
  let interID;
  let interaction;
  let interIDRaw;
  let attrIDRaw;
  let attrID;
  let origin;
  let defaultFilter;
  let attribute;
  let expression;
  let attributeType;
  const configData: { patient: CDMConfigPatientType } = cloneJson(config);

  if (Object.keys(result).length === 0) {
    return configData;
  }

  for (const key in result) {
    if (result[key]) {
      const row = result[key];
      interIDRaw = row.INTERACTION_TYPE;

      //Ensure that the interactionid is in alphanumeric underscore notation
      interID = transformConfigurationKey(interIDRaw);
      if (!interID) {
        continue;
      }

      if (prevInterId !== interIDRaw) {
        interaction = {
          name: interIDRaw,
          defaultFilter: `@INTERACTION.${placeholderMap["@INTERACTION.INTERACTION_TYPE"]} = '${interIDRaw}'`,
          defaultFilterKey: interIDRaw,
          isDisabled: false,
          attributes: {},
        };
        if (configData.patient.interactions[interID]) {
          // The interID is not unique after transformation
          let count = 0;
          let temporaryName = interID;

          while (configData.patient.interactions[temporaryName]) {
            count = count + 1;
            temporaryName = interID + "_" + count;
          }

          interID = temporaryName;
        }
        configData.patient.interactions[interID] = interaction;
      }

      prevInterId = interIDRaw;

      attrIDRaw = row.ATTRIBUTE;
      //Ensure that the attributeID is in alphanumeric underscore notation
      attrID = transformConfigurationKey(attrIDRaw);
      if (!attrID) {
        continue;
      }

      if (configData.patient.interactions[interID].attributes[attrID]) {
        let count = 0;
        let temporaryName = attrID;

        while (
          configData.patient.interactions[interID].attributes[temporaryName]
        ) {
          count = count + 1;
          temporaryName = attrID + "_" + count;
        }

        attrID = temporaryName;
      }
      origin = row.ORIGIN;
      defaultFilter = null;
      expression = null;
      attributeType = translateDBType(row.DATATYPE);

      switch (origin) {
        case "INTERACTION_DETAILS":
          defaultFilter = `@CODE.${placeholderMap["@CODE.ATTRIBUTE"]}`;
          expression = `@CODE.${placeholderMap["@CODE.VALUE"]}`;
          break;

        case "INTERACTION_MEASURES":
          defaultFilter = `@MEASURE.${placeholderMap["@MEASURE.ATTRIBUTE"]}`;
          expression = `@MEASURE.${placeholderMap["@MEASURE.VALUE"]}`;
          attributeType = "num";
          break;

        default:
      }

      attribute = {
        name: [
          {
            lang: "",
            value: attrIDRaw,
          },
        ],
        type: attributeType,
        eavExpressionKey: attrIDRaw,
        defaultFilter: `${defaultFilter} = '${attrIDRaw}'`,
        expression,
      };

      configData.patient.interactions[interID].attributes[attrID] = attribute;
    }
  }

  return configData;
}

/**
 * Process the config based on the global settings
 *
 * @param {Settings} settingsObj - Settings instance
 * @param {{ patient: CDMConfigPatientType; }} config to post process
 * @returns { patient: CDMConfigPatientType; } - a copy of the postprocessed config
 */
function applySettingsToConfig(
  settingsObj: Settings,
  suggestedConfig: { patient: CDMConfigPatientType }
) {
  const configCopy: { patient: CDMConfigPatientType } =
    cloneJson(suggestedConfig);
  if (!EnvVarUtils.isGenomicsEnabled()) {
    delete configCopy.patient.interactions.ga_sample;
    delete configCopy.patient.interactions.ga_mutation;
  }
  return configCopy;
}

/**
 * Generate a config with default attributes
 *
 * @export
 * @param {ConnectionInterface} connection - connection instance
 * @param {Settings} settingsObj - settings instance
 * @param {CallBackInterface} callback - callback
 */
export function generateConfigWithDefaultAttributes(
  settingsObj: Settings,
  callback: CallBackInterface
) {
  initializeSettings(settingsObj);
  let suggestedConfig: any = generateDefaultAttributes(placeholderMap);
  suggestedConfig = applySettingsToConfig(settingsObj, suggestedConfig);
  suggestedConfig.advancedSettings = settingsObj.getDefaultAdvancedSettings();
  callback(null, suggestedConfig);
}

export function generateEmptyConfig(callback: CallBackInterface) {
  callback(
    null,
    getEmptyConfig(
      EnvVarUtils.getAnalyticsConnectionParameters({ tag: "analytics" })
    )
  );
}

/**
 * Generate a config with default attributes and suggestions
 *
 * @export
 * @param {ConnectionInterface} connection - connection instance
 * @param {Settings} settingsObj - settings instance
 * @param {CallBackInterface} callback - callback
 */
export function suggestConfig(
  connection: ConnectionInterface,
  settingsObj: Settings,
  callback: CallBackInterface
) {
  initializeSettings(settingsObj);
  let suggestedConfig = generateDefaultAttributes(placeholderMap);
  suggestedConfig = applySettingsToConfig(settingsObj, suggestedConfig);
  addRecommendationToConfig(
    suggestedConfig,
    connection,
    (err, suggestedConfig) => {
      if (err) {
        callback(err, null);
        return;
      }
      addBasicDataRecommendationToConfig(suggestedConfig, connection, callback);
    }
  );
}
