 // TODO: import configLib = require("./config.ts");
import {
  QueryObject as queryObjectLib,
  QueryObject,
} from "@alp/alp-base-utils";
import * as queryUtils from "../utils/queryutils";
import * as utilsLib from "../../utils/utils";
import { Connection as connLib, Logger } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import { env } from "../../configs";
import { DUCKDB_FILE_NAME } from "../settings/Defaults";

const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);
const log = Logger.CreateLogger();

export function processRequest({
  request,
  connection,
  placeholderSettings,
  callback,
}: {
  request: {
    config: CDMConfigType;
    attributePath: string;
    exprToUse: string;
    validationRequest: boolean;
  };
  connection: ConnectionInterface;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  const { placeholderTableMap, tableTypePlaceholderMap } = placeholderSettings;

  const processResult = (err, result: AttributeInfoResponseType) => {
    if (err) {
      callback(err, null);
      return;
    }
    const res: AttributeInfoResponseType = { ...result };
    let typeCheck = true;
    const configPath = request.attributePath.split(".");
    let configItem: any = request.config;

    for (let i = 0; i < configPath.length; i++) {
      if (configItem[configPath[i]]) {
        configItem = configItem[configPath[i]];
      } else {
        break;
      }
    }
    const expectedType = configItem.type;

    if (
      result &&
      result.data[0] &&
      result.data[0].min &&
      typeof result.data[0].min !== undefined
    ) {
      let resultType = typeof result.data[0].min;

      if (isNumeric(result.data[0].min)) {
        resultType = "number";
      }

      if (
        expectedType === "num" &&
        resultType !== "number" &&
        result.data[0].min !== "NoValue"
      ) {
        typeCheck = false;
      } else if (
        expectedType === "time" &&
        resultType !== "object" &&
        isNaN(Date.parse(result.data[0].min)) &&
        result.data[0].min !== "NoValue"
      ) {
        typeCheck = false;
      } else if (
        expectedType === "datetime" &&
        resultType !== "object" &&
        isNaN(Date.parse(result.data[0].min)) &&
        result.data[0].min !== "NoValue"
      ) {
        typeCheck = false;
      }
    }

    if (!typeCheck) {
      res.exception = "HPH_CDM_CFG_TEST_ERRORS_FAIL_TYPE_MISMATCH";
      delete res.data;
    }

    callback(null, res);
  };

  try {
    utilsLib.assert(
      request.attributePath,
      `The request must contain a property "attributePath"`
    );

    if (request.exprToUse) {
      utilsLib.assert(
        request.exprToUse === "expression" ||
          request.exprToUse === "referenceExpression",
        `The only allowed exprToUse values are "expression" and "referenceExpression" `
      );
    }

    const attributePath = request.attributePath;
    const config = request.config;
    const jsonWalk = utilsLib.getJsonWalkFunction(config);
    const configAttrObj = jsonWalk(attributePath)[0].obj;

    if (configAttrObj.refFilter) {
      utilsLib.assert(
        configAttrObj.refFilter.match(/@[^.^\s]+/g).length ===
          configAttrObj.refFilter.match(/@REF/gi).length,
        `The only allowed placeholder in the reference filter is @REF`
      );
    }

    if (configAttrObj.referenceExpression) {
      utilsLib.assert(
        configAttrObj.referenceExpression.match(/@[^.^\s]+/g).length ===
          configAttrObj.referenceExpression.match(/@REF/gi).length,
        `The only allowed placeholder in the reference expression is @REF`
      );
    }

    // test either the expression or the ref expression
    const exprToUse = request.exprToUse || "expression";

    // override some tables if specified so in the config
    const realPlaceholderMap = queryUtils.getPersonalizedPlaceholderMap(
      placeholderTableMap,
      attributePath,
      config
    );

    if (request.validationRequest) {
      if (exprToUse === "referenceExpression") {
        attributeValidationReference(
          connection,
          jsonWalk,
          attributePath,
          realPlaceholderMap,
          processResult
        );
      } else {
        attributeValidationData({
          connection,
          jsonWalk,
          attributePath,
          placeholderSettings: {
            placeholderTableMap: realPlaceholderMap,
            tableTypePlaceholderMap,
          },
          callback: processResult,
        });
      }
    } else {
      if (exprToUse === "referenceExpression") {
        getInfosFromReference({
          connection,
          jsonWalk,
          attributePath,
          placeholderSettings: {
            placeholderTableMap: realPlaceholderMap,
            tableTypePlaceholderMap,
          },
          callback: processResult,
        });
      } else {
        getInfosFromData({
          connection,
          jsonWalk,
          attributePath,
          placeholderSettings: {
            placeholderTableMap: realPlaceholderMap,
            tableTypePlaceholderMap,
          },
          callback: processResult,
        });
      }
    }
  } catch (err) {
    processResult(err, null);
    return;
  }
}

function attributeValidationData({
  connection,
  jsonWalk,
  attributePath,
  placeholderSettings,
  callback,
}: {
  connection: ConnectionInterface;
  jsonWalk: (path: string) => any[];
  attributePath: string;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  try {
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrExpr = configAttrObj.expression;
    const defaultAttrFilter = configAttrObj.defaultFilter;

    const interactionPath = attributePath.replace(/\.attributes\..*/, "");
    const configInterObj = jsonWalk(interactionPath)[0].obj;
    const defaultInterFilter = configInterObj.defaultFilter;
    const placeholderAliasMap = queryUtils.buildPlaceholderMapAliasTable(
      placeholderSettings.placeholderTableMap
    );

    if (attrExpr) {
      placeholderAliasMap[
        queryUtils.getTablePlaceholdersFromExpression(attrExpr)[0]
      ] = "X";
    }

    if (defaultInterFilter) {
      const pholderMatch =
        queryUtils.getTablePlaceholdersFromExpression(defaultInterFilter);
      if (pholderMatch) {
        placeholderAliasMap[pholderMatch[0]] = "Y";
      }

      if (
        configInterObj.hasOwnProperty("from") &&
        Object.keys(configInterObj.from).length > 0
      ) {
        placeholderAliasMap[Object.keys(configInterObj.from)[0]] = "Y";
      }
    }

    let sQuery;
    const aliasedExpr = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      attrExpr
    );
    const aliasedDefAttrFilter = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      defaultAttrFilter
    );
    const aliasedDefInterFilter = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      defaultInterFilter
    );

    const sJoins = queryUtils.getStandardJoin({
      placeholderAliasMap,
      placeholderSettings,
      attributePath,
      jsonWalk,
    });

    let whereConditions = "";
    if (aliasedDefAttrFilter) {
      if (aliasedDefInterFilter) {
        whereConditions =
          aliasedDefAttrFilter + " AND " + aliasedDefInterFilter;
      } else {
        whereConditions = aliasedDefAttrFilter;
      }
    } else {
      if (aliasedDefInterFilter) {
        whereConditions = aliasedDefInterFilter;
      }
    }

    sQuery = queryObjectLib.QueryObject.format(
      'SELECT top 1 ( %UNSAFE ) AS "min"' + " FROM " + sJoins + " %UNSAFE ",
      aliasedExpr,
      whereConditions ? " WHERE (" + whereConditions + ")" : ""
    );

    log.debug(sQuery.queryString);

    sQuery.executeQuery(connection, callback);
  } catch (err) {
    callback(err, null);
  }
}

function attributeValidationReference(
  connection: ConnectionInterface,
  jsonWalk,
  attributePath,
  placeholderTableMap: PholderTableMapType,
  callback: CallBackInterface
) {
  try {
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrRefExpression = configAttrObj.referenceExpression;
    const referenceFilter = configAttrObj.referenceFilter
      ? configAttrObj.referenceFilter
      : "";

    const placeholderAliasMap = {
      "@REF": "R",
    } as PholderTableMapType;

    let sQuery: queryObjectLib.QueryObject;
    const aliasedRefExpression = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      attrRefExpression
    );
    const aliasedRefFilter = attrRefExpression
      ? "WHERE " +
        queryUtils.replacePlaceholderWithCustomString(
          placeholderAliasMap,
          referenceFilter
        )
      : "";
    if(env.USE_DUCKDB === "true"){
      // TODO: Remove DUCKDB_FILE_NAME
      placeholderTableMap["@REF"] = placeholderTableMap["@REF"].replace(/[A-Za-z0-9_]+\./g, `${DUCKDB_FILE_NAME}.`)
    }
    sQuery = queryObjectLib.QueryObject.format(
      'SELECT  top 1 ( %UNSAFE ) AS "min" ' +
        " FROM " +
        placeholderTableMap["@REF"] +
        " R " +
        " %UNSAFE ",
      aliasedRefExpression,
      aliasedRefFilter
    );

    log.debug(sQuery.queryString);
    sQuery.executeQuery(connection, callback);
  } catch (err) {
    callback(err, null);
  }
}

function getInfosFromData({
  connection,
  jsonWalk,
  attributePath,
  placeholderSettings,
  callback,
}: {
  connection: ConnectionInterface;
  jsonWalk;
  attributePath: string;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  try {
    const { placeholderTableMap } = placeholderSettings;
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrExpr = configAttrObj.expression;
    const defaultAttrFilter = configAttrObj.defaultFilter;
    const interactionPath = attributePath.replace(/\.attributes\..*/, "");
    const configInterObj = jsonWalk(interactionPath)[0].obj;
    const defaultInterFilter = configInterObj.defaultFilter;

    const placeholderAliasMap =
      queryUtils.buildPlaceholderMapAliasTable(placeholderTableMap);

    let sQuery;
    const aliasedExpr = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      attrExpr
    );
    const aliasedDefAttrFilter = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      defaultAttrFilter
    );
    const aliasedDefInterFilter = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      defaultInterFilter
    );

    const sJoins = queryUtils.getStandardJoin({
      placeholderAliasMap,
      placeholderSettings,
      attributePath,
      jsonWalk,
    });

    let whereConditions = "";
    if (aliasedDefAttrFilter) {
      if (aliasedDefInterFilter) {
        whereConditions =
          aliasedDefAttrFilter + " AND " + aliasedDefInterFilter;
      } else {
        whereConditions = aliasedDefAttrFilter;
      }
    } else {
      if (aliasedDefInterFilter) {
        whereConditions = aliasedDefInterFilter;
      }
    }

    sQuery = queryObjectLib.QueryObject.format(
      'SELECT COUNT( DISTINCT ( %UNSAFE ) )  AS "count" ,' +
        ' MIN ( %UNSAFE ) AS "min" , MAX( %UNSAFE ) AS "max" ' +
        " FROM " +
        sJoins +
        " %UNSAFE ",
      aliasedExpr,
      aliasedExpr,
      aliasedExpr,
      whereConditions ? " WHERE (" + whereConditions + ")" : ""
    );

    log.debug(sQuery.queryString);

    sQuery.executeQuery(connection, callback);
  } catch (err) {
    callback(err, null);
  }
}

function getInfosFromReference({
  connection,
  jsonWalk,
  attributePath,
  placeholderSettings,
  callback,
}: {
  connection: ConnectionInterface;
  jsonWalk;
  attributePath;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  try {
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrRefExpression = configAttrObj.referenceExpression;
    const referenceFilter = configAttrObj.referenceFilter
      ? configAttrObj.referenceFilter
      : "";

    const placeholderAliasMap = {
      "@REF": "R",
    } as PholderTableMapType;

    let sQuery;
    const aliasedRefExpression = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      attrRefExpression
    );
    const aliasedRefFilter = attrRefExpression
      ? "WHERE " +
        queryUtils.replacePlaceholderWithCustomString(
          placeholderAliasMap,
          referenceFilter
        )
      : "";
    if(env.USE_DUCKDB === "true"){
      // TODO: Remove DUCKDB_FILE_NAME
      placeholderSettings.placeholderTableMap["@REF"] = placeholderSettings.placeholderTableMap["@REF"].replace(/[A-Za-z0-9_]+\./g, `${DUCKDB_FILE_NAME}.`)
    }
    sQuery = queryObjectLib.QueryObject.format(
      'SELECT COUNT( DISTINCT ( %UNSAFE ) )  AS "count" ,' +
        ' MIN ( %UNSAFE ) AS "min" , MAX( %UNSAFE ) AS "max" ' +
        " FROM " +
        placeholderSettings.placeholderTableMap["@REF"] +
        " R " +
        " %UNSAFE ",
      aliasedRefExpression,
      aliasedRefExpression,
      aliasedRefExpression,
      aliasedRefFilter
    );

    log.debug(sQuery.queryString);
    sQuery.executeQuery(connection, callback);
  } catch (err) {
    callback(err, null);
  }
}
