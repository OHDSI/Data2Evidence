import * as utilsLib from "../../utils/utils";
import * as queryUtils from "../utils/queryutils";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;

export async function processRequest(
  request,
  connection: ConnectionInterface,
  placeholderTableMap: PholderTableMapType,
  config
) {
  try {
    utilsLib.assert(
      request.interactionPath,
      `The request must contain a property "interactionPath"`
    );

    const interactionPath = request.interactionPath;

    // override some tables if specified so in the config
    const realPlaceholderMap = queryUtils.getPersonalizedPlaceholderMap(
      placeholderTableMap,
      interactionPath,
      config
    );

    const jsonWalk = utilsLib.getJsonWalkFunction(config);

    return doValidate(
      connection,
      jsonWalk,
      interactionPath,
      realPlaceholderMap
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

const doValidate = async (
  connection,
  jsonWalk,
  interactionPath,
  placeholderTableMap: PholderTableMapType
) => {
  const configObj = jsonWalk(interactionPath)[0].obj;
  const defaultInterFilter = configObj.defaultFilter;
  const pholderMatch =
    queryUtils.getTablePlaceholdersFromExpression(defaultInterFilter);
  let placeholderAliasMap = {};
  let pholder;

  // Found a placeholder in the default filter!
  if (pholderMatch) {
    pholder = pholderMatch[0];
    placeholderAliasMap = {
      [pholder]: "X",
    };
  }

  // found custom placeholders! this will take precedence - TO BE DEPRECATED
  if (
    configObj.hasOwnProperty("from") &&
    Object.keys(configObj.from).length > 0
  ) {
    pholder = Object.keys(configObj.from)[0];
  }

  // found a defaultPlaceholder. Overrwrite everything!
  if (configObj.defaultPlaceholder) {
    pholder = configObj.defaultPlaceholder;
    placeholderAliasMap = {
      [configObj.defaultPlaceholder]: "Y",
    };
  }

  const interactionTable =
    placeholderTableMap[pholder] + " " + placeholderAliasMap[pholder];

  let aliasedDefInterFilter = queryUtils.replacePlaceholderWithCustomString(
    placeholderAliasMap,
    defaultInterFilter
  );

  if (!aliasedDefInterFilter) {
    aliasedDefInterFilter = "1=1";
  }

  let sQuery: QueryObject;
  sQuery = QueryObject.format(
    "SELECT TOP 1 * FROM %UNSAFE WHERE %UNSAFE",
    interactionTable,
    aliasedDefInterFilter
  );

  return sQuery.executeQuery(connection);
};
