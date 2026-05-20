import * as utilsLib from "@alp/alp-base-utils";
import { isXS2 } from "../../utils/utils";
import { defaultTableTypePlaceholderMap } from "../settings/Defaults";

export let STATUS = {
  ACTIVE: "A",
  INACTIVE: "I",
  DRAFT: "D",
};

export function format(config, options) {
  const configWalkFunction = utilsLib.getJsonWalkFunction(config);

  // set default values
  options = options || {};
  options.restrictToLanguage = options.hasOwnProperty("restrictToLanguage")
    ? options.restrictToLanguage
    : true;
  options.applyDefaultAttributes = options.hasOwnProperty(
    "applyDefaultAttributes"
  )
    ? options.applyDefaultAttributes
    : true;
  options.includeDisabledElements = options.hasOwnProperty(
    "includeDisabledElements"
  )
    ? options.includeDisabledElements
    : false;
  options.concatOTSAttributes = options.hasOwnProperty("concatOTSAttributes")
    ? options.concatOTSAttributes
    : true;
  options.applyDefaultTableTypePlaceholderMap = options.hasOwnProperty(
    "applyDefaultTableTypePlaceholderMap"
  )
    ? options.applyDefaultTableTypePlaceholderMap
    : true;

  // call formatting functions
  if (options.restrictToLanguage) {
    _restrictToLanguage(config, configWalkFunction);
  }
  if (options.applyDefaultAttributes) {
    _applyDefaultAttributes(config, configWalkFunction);
  }
  if (!options.includeDisabledElements) {
    _excludeDisabledElements(config, configWalkFunction);
  }
  if (options.concatOTSAttributes) {
    _concatOTSAttributes(config, configWalkFunction);
  }
  if (options.applyDefaultTableTypePlaceholderMap) {
    _applyDefaultTableTypePlaceholderMap(config);
  }

  return config;
}

export function formatOverview(configList) {
  const configs = {};

  configList.forEach((configItem) => {
    if (!configs.hasOwnProperty(configItem.configId)) {
      configs[configItem.configId] = {
        name: configItem.configName,
        disabledLangName: configItem.disabledLangName,
        configId: configItem.configId,
        creator: configItem.modifier,
        modified: configItem.modified,
        active: configItem.configStatus === STATUS.ACTIVE,
        activeVersion:
          configItem.configStatus === STATUS.ACTIVE
            ? configItem.configVersion
            : null,
        numVersions: 1,
        versions: [
          {
            version: configItem.configVersion,
            active: configItem.configStatus,
            versionCreated: configItem.created,
            numElements: getElementCount(configItem),
          },
        ],
      };
    } else {
      if (configItem.configStatus === STATUS.ACTIVE) {
        configs[configItem.configId].active = true;
        configs[configItem.configId].activeVersion = configItem.configVersion;
      }
      configs[configItem.configId].numVersions++;
      configs[configItem.configId].versions.push({
        version: configItem.configVersion,
        active: configItem.configStatus,
        versionCreated: configItem.created,
        numElements: getElementCount(configItem),
      });
      if (configItem.modified > configs[configItem.configId].modified) {
        configs[configItem.configId].modified = configItem.modified;
      }
    }
  });

  return Object.keys(configs).map((e) => {
    configs[e].versions.sort((x, y) => {
      return x.versionCreated < y.versionCreated;
    });
    return configs[e];
  });
}

export function loadFromFileResult(config) {
  let configResult = "";
  if (config.saved) {
    configResult += "Config successfully activated. \n\n";
    configResult += "ConfigDetails:\n";
    configResult += "\tConfig Id: " + config.meta.configId + "\n";
    configResult += "\tConfig Version: " + config.meta.configVersion + "\n";
    configResult += "\tConfig Status: " + config.meta.configStatus + "\n";
  } else {
    configResult += "Failed to save the configuration. \n\n";
    config.errors.forEach((error) => {
      configResult +=
        "Error while validating path: " +
        (error.path ? error.path : "configuration") +
        "\n";
      configResult +=
        "\t" +
        utilsLib.formatErrorMessage(error.messageDefault, error.values) +
        "\n";
    });
  }

  return configResult;
}

// For testing only - consider instead using e.g. rewire once in node.js

export function _getRequestedLanguage() {
  let requestedLanguage;
  if (!isXS2()) {
    // Take language from the request
    //requestedLanguage = $.request ? $.request.language : "";

    // If requestedLanguage was not found in the request, try
    // with the session
    if (!requestedLanguage || requestedLanguage === "") {
      // requestedLanguage = $.session.language;
    }

    // If requestedLanguage still is not found, do 'dev'
    if (!requestedLanguage || requestedLanguage === "") {
      requestedLanguage = "";
    }

    // Make string lowercase (e.g., because Firefox reports de-de
    // while Chrome reports de-DE)
    requestedLanguage = requestedLanguage.toLowerCase();
    if (requestedLanguage.indexOf("-") !== -1) {
      requestedLanguage = requestedLanguage.substring(
        0,
        requestedLanguage.indexOf("-")
      );
    }
  }
  return requestedLanguage;
}

export function _getNameFromNameObj(nameObj, requestedLanguage) {
  let val = "";
  if (typeof nameObj === "string") {
    return nameObj;
  }
  nameObj.some((name) => {
    if (name.lang === requestedLanguage) {
      val = name.value;
      return true;
    } else if (name.lang === "") {
      val = name.value;
    }
  });
  return val;
}

export function _restrictToLanguage(config, configWalkFunction) {
  const requestedLanguage = isXS2() ? "" : _getRequestedLanguage();
  configWalkFunction("**.name").forEach((name) => {
    const translation = _getNameFromNameObj(name.obj, requestedLanguage);
    utilsLib.replaceObjectByPath(config, name.path, translation);
  });
}

export function _applyDefaultAttributes(config, configWalkFunction) {
  const defaultAttributeKeys = Object.keys(config.patient.attributes).filter(
    (key) => {
      const attr = config.patient.attributes[key];
      return attr.isDefault;
    }
  );
  configWalkFunction("**.interactions.*").forEach((interaction) => {
    defaultAttributeKeys.forEach((key) => {
      const path = interaction.path + ".attributes." + key;
      const value = config.patient.attributes[key];
      utilsLib.createPathInObject(config, path, value);
    });
  });
  for (let i = 0; i < defaultAttributeKeys.length; i++) {
    delete config.patient.attributes[defaultAttributeKeys[i]];
  }
}

export function _excludeDisabledElements(config, configWalkFunction) {
  const elements = configWalkFunction("**.interactions.*").concat(
    configWalkFunction("**.attributes.*")
  );
  elements.forEach((element) => {
    if (element.obj.isDisabled) {
      utilsLib.deleteObjectByPath(config, element.path);
    }
  });
}

export function _concatOTSAttributes(config, configWalkFunction) {
  const elements = configWalkFunction("**.interactions.*.attributes.*");

  elements.forEach((element) => {
    const concatArr = [];
    if (element.obj.defaultFilter) {
      concatArr.push(element.obj.defaultFilter);
    }

    // lets check if all preconditions for an OTS attribute are fulfilled:
    // 1 - having a custom table:
    // 2 - having all properties: otsLanguage, otsSubject and otsHierarchyLevel
    if (
      element.obj.from &&
      element.obj.from["@CODE"] &&
      element.obj.otsLanguage &&
      element.obj.otsSubject &&
      element.obj.otsHierarchyLevel
    ) {
      if (!element.obj.otsTermContext) {
        element.obj.otsTermContext = "cancer";
      }

      const otsExpression = `(@CODE."LANGUAGE" = '${element.obj.otsLanguage}' AND
                @CODE."SUBJECT" = '${element.obj.otsSubject}' AND
                @CODE."HIERARCHY_LEVEL" = '${element.obj.otsHierarchyLevel}' AND
                @CODE."TERM_CONTEXT" = '${element.obj.otsTermContext}') `;

      concatArr.push(otsExpression);
    }

    element.obj.defaultFilter = concatArr.join(" AND ");
  });
}

export function getElementCount(config) {
  let length = 0;
  if (config && config.patient && config.patient.interactions) {
    length += config.patient.interactions.length;
  }
  if (config && config.patient && config.patient.conditions) {
    config.patient.conditions.forEach((conditions) => {
      if (conditions.interactions) {
        length += conditions.interactions.length;
      }
    });
  }
  return length;
}

// Append a default placeholder meta if not in the config yet.
export function _applyDefaultTableTypePlaceholderMap(config) {
  if (
    config.advancedSettings &&
    !config.advancedSettings.tableTypePlaceholderMap
  ) {
    config.advancedSettings.tableTypePlaceholderMap = {
      ...defaultTableTypePlaceholderMap,
    };
  }
}
