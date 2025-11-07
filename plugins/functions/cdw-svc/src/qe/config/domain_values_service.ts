import {
  QueryObject as queryObjectLib,
  Logger,
  EnvVarUtils,
} from "@alp/alp-base-utils";
import * as queryUtils from "../utils/queryutils";
import * as utilsLib from "../../utils/utils";
import { Connection as connLib } from "@alp/alp-base-utils";
type ConnectionInterface = connLib.ConnectionInterface;
type CallBackInterface = connLib.CallBackInterface;

const log = Logger.CreateLogger("cdw-log");
export function processRequest({
  request,
  connection,
  placeholderSettings,
  callback,
}: {
  request: {
    attributePath: string;
    exprToUse: string;
    useRefText: boolean;
    config: CDMConfigType;
    suggestionLimit: number;
  };
  connection: ConnectionInterface;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  try {
    utilsLib.assert(
      request.attributePath,
      'The request must contain a property "attributePath"'
    );

    if (request.exprToUse) {
      utilsLib.assert(
        request.exprToUse === "expression" ||
          request.exprToUse === "referenceExpression",
        'The only allowed exprToUse values are "expression" and "referenceExpression" '
      );
    }
  } catch (err) {
    callback(err, null);
    return;
  }

  const { placeholderTableMap, tableTypePlaceholderMap } = placeholderSettings;
  const exprToUse = request.exprToUse ? request.exprToUse : "expression";

  const attributePath = request.attributePath;

  const useRefText = request.useRefText ? request.useRefText : false;

  const config = request.config;
  // verify what type of attribute
  const jsonWalk = utilsLib.getJsonWalkFunction(config);
  const configAttrObj = jsonWalk(attributePath)[0].obj;

  const suggestionsLimit =
    request.suggestionLimit || configAttrObj.suggestionLimit || 100;
  // override some tables if specified so in the config
  const realPlaceholderMap = queryUtils.getPersonalizedPlaceholderMap(
    placeholderTableMap,
    attributePath,
    config
  );

  if (exprToUse === "referenceExpression") {
    getDistinctValuesFromReference(
      connection,
      jsonWalk,
      attributePath,
      suggestionsLimit,
      useRefText,
      realPlaceholderMap,
      callback
    );
  } else {
    getDistinctValuesFromData({
      connection,
      jsonWalk,
      attributePath,
      suggestionsLimit,
      useRefText,
      placeholderSettings: {
        placeholderTableMap: realPlaceholderMap,
        tableTypePlaceholderMap,
      },
      callback,
    });
  }
}

function postProcessResults(results) {
  const newData = results.data.map((elem) => {
    elem.text = elem.text && elem.text !== "NoValue" ? elem.text : "";
    elem.score = elem.score ? elem.score : 1;
    return elem;
  });

  results.data = newData;
  return results;
}

function getDistinctValuesFromData({
  connection,
  jsonWalk,
  attributePath,
  suggestionsLimit,
  useRefText,
  placeholderSettings,
  callback,
}: {
  connection: ConnectionInterface;
  jsonWalk: (path: string) => any[];
  attributePath: string;
  suggestionsLimit: number;
  useRefText: boolean;
  placeholderSettings: PlaceholderSettingsType;
  callback: CallBackInterface;
}) {
  try {
    const { placeholderTableMap } = placeholderSettings;
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrExpr = configAttrObj.expression;
    const defaultAttrFilter = configAttrObj.defaultFilter;
    const referenceFilter = configAttrObj.referenceFilter
      ? configAttrObj.referenceFilter
      : "";

    const interactionPath = attributePath.replace(/\.attributes\..*/, "");
    const configInterObj = jsonWalk(interactionPath)[0].obj;
    const defaultInterFilter = configInterObj.defaultFilter;

    const placeholderAliasMap = queryUtils.buildPlaceholderMapAliasTable(
      placeholderTableMap
    ) as PholderTableMapType;

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
    const aliasedRefFilter = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      referenceFilter
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

    let threshold: number = EnvVarUtils.getCDWAuditThreshold();
    log.info(`CDW audit threshold: ${threshold}`);
    if (useRefText) {
      // if there is no reference expression, use @REF.CODE as default.
      // This shouldn't happen, though, if the config is consistent
      const referenceExpr = configAttrObj.referenceExpression
        ? configAttrObj.referenceExpression
        : `@REF.${placeholderTableMap["@REF.CODE"]}`;
      const aliasedRefExpr = queryUtils.replacePlaceholderWithCustomString(
        placeholderAliasMap,
        referenceExpr
      );

      if (aliasedRefFilter) {
        if (whereConditions) {
          whereConditions += ` AND ${aliasedRefFilter}`;
        } else {
          whereConditions = aliasedRefFilter;
        }
      }
      sQuery = queryObjectLib.QueryObject.format(
        `WITH BASEQUERY AS (
                    SELECT DISTINCT  ( %UNSAFE )  AS "value" , R.%UNSAFE AS "text",
                    COUNT(1) OVER (PARTITION BY %UNSAFE) as "gr_cnt"
                    FROM
                    ${sJoins}
                    LEFT JOIN ${placeholderTableMap["@REF"]} R ON %UNSAFE = %UNSAFE
                    %UNSAFE
                    ORDER BY "value" ASC
                    LIMIT %f
                ), SELECTQUERY AS (
                    SELECT BASEQUERY."value", BASEQUERY."text" FROM BASEQUERY
                    WHERE BASEQUERY."gr_cnt" >= %f
                )
                SELECT * FROM SELECTQUERY`,
        aliasedExpr,
        placeholderTableMap["@REF.TEXT"],
        aliasedExpr,
        aliasedRefExpr,
        aliasedExpr,
        whereConditions ? " WHERE (" + whereConditions + ")" : "",
        suggestionsLimit,
        threshold
      );
    } else {
      sQuery = queryObjectLib.QueryObject.format(
        `WITH BASEQUERY AS (
                    SELECT DISTINCT  ( %UNSAFE )  AS "value",
                    COUNT(1) OVER (PARTITION BY %UNSAFE) as "gr_cnt"
                    FROM
                    ${sJoins}
                    %UNSAFE
                    ORDER BY "value" ASC
                    LIMIT %f
                ), SELECTQUERY AS (
                    SELECT BASEQUERY."value" FROM BASEQUERY
                    WHERE BASEQUERY."gr_cnt" >= %f
                )
                SELECT * FROM SELECTQUERY`,
        aliasedExpr,
        aliasedExpr,
        whereConditions ? " WHERE (" + whereConditions + ")" : "",
        suggestionsLimit,
        threshold
      );
    }

    sQuery.executeQuery(connection, (err, results) => {
      if (err) {
        callback(err, null);
        return;
      }
      results = postProcessResults(results);
      callback(err, results);
    });
  } catch (err) {
    callback(err, null);
  }
}

function getDistinctValuesFromReference(
  connection: ConnectionInterface,
  jsonWalk,
  attributePath,
  suggestionsLimit: number,
  useRefText,
  placeholderTableMap: PholderTableMapType,
  callback: CallBackInterface
) {
  try {
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrRefExpression = configAttrObj.referenceExpression;
    const referenceFilter = configAttrObj.referenceFilter
      ? configAttrObj.referenceFilter
      : "";

    // TODO do we need this map?
    const placeholderAliasMap = {
      "@REF": "R",
    } as PholderTableMapType;

    let sQuery;
    const aliasedRefExpression = queryUtils.replacePlaceholderWithCustomString(
      placeholderAliasMap,
      attrRefExpression
    );
    const aliasedRefFilter = attrRefExpression
      ? ` WHERE ${queryUtils.replacePlaceholderWithCustomString(
          placeholderAliasMap,
          referenceFilter
        )} `
      : "";
    const refTextSelect = useRefText
      ? ` , R.${placeholderTableMap["@REF.TEXT"]} as "text" `
      : "";
    sQuery = queryObjectLib.QueryObject.format(
      `SELECT DISTINCT  ( %UNSAFE )  AS "value" ${refTextSelect} FROM ${placeholderTableMap["@REF"]} R %UNSAFE ORDER BY "value" ASC LIMIT %f `,
      aliasedRefExpression,
      aliasedRefFilter,
      suggestionsLimit
    );

    sQuery.executeQuery(connection, (err, results) => {
      if (err) {
        callback(err, null);
        return;
      }
      results = postProcessResults(results);
      callback(err, results);
    });
  } catch (err) {
    callback(err, null);
  }
}
