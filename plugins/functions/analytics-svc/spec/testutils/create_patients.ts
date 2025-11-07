import requestIteratorLib = require("./request_iterator");
import { assert, createGuid as createId } from "@alp/alp-base-utils";
import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import async = require("async");
import { testsLogger } from "./logger";

let tasks = [];

let insertPholderTableMap = {
  "@PATIENT": ["legacy.cdw.db.models::DWEntities.Patient_Attr"],
  "@PATIENT_KEY": ["legacy.cdw.db.models::DWEntities.Patient_Key"],
  "@INTERACTION": ["legacy.cdw.db.models::DWEntities.Interactions_Attr"],
  "@CODE": ["legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details"],
  "@MEASURE": ["legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures"],
  "@OBS": ["legacy.cdw.db.models::DWEntities.Observations_Attr"],
  "@OBS_KEY": ["legacy.cdw.db.models::DWEntities.Observations_Key"],
  "@TEXT": ["legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text"],
};
/* eslint-enable key-spacing */ /* beautify preserve:end */

function getValue(info, val) {
  let value = info.value.replace("$$", val);
  return value;
}

export class PatientCreator {
  tables: any;
  PatientInteractionMap: {};
  config: any;
  connection: any;
  schemaName: any;
  constructor(dialect, schemaName, hanaConn, config, callback) {
    this.schemaName = schemaName;

    dbConnectionUtil.DBConnectionUtil.getConnection(
      dialect,
      hanaConn,
      schemaName,
      (err, client) => {
        this.connection = client;
        this.config = config;
        this.getTables(this.schemaName, (err, result) => {
          if (err) {
            callback(err, null);
          } else {
            this.tables = result;
            callback(null, this);
          }
        });

        this.PatientInteractionMap = {};
      }
    );
  }

  getTables(schemaName, callback) {
    let sql = [
      "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION ",
      "FROM TABLE_COLUMNS WHERE SCHEMA_NAME='" + schemaName + "'",
      "GROUP BY TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, POSITION",
    ].join(" ");

    /* beautify preserve:start */ /* eslint-disable key-spacing */
    let dataTypeMap = {
      NVARCHAR: "text",
      TEXT: "text",
      DATE: "time",
      TIMESTAMP: "time",
      SECONDDATE: "time",
      DECIMAL: "num",
      INTEGER: "num",
      BIGINT: "num",
      VARBINARY: "binary",
    };
    /* eslint-enable key-spacing */ /* beautify preserve:end */

    let result = {};
    let tableName;
    let columnName;
    let dataType;
    let position;

    this.connection.executeQuery(sql, [], (err, list) => {
      if (err) {
        callback(err, null);
      } else {
        list.map((rs) => {
          tableName = rs.TABLE_NAME;
          columnName = rs.COLUMN_NAME;
          dataType = rs.DATA_TYPE_NAME;
          position = rs.POSITION;

          if (!(tableName in result)) {
            result[tableName] = {};
          }
          result[tableName][columnName] = {
            position,
            dataType: dataTypeMap[dataType],
          };
        });
      }
      callback(null, result);
    });
  }

  extractPholderTableFieldValue(configExpression) {
    let r = /(@\w+)\.(?:\")?([\w\.]+)(?:\")?\s*=\s*(\S+)\s*$/;

    let match = configExpression.match(r);
    assert(match, "cannot match config expression " + configExpression);
    let pholder = match[1];
    let fieldName = match[2];
    let value = match[3];

    // TODO: Find a way to avoid this ugly workaround, e.g. by making JSON walk function able to handle "." in attribute names
    // fieldName = fieldName.replace(/_{2}DOT_{2}/g,".");

    value = value.replace(/'(\S+)'/g, "$1");

    assert(pholder in insertPholderTableMap, "Unknown placeholder " + pholder);
    let possibleTables = insertPholderTableMap[pholder];
    let table;
    for (let i = 0; i < possibleTables.length; i++) {
      table = possibleTables[i];
      if (fieldName in this.tables[table]) {
        return {
          table,
          field: fieldName,
          value,
          pholder,
        };
      }
    }
    throw new Error("Field " + fieldName + " not found in table " + table);
  }

  insertIntoTable(tableName, jsonData, callback) {
    if (Object.keys(jsonData).length === 0) {
      return;
    }

    // special cases to avoid not-null errors
    switch (tableName) {
      case "legacy.cdw.db.models::DWEntities.Patient_Attr":
        jsonData.ValidFrom = jsonData.VALID_FROM || "01.01.1980";
        break;
      case "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Text":
        jsonData.Lang = jsonData.LANG || "EN";
        jsonData.InteractionTextID = createId().replace(/-/g, "");
        break;
      default:
        break;
    }

    let that = this;
    let fieldNames = Object.keys(jsonData);
    let parameterObjects = fieldNames.map((fieldName) => {
      let value = jsonData[fieldName];
      let type = that.tables[tableName][fieldName].dataType;
      // Ensure that numerical values are stored as values
      if (type === "num" && typeof value !== "number") {
        value = parseFloat(value);
        // Ensure that binary values are stored accordingly
      } else if (type === "binary") {
        let v2 = value;
        value = "'" + value.toString("utf8").replace(/-/g, "") + "'";
      } else if (type === "text") {
        value = "'" + value + "'";
      } else if (type === "time") {
        value = "TO_TIMESTAMP('" + value + "', 'DD.MM.YYYY')";
      }

      return value;
    });

    let joinedKeys = parameterObjects.join(", ");

    let allParameters = "(" + joinedKeys + ")";

    let escapedFieldNames = fieldNames.map((fieldName) => {
      return '"' + fieldName + '"'; // Required to handle CamelCase column names
    });

    let sql = [
      "INSERT INTO ",
      '"' + tableName + '"',
      "(" + escapedFieldNames.join(", ") + ")",
      "VALUES ",
    ].join(" ");

    let queryObj = sql + allParameters;
    this.connection.executeUpdate(queryObj, [], callback);
  }

  /**
   * Creates a new patient with interactions based on given patientJson.
   * Only adds interactions from patientJson that match the "patient creation"
   * config (which is passed to the constructor of PatientCreator)! The optional
   * condId parameter is used as condition ID for all interactions under
   * "patient.conditions.acme".
   * @param   {object} patientJson A JSON object describing a patient and related
   *                               interactions. Its tree structure is similar to
   *                               config objects.
   * @param   {string} [condId]    (optional) A conditionID used for interactions
   *                               under "patient.conditions.acme".
   * @returns {string} The new patientID generated by the PatientCreator.
   */
  addPatient(patientJson, condId, callback) {
    let that = this;
    let requestIterator = requestIteratorLib.getRequestIterator(
      patientJson,
      this.config
    );
    let patientId = createId().replace(/-/g, "");
    let conditionId = condId || createId().replace(/-/g, "");
    //console.log("patientJson:" + JSON.stringify(patientJson));
    let patientData = {};

    this.PatientInteractionMap[patientId] = {};

    patientData[insertPholderTableMap["@PATIENT"][0]] = {
      DWID: patientId,
      DWDateFrom: "01.01.1990",
      DWAuditID: 1,
    };
    patientData[insertPholderTableMap["@PATIENT_KEY"][0]] = {
      DWID: patientId,
      DWSource: "MRI01",
      DWAuditID: 1,
      PatientID: patientId,
    };

    tasks = [];
    // fill the patient data
    requestIterator("patient.attributes.*").forEach((attr, callback) => {
      let obsId = createId().replace(/-/g, "");
      tasks.push((callback) => {
        let obsData = {
          DWDateFrom: "01.01.1990",
          DWAuditID: 1,
          DWID: obsId,
          DWID_Patient: "",
        };
        if (attr.configValue.defaultInserts) {
          attr.configValue.defaultInserts.forEach((defaultIns) => {
            let info = that.extractPholderTableFieldValue(defaultIns);
            if (info.pholder === "@OBS") {
              obsData.DWID = obsId;
              obsData.DWID_Patient = patientId;
              obsData[info.field] = getValue(info, attr.requestValue);
            } else {
              patientData[info.table][info.field] = getValue(
                info,
                attr.requestValue
              );
            }
          });
        }

        if (Object.keys(obsData).length > 0) {
          that.insertIntoTable(
            insertPholderTableMap["@OBS"][0],
            obsData,
            (err, data) => {
              if (err) {
                throw err;
              }
              callback(null);
            }
          );
        }
      });

      tasks.push((callback) => {
        let obsKeyData = {
          DWID: obsId,
          DWSource: "ISH01",
          DWAuditID: 1,
          ObsID: createId().replace(/-/g, ""),
        };

        if (Object.keys(obsKeyData).length > 0) {
          that.insertIntoTable(
            insertPholderTableMap["@OBS_KEY"][0],
            obsKeyData,
            (err, data) => {
              if (err) {
                throw err;
              }
              callback(null);
            }
          );
        }
      });
    });

    for (let tbl in patientData) {
      let result = ((tbl) => {
        tasks.push((callback) => {
          that.insertIntoTable(tbl, patientData[tbl], (err, data) => {
            if (err) {
              throw err;
            }
            callback(null);
          });
        });
      })(tbl);
    }

    requestIterator("patient.interactions.*.*").forEach((interaction) => {
      that.createInteraction(
        requestIterator,
        interaction,
        patientId,
        null,
        callback
      );
    });

    requestIterator("patient.conditions.acme.interactions.*.*").forEach(
      (interaction) => {
        that.createInteraction(
          requestIterator,
          interaction,
          patientId,
          conditionId,
          callback
        );
      }
    );

    // console.log("tasks: " + tasks.length);
    async.series(tasks, (err, data) => {
      if (err) {
        throw err;
      }

      callback(null, patientId, that.PatientInteractionMap[patientId]);
    });
  }

  createInteractionAttribute(requestIterator, attr, interactionId, callback) {
    let that = this;

    let attrData = {
      DWID: interactionId,
      DWDateFrom: "01.01.1990",
      DWAuditID: 1,
    };

    if (attr.configValue && attr.configValue.defaultInserts) {
      let table;
      attr.configValue.defaultInserts.forEach((defaultIns) => {
        let info = that.extractPholderTableFieldValue(defaultIns);
        table = info.table;
        attrData[info.field] = getValue(info, attr.requestValue);
      });

      if (table) {
        tasks.push((callback) => {
          that.insertIntoTable(table, attrData, (err, data) => {
            if (err) {
              throw err;
            }
            callback(null);
          });
        });
      }
    }
  }

  createInteraction(
    requestIterator,
    interaction,
    patientId,
    conditionId,
    callback
  ) {
    let that = this;
    let interactionId = createId().replace(/-/g, "");

    let interactionData: any = {
      DWID: interactionId,
      DWDateFrom: "01.01.1990",
      DWAuditID: 1,
    };
    if (conditionId && typeof conditionId === "string") {
      interactionData.DWID_Condition = conditionId;
    }
    interactionData.DWID_Patient = patientId;

    if (interaction.configValue.defaultInserts) {
      interaction.configValue.defaultInserts.forEach((defaultIns) => {
        let info = that.extractPholderTableFieldValue(defaultIns);
        interactionData[info.field] = getValue(info, interaction.requestValue);
      });
    }

    if (interaction.requestValue.hasOwnProperty("_start")) {
      interactionData.PeriodStart = interaction.requestValue._start;
    }

    if (interaction.requestValue.hasOwnProperty("_end")) {
      interactionData.PeriodEnd = interaction.requestValue._end;
    }

    let table = insertPholderTableMap["@INTERACTION"][0];

    tasks.push((callback) => {
      that.insertIntoTable(table, interactionData, (err, data) => {
        if (err) {
          throw err;
        }

        that.PatientInteractionMap[patientId][interaction.requestPath] =
          interactionId;
        callback(null);
      });
    });

    let attributes = requestIterator(interaction.requestPath + ".attributes.*");

    if (attributes.length > 0) {
      for (let i in attributes) {
        that.createInteractionAttribute(
          requestIterator,
          attributes[i],
          interactionId,
          callback
        );
      }
    }
  }

  linkParentInteractionToChild(patientId, parentPath, childPath, callback) {
    let that = this;
    let patient = that.PatientInteractionMap[patientId];
    if (!patient) {
      throw new Error("Patient " + patientId + " does not exists!");
    }

    if (patient[parentPath] && patient[childPath]) {
      let tableName = insertPholderTableMap["@INTERACTION"][0];

      let sql = [
        "UPDATE ",
        '"' + tableName + '"',
        'SET "DWID_ParentInteraction" = UPPER(\'' + patient[parentPath] + "')",
        'WHERE "DWID" = UPPER(\'' + patient[childPath] + "')",
      ].join(" ");

      this.connection.executeUpdate(sql, [], callback);
    }
  }
}
