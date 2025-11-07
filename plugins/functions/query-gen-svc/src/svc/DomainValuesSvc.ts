import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { PholderTableMapType, Settings } from "../qe/settings/Settings";
import {
    getJsonWalkFunction,
    getPersonalizedPlaceholderMap,
    replacePlaceholderWithCustomString,
} from "@alp/alp-base-utils";

export class DomainValuesSvc {
    private configAttrObj;
    private jsonWalk;
    private suggestionsLimit;
    private useRefText;
    private exprToUse: string;
    private threshold: number;
    private realPlaceholderMap;
    private attributePath: string;
    private userSpecificSettings;
    private searchQuery: string;

    constructor(config, attributePath, suggestionsLimit, searchQuery) {
        this.attributePath = attributePath;
        this.searchQuery = searchQuery;
        this.jsonWalk = getJsonWalkFunction(config);
        this.configAttrObj = this.jsonWalk(attributePath)[0].obj;
        this.suggestionsLimit =
            suggestionsLimit || this.configAttrObj.suggestionLimit || 100;
        this.useRefText = this.configAttrObj.useRefText;
        this.exprToUse = this.configAttrObj.useRefValue
            ? "referenceExpression"
            : "expression";
        this.threshold = config.chartOptions.minCohortSize;

        this.userSpecificSettings = new Settings().initAdvancedSettings(
            config.advancedSettings
        );
        let placeholderMap = this.userSpecificSettings.getPlaceholderMap();
        this.realPlaceholderMap = getPersonalizedPlaceholderMap(
            placeholderMap,
            attributePath,
            config
        );
    }

    public async generateQuery() {
        let sQuery;

        if (this.exprToUse === "referenceExpression") {
            sQuery = getDistinctValuesFromReference(
                this.configAttrObj,
                this.suggestionsLimit,
                this.useRefText,
                this.realPlaceholderMap,
                this.searchQuery
            );
        } else {
            sQuery = getDistinctValuesFromData(
                this.configAttrObj,
                this.jsonWalk,
                this.attributePath,
                this.suggestionsLimit,
                this.useRefText,
                this.userSpecificSettings,
                this.realPlaceholderMap,
                this.threshold,
                this.searchQuery
            );
        }

        return sQuery;
    }
}

function getDistinctValuesFromData(
    configAttrObj,
    jsonWalk,
    attributePath,
    suggestionsLimit,
    useRefText,
    settings: Settings,
    placeholderTableMap: PholderTableMapType,
    threshold: number,
    searchQuery: string
) {
    let attrExpr = configAttrObj.expression;
    let defaultAttrFilter = configAttrObj.defaultFilter;
    let referenceFilter = configAttrObj.referenceFilter
        ? configAttrObj.referenceFilter
        : "";

    let interactionPath = attributePath.replace(/\.attributes\..*/, "");
    let configInterObj = jsonWalk(interactionPath)[0].obj;
    let defaultInterFilter = configInterObj.defaultFilter;

    let placeholderAliasMap = <PholderTableMapType>{
        /*     "@CODE": "C",
        "@MEASURE": "C",
        "@INTERACTION": "I",
        "@OBS": "O",
        "@PATIENT": "P",*/
        "@REF": "R",
        "@TEXT": "C",
        "aliasCODE": "C",
        "aliasINTERACTION": "I",
        "aliasOBS": "O",
        "aliasPATIENT": "P",
        "aliasREF": "R",
    };

    placeholderAliasMap[settings.getFactTablePlaceholder()] = "P";
    settings.getDimTablePlaceholders().forEach((element) => {
        placeholderAliasMap[element] = "I";
    });
    settings.getPatientAttributesTablePlaceholders().forEach((element) => {
        placeholderAliasMap[element] = "O";
    });
    settings.getDimAttributesTablePlaceholders().forEach((element) => {
        placeholderAliasMap[element] = "C";
    });

    let sQuery;
    let aliasedExpr = replacePlaceholderWithCustomString(
        placeholderAliasMap,
        attrExpr
    );
    let aliasedDefAttrFilter = replacePlaceholderWithCustomString(
        placeholderAliasMap,
        defaultAttrFilter
    );
    let aliasedDefInterFilter = replacePlaceholderWithCustomString(
        placeholderAliasMap,
        defaultInterFilter
    );
    let aliasedRefFilter = replacePlaceholderWithCustomString(
        placeholderAliasMap,
        referenceFilter
    );

    let sJoins = getStandardJoin(
        placeholderAliasMap,
        settings,
        placeholderTableMap,
        attributePath,
        jsonWalk
    );

    const searchQueryWhereCondition = ` ${aliasedExpr} LIKE_REGEXPR '${searchQuery}' FLAG 'i'`;
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
    if (useRefText) {
        // if there is no reference expression, use @REF.CODE as default.
        // This shouldn't happen, though, if the config is consistent
        let referenceExpr = configAttrObj.referenceExpression
            ? configAttrObj.referenceExpression
            : `@REF.${placeholderTableMap["@REF.CODE"]}`;
        let aliasedRefExpr = replacePlaceholderWithCustomString(
            placeholderAliasMap,
            referenceExpr
        );

        if (aliasedRefFilter) {
            if (whereConditions) {
                whereConditions += " AND " + aliasedRefFilter;
            } else {
                whereConditions = aliasedRefFilter;
            }
        }

        sQuery = QueryObject.format(
            `WITH BASEQUERY AS (
                SELECT DISTINCT  ( %UNSAFE )  AS "value" , ${placeholderAliasMap["@REF"]}.%UNSAFE AS "text"
                %UNSAFE
                FROM
                ${sJoins}
                LEFT JOIN ${placeholderTableMap["@REF"]} ${placeholderAliasMap["@REF"]} ON %UNSAFE = %UNSAFE
                %UNSAFE
                %UNSAFE
                ORDER BY "value" ASC
            ), SELECTQUERY AS (
                SELECT BASEQUERY."value", BASEQUERY."text" FROM BASEQUERY
                %UNSAFE
            )
            SELECT * FROM SELECTQUERY`,
            aliasedExpr,
            placeholderTableMap["@REF.TEXT"],
            threshold > 0
                ? ` ,COUNT(DISTINCT ${placeholderAliasMap["@PATIENT"]}.
                                               ${placeholderTableMap["@PATIENT.PATIENT_ID"]}) as "gr_cnt"`
                : "",
            aliasedRefExpr,
            aliasedExpr,
            whereConditions
                ? " WHERE (" +
                      whereConditions +
                      ")" +
                      ` AND ${searchQueryWhereCondition}`
                : ` WHERE ${searchQueryWhereCondition}`,
            threshold > 0
                ? ` GROUP BY ${aliasedExpr}, ${placeholderAliasMap["@REF"]}.
                                                        ${placeholderTableMap["@REF.TEXT"]} `
                : "",
            threshold > 0 ? ` WHERE BASEQUERY."gr_cnt" >= ${threshold}` : ""
        );
    } else {
        sQuery = QueryObject.format(
            `WITH BASEQUERY AS (
                SELECT DISTINCT  ( %UNSAFE )  AS "value"
                %UNSAFE
                FROM
                ${sJoins}
                %UNSAFE
                %UNSAFE
                ORDER BY "value" ASC
            ), SELECTQUERY AS (
                SELECT BASEQUERY."value" FROM BASEQUERY
                %UNSAFE
            )
            SELECT * FROM SELECTQUERY`,
            aliasedExpr,
            threshold > 0
                ? ` ,COUNT(DISTINCT ${placeholderAliasMap["@PATIENT"]}.
                                               ${placeholderTableMap["@PATIENT.PATIENT_ID"]}) as "gr_cnt"`
                : "",
            whereConditions
                ? " WHERE (" +
                      whereConditions +
                      ")" +
                      ` AND ${searchQueryWhereCondition}`
                : ` WHERE ${searchQueryWhereCondition}`,
            threshold > 0 ? ` GROUP BY ${aliasedExpr}` : "",
            threshold > 0 ? ` WHERE BASEQUERY."gr_cnt" >= ${threshold}` : ""
        );
    }

    return sQuery;
}

/**
 * Returns the placeholder specific for an attribute (after overriding the 'from' tables)
 */
function getStandardJoin(
    placeholderAliasMap: any,
    settings: Settings,
    placeholderTableMap: any,
    sAttributePath: string,
    jsonWalk: (path: string) => any[]
) {
    let configAttrObj = jsonWalk(sAttributePath)[0].obj;
    let attrExpr = configAttrObj.expression;
    let defaultAttrFilter = configAttrObj.defaultFilter;

    let interactionPath = sAttributePath.replace(/\.attributes\..*/, "");
    let configInterObj = jsonWalk(interactionPath)[0].obj;
    let defaultInterFilter = configInterObj.defaultFilter;

    let sConcatExpressions =
        attrExpr + " " + defaultAttrFilter + " " + defaultInterFilter;
    let aPlaceholders = sConcatExpressions.match(/@[^.^\s]+/g);

    let oPlaceholders = aPlaceholders.reduce((prevVal, currPlaceholder) => {
        prevVal[currPlaceholder] = true;
        return prevVal;
    }, {});

    // make sure to have all the tables needed to connect the tables
    Object.keys(oPlaceholders).forEach((key) => {
        if (settings.getDimAttributesTablePlaceholders().indexOf(key) > -1) {
            let tmp = settings.getDimPlaceholderForAttribute(key);
            if (typeof tmp === "string") {
                oPlaceholders[tmp] = true;
            }
        }
        if (
            settings.getDimTablePlaceholders().indexOf(key) > -1 ||
            settings.getPatientAttributesTablePlaceholders().indexOf(key) > -1
        ) {
            oPlaceholders[settings.getFactTablePlaceholder()] = true;
        }
    });

    let sQuery = "";

    if (oPlaceholders[settings.getFactTablePlaceholder()]) {
        sQuery +=
            placeholderTableMap[settings.getFactTablePlaceholder()] +
            " " +
            placeholderAliasMap.aliasPATIENT;
    }

    settings.getDimTablePlaceholders().forEach((placeholder) => {
        if (oPlaceholders[placeholder]) {
            if (sQuery) {
                sQuery +=
                    " INNER JOIN " +
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasINTERACTION +
                    " ON " +
                    placeholderAliasMap.aliasINTERACTION +
                    "." +
                    placeholderTableMap[placeholder + ".PATIENT_ID"] +
                    "=" +
                    placeholderAliasMap.aliasPATIENT +
                    "." +
                    placeholderTableMap[
                        settings.getFactTablePlaceholder() + ".PATIENT_ID"
                    ];
            } else {
                sQuery +=
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasINTERACTION;
            }
        }
    });

    settings.getPatientAttributesTablePlaceholders().forEach((placeholder) => {
        if (oPlaceholders[placeholder]) {
            if (sQuery) {
                sQuery +=
                    " INNER JOIN " +
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasOBS +
                    " ON " +
                    placeholderAliasMap.aliasOBS +
                    "." +
                    placeholderTableMap[placeholder + ".PATIENT_ID"] +
                    "=" +
                    placeholderAliasMap.aliasPATIENT +
                    "." +
                    placeholderTableMap[
                        settings.getFactTablePlaceholder() + ".PATIENT_ID"
                    ];
            } else {
                sQuery +=
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasOBS;
            }
        }
    });

    settings.getDimAttributesTablePlaceholders().forEach((placeholder) => {
        if (oPlaceholders[placeholder]) {
            if (sQuery) {
                let dimPlaceholder =
                    settings.getDimPlaceholderForAttribute(placeholder);
                if (typeof dimPlaceholder !== "string") {
                    new Error("Placeholder is not a string");
                }

                sQuery +=
                    " INNER JOIN " +
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasCODE +
                    " ON " +
                    placeholderAliasMap.aliasCODE +
                    "." +
                    placeholderTableMap[placeholder + ".INTERACTION_ID"] +
                    "=" +
                    placeholderAliasMap.aliasINTERACTION +
                    "." +
                    placeholderTableMap[dimPlaceholder + ".INTERACTION_ID"];
            } else {
                sQuery +=
                    placeholderTableMap[placeholder] +
                    " " +
                    placeholderAliasMap.aliasCODE;
            }
        }
    });
    return sQuery;
}

function getDistinctValuesFromReference(
    configAttrObj,
    suggestionsLimit: number,
    useRefText,
    placeholderTableMap: PholderTableMapType,
    searchQuery: string
) {
    let attrRefExpression = configAttrObj.referenceExpression;
    let referenceFilter = configAttrObj.referenceFilter
        ? configAttrObj.referenceFilter
        : "";

    let placeholderAliasMap = <PholderTableMapType>{
        "@REF": "R",
        "@SEARCH_QUERY": searchQuery,
    };

    let sQuery;
    const aliasedRefExpression = replacePlaceholderWithCustomString(
        placeholderAliasMap,
        attrRefExpression
    );
    const aliasedRefFilter = attrRefExpression
        ? ` WHERE ${replacePlaceholderWithCustomString(
              placeholderAliasMap,
              referenceFilter
          )} `
        : "";
    const refTextSelect = useRefText
        ? ` , R.${placeholderTableMap["@REF.TEXT"]} as "text" `
        : "";

    sQuery = QueryObject.format(
        `SELECT DISTINCT  ( %UNSAFE )  AS "value" ${refTextSelect} FROM ${placeholderTableMap["@REF"]} R %UNSAFE ORDER BY "value" ASC `,
        aliasedRefExpression,
        aliasedRefFilter
    );
    return sQuery;
}
