import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import {
  QUERY,
  defaultPholderTableMap,
  defaultGuardedPholderTable,
  defaultInterfaceViewsPholderTableMap,
  defaultInterfaceViewsGuardedPholderTable,
  defaultSettings,
  placeholder,
  defaultTableTypePlaceholderMap,
} from "./Defaults";
import * as Utils from "./Utils";
export const DEFAULT_USER = "TEST_USER";

function getQueryString(queryName) {
  const query = QUERY[queryName];
  return query;
}

export async function validateDBTable(
  connection: ConnectionInterface,
  fromName: string
) {
  const returnObj = {
    message: "HPH_CFG_GLOBAL_DB_OBJECT_INCORRECT_FORMAT",
    valid: false,
  };

  return new Promise<{
    message: string;
    valid: boolean;
  }>((resolve, reject) => {
    if (!Utils.isValidHanaObjectName(fromName)) {
      return resolve(returnObj);
    }

    const parsedName = Utils.parseDbObjectName(fromName);
    const schema = parsedName.schema
      ? parsedName.schema
      : connection.schemaName;

    // if (!Utils.isSchemaAllowed(schema)) {
    //   return resolve(returnObj);
    // }

    const query = getQueryString("CHECK_TABLE");
    const parameters = [
      { value: schema },
      { value: parsedName.tableName },
      { value: schema },
      { value: parsedName.tableName },
    ];

    connection.executeQuery(query, parameters, (err, result) => {
      if (err) {
        return reject(err);
      }

      let tableCount = 0;
      result.forEach((obj) => {
        tableCount = tableCount + obj.tableCount;
      });

      if (tableCount > 0) {
        returnObj.valid = true;
        returnObj.message = "";
      } else {
        returnObj.message = "HPH_CFG_GLOBAL_DB_OBJECT_NOT_FOUND";
      }

      resolve(returnObj);
    });
  });
}

async function validatePlaceholder(
  connection: ConnectionInterface,
  settings: any,
  parent: string,
  index: number,
  internalResult: ValidationMessageType[],
  callback: CallBackInterface
) {
  if (!settings || !settings.hasOwnProperty(parent)) {
    return callback(null, internalResult);
  }
  const placeholderKey = Object.keys(settings[parent]).filter(
    (key) => key.match(/@[A-Z]+$/g) !== null
  );

  if (placeholderKey.length > 0 && placeholderKey.length > index) {
    try {
      const validationResult = await validateDBTable(
        connection,
        settings[parent][placeholderKey[index]]
      );
      if (!validationResult.valid) {
        internalResult.push({
          source: `${parent}.${placeholderKey[index]}`,
          message: validationResult.message,
        });
      }
      validatePlaceholder(
        connection,
        settings,
        parent,
        index + 1,
        internalResult,
        callback
      );
    } catch (err) {
      return callback(err, null);
    }
  } else {
    callback(null, internalResult);
  }
}

function validateEmptyPlaceholder(
  settings: AdvancedSettingsType,
  parent: string,
  validationResult: ValidationMessageType[],
  callback: CallBackInterface
) {
  if (!settings[parent]) {
    callback(null, validationResult);
    return;
  }
  Object.keys(settings[parent]).forEach((key) => {
    if (settings[parent][key] === "" || !settings[parent][key]) {
      validationResult.push({
        source: `${parent}.${key}`,
        message: "HPH_CFG_GLOBAL_PLACEHOLDER_REQUIRED",
      });
    }
  });

  callback(null, validationResult);
}

export function validateSettings(
  connection: ConnectionInterface,
  inputSettings: AdvancedSettingsType,
  callback: CallBackInterface
) {
  // callback hell. needs refactor heaven
  const validationResult = [];
  validatePlaceholder(
    connection,
    inputSettings,
    "tableMapping",
    0,
    validationResult,
    (err, placeholderErrors: ValidationMessageType[]) => {
      if (err) {
        return callback(err, []);
      }
      validatePlaceholder(
        connection,
        inputSettings,
        "guardedTableMapping",
        0,
        placeholderErrors,
        (err2, guardedPatientErrors: ValidationMessageType[]) => {
          if (err2) {
            return callback(err2, []);
          }
          validatePlaceholder(
            connection,
            inputSettings.settings,
            "otsTableMap",
            0,
            guardedPatientErrors,
            (err3, otsTableErrors: ValidationMessageType[]) => {
              if (err3) {
                return callback(err3, []);
              }
              validateEmptyPlaceholder(
                inputSettings,
                "tableMapping",
                otsTableErrors,
                (err, msgList: ValidationMessageType[]) => {
                  if (err) {
                    return callback(err, []);
                  }
                  callback(null, msgList);
                }
              );
            }
          );
        }
      );
    }
  );
}

//Rules of attribute values to be validated
const _validateAttributes = [
  {
    datatype: "string",
    attribute: "csvDelimiter",
    regex: /^(?:,|;)$/g, //allow only a single , or ;
    path: ["settings"],
    checkType: "regex",
  },
];

/*validate attribute values of the settings, if the validation fails then a error message is pushed to the
  validationResult array which is handled in the front end.
*/
export function validateSettingsAttributes(
  settings: AdvancedSettingsType,
  validationResult: ValidationMessageType[],
  callback: CallBackInterface
) {
  try {
    _validateAttributes.forEach((attributeToCheck) => {
      let path = settings;
      if (attributeToCheck.path) {
        attributeToCheck.path.forEach((parentNode) => {
          path = path[parentNode];
        });
        const value = path[attributeToCheck.attribute];
        //Does a regex check
        if (attributeToCheck.checkType === "regex") {
          if (!value.match(attributeToCheck.regex)) {
            //if the regex check fails to match
            validationResult.push({
              source: `${attributeToCheck.path.join("/")}/${
                attributeToCheck.attribute
              }`,
              message: "HPH_CFG_GLOBAL_SAVE_FAILED_TITLE",
            });
          }
        }
      }
    });

    callback(null, validationResult);
  } catch (err) {
    callback(err, validationResult);
  }
}

/*
 * In this file we collect settings for the applications.
 * At some point these type of settings may become part of the admin ui.
 *
 */
export class Settings {
  // Default placeholder-to-table mapping WITH RESTRICTED ACCESS
  protected defaultGuardedPholderTableMap: PholderTableMapType;
  protected defaultInterfaceViewsGuardedPholderTableMap: PholderTableMapType;
  protected customGuardedPholderTableMap: any;
  //private otherSettings: any;
  //private user: string;
  protected userSpecificAdavancedSettings: AdvancedSettingsType;

  constructor() {
    //this.user = user;
    this.defaultGuardedPholderTableMap = Utils.cloneJson(
      defaultPholderTableMap
    );
    this.defaultGuardedPholderTableMap[
      defaultTableTypePlaceholderMap.factTable.placeholder
    ] = defaultGuardedPholderTable;
    this.defaultInterfaceViewsGuardedPholderTableMap = Utils.cloneJson(
      defaultInterfaceViewsPholderTableMap
    );
    this.defaultInterfaceViewsGuardedPholderTableMap[
      defaultTableTypePlaceholderMap.factTable.placeholder
    ] = defaultInterfaceViewsGuardedPholderTable;
    this.customGuardedPholderTableMap = {};

    //this.otherSettings = Utils.cloneJson(otherSettings);
  }

  public initAdvancedSettings(userSpecificAdavancedSettings: any) {
    this.userSpecificAdavancedSettings = userSpecificAdavancedSettings;
  }

  /*public getUser() {
        // Tests will not initialize user, because mostly user is not used.
        // Just as a precautionary measure, If user is null then returning some fixed value for tests.
        return (this.user) ? this.user : "TEST_USER";
    }*/

  public getSettings(): GlobalSettingsType {
    if (this.userSpecificAdavancedSettings) {
      return Utils.cloneJson(this.userSpecificAdavancedSettings.settings);
    } else {
      return Utils.cloneJson(defaultSettings);
    }
  }

  public getPlaceholder() {
    const copyObj = Utils.cloneJson(placeholder);
    return copyObj;
  }

  public getPlaceholderMap(): PholderTableMapType {
    if (this.userSpecificAdavancedSettings) {
      return Utils.cloneJson(this.userSpecificAdavancedSettings.tableMapping);
    } else {
      return Utils.cloneJson(defaultPholderTableMap);
    }
  }
}
