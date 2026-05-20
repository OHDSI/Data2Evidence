import { replacePlaceholderWithTables } from "../utils/queryutils";
import { Settings } from "../../qe";

let settings;
let placeholderMap;
let placeholder;
let QUERY;

function getQueryString(queryName, alternativeSchema?) {
  let query = QUERY[queryName];
  if (alternativeSchema) {
    query = query.replace("CDMDEFAULT", alternativeSchema);
  } else {
    query = query.replace("CDMDEFAULT", settings.hhpSchemaName);
  }
  return query;
}

function initializeSettings(settingsObj: any) {
  settings = settingsObj.getSettings();
  placeholderMap = settingsObj.getPlaceholderMap();
  placeholder = settingsObj.getPlaceholder();

  QUERY = {
    GET_TEMPLATE_CONFIG:
      'select "Id", "System", "Data" from "ConfigDbModels_Template"',
  };
}

function getTemplateConfig(conn) {
  let query = getQueryString("GET_TEMPLATE_CONFIG");
  query = replacePlaceholderWithTables(placeholderMap, query);
  return [];
}

export function templateConfig(conn, settingsObj: any) {
  initializeSettings(settingsObj);
  return getTemplateConfig(conn);
}

export function getAttributeTypes() {
  const values = [];
  const settings = new Settings();
  values.push({
    key: "text",
    text_key: "HPH_CDM_CFG_DATA_TYPE_TEXT",
  });
  values.push({
    key: "num",
    text_key: "HPH_CDM_CFG_DATA_TYPE_NUM",
  });

  //If enabled in advanced settings
  if (settings.getSettings().enableFreeText) {
    values.push({
      key: "freetext",
      text_key: "HPH_CDM_CFG_DATA_TYPE_FREETEXT",
    });
  }

  values.push({
    key: "time",
    text_key: "HPH_CDM_CFG_DATA_TYPE_DATE",
  });
  values.push({
    key: "datetime",
    text_key: "HPH_CDM_CFG_DATA_TYPE_DATETIME",
  });
  values.push({
    key: "conceptSet",
    text_key: "HPH_CDM_CFG_DATA_TYPE_CONCEPTSET",
  });
  return values;
}
