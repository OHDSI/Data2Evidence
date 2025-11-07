/**
 * Utilities used by query engine components.
 */
import * as utilsLib from "../../utils/utils";

export function getAlias(requestPath, placeholder: string) {
    const attributeMatch = requestPath.match(/.+\.attributes\.[^\.]+/);
    let result = null;
    switch (placeholder) {
        case "@PATIENT":
            result = "patient";
            break;
        case "@INTERACTION":
            const match = requestPath.match(/.+\.interactions\.[^\.]+\.\d+/);
            if (match) {
                result = match[0];
            }
            break;
        case "@OBS":
            if (attributeMatch) {
                result = requestPath + "$obs";
            }
            break;
        case "@CODE":
            if (attributeMatch) {
                result = requestPath + "$code";
            }
            break;
        case "@MEASURE":
            if (attributeMatch) {
                result = requestPath + "$measure";
            }
            break;
        case "@ATTRIBUTE":
            result = requestPath;
            break;
        case "@TEXT":
            if (attributeMatch) {
                result = requestPath + "$text";
            }
            break;
        default:
            throw Error("Unknown placeholder " + placeholder);
    }
    return result;
}

export function replacePlaceholderWithTables(placeholderMap: PholderTableMapType, expression: string) {
    if (!expression) {
        return null;
    }
    const placeholders = expression.match(/@[^.^\s]+/g);
    if (!placeholders) {
        return expression;
    }
    function getTableFromPholder(placeholder) {
        return placeholderMap[placeholder];
    }
    const substExpression = expression.replace(/@[^.^\s]+/g, getTableFromPholder);
    return substExpression;
}

export function replacePlaceholderWithCustomString(placeholderMap: any, expression: string) {
    if (!expression) {
        return null;
    }
    // this will return the whole placeholder (table and column name)
    const placeholders = expression.match(/@[A-Z|.|_]+/g);
    if (!placeholders) {
        return expression;
    }
    function getTableFromPholder(placeholder: string) {

        if (placeholder.indexOf(".") >= 0) {
            // there is a table and a column
            const parts = placeholder.split(".");
            const tablePart = placeholderMap[parts[0]];
            const colPart = placeholderMap[placeholder];
            return `${tablePart || parts[0]}.${colPart || parts[1]}`;
        }
        return placeholderMap[placeholder];
    }
    const substExpression = expression.replace(/@[A-Z|.|_]+/g, getTableFromPholder);
    return substExpression;
}
export function quotePlaceholders(expression: string) {
    if (!expression) {
        return null;
    }
    const placeholders = expression.match(/@[^.^\s]+/g);
    if (!placeholders) {
        return expression;
    }
    function getTableFromPholder(placeholder: string) {
        return "\"" + placeholder + "\"";
    }
    const substExpression = expression.replace(/@[^.^\s]+/g, getTableFromPholder);
    return substExpression;
}

export function replacePlaceholderAndGetUsedAliases(requestPath, expression: string) {
    if (!expression) {
        return { expression: null, aliases: [] };
    }
    const placeholders = expression.match(/@[^.^\s]+/g);
    // TODO: It is confusing, that the function returns "" for the expression if the passed SQL
    // does not include any table placeholder - seems to be a "leaked requirement" from some of
    // the function calling this function.
    if (!placeholders) {
        return { expression: "", aliases: [] };
    }
    function aliasFunc(placeholder) {
        return "\"" + getAlias(requestPath, placeholder) + "\"";
    }
    const aliases = placeholders.map(aliasFunc);
    const substExpression = expression.replace(/@[^.^\s]+/g, aliasFunc);
    return { expression: substExpression, aliases };
}

/**
 * Returns the placeholder specific for an attribute (after overriding the 'from' tables)
 */
export function getPersonalizedPlaceholderMap(mInputPholderMap, sAttributePath, oConfig) {

    const parts = sAttributePath.split(".");
    let configCursor = oConfig;
    const mOutputPholderMap = utilsLib.cloneJson(mInputPholderMap);

    for (let i = 0; i < parts.length; ++i) {

        const onePart = parts[i];
        if (configCursor[onePart]) {
            configCursor = configCursor[onePart];
            if (configCursor.from) {
                for (const placeholder in configCursor.from) {
                    if (configCursor.from.hasOwnProperty(placeholder)) {
                        mOutputPholderMap[placeholder] = configCursor.from[placeholder];
                    }
                }
            }

        } else {
            throw new Error(
                "could not find corresponding entry in configuration for: "
                + sAttributePath);
        }
    }

    return mOutputPholderMap;
}

/**
 * Returns the placeholder specific for an attribute (after overriding the 'from' tables)
 */
export function getStandardJoin({
    placeholderAliasMap,
    placeholderSettings,
    attributePath,
    jsonWalk }:
    {
        placeholderAliasMap: any;
        attributePath: string;
        placeholderSettings: PlaceholderSettingsType;
        jsonWalk: (path: string) => any[]
    }) {
    const { placeholderTableMap, tableTypePlaceholderMap } = placeholderSettings;
    const configAttrObj = jsonWalk(attributePath)[0].obj;
    const attrExpr = configAttrObj.expression;
    const defaultAttrFilter = configAttrObj.defaultFilter || "";

    const interactionPath = attributePath.replace(/\.attributes\..*/, "");
    const configInterObj = jsonWalk(interactionPath)[0].obj;
    const defaultInterFilter = configInterObj.defaultFilter || "";

    const sConcatExpressions = attrExpr + " " + defaultAttrFilter + " " + defaultInterFilter + " " + configInterObj.defaultPlaceholder;
    const aPlaceholders = sConcatExpressions.match(/@[^.^\s]+/g);

    const oPlaceholders = aPlaceholders.reduce((prevVal, currPlaceholder) => {
        prevVal[currPlaceholder] = true;
        return prevVal;
    }, {});

    let sQuery = "";

    // check if any of the attribute tables exists in oPlaceholders. if exists, then add the its parent table
    Object.keys(oPlaceholders).forEach((k) => {
        if (tableTypePlaceholderMap.factTable.attributeTables.findIndex((attr) => attr.placeholder === k) > -1) {
            oPlaceholders[tableTypePlaceholderMap.factTable.placeholder] = true;
        }
        tableTypePlaceholderMap.dimTables.forEach((dim) => {
            if (dim.attributeTables.findIndex((attr) => attr.placeholder === k) > -1) {
                oPlaceholders[dim.placeholder] = true;
            }
        });
    });

    const foundPlaceholders = Object.keys(oPlaceholders);
    const factTable = tableTypePlaceholderMap.factTable.placeholder;
    sQuery += placeholderTableMap[tableTypePlaceholderMap.factTable.placeholder] + " " + placeholderAliasMap[tableTypePlaceholderMap.factTable.placeholder];

    sQuery += tableTypePlaceholderMap.factTable.attributeTables
            .filter((attr) => foundPlaceholders.indexOf(attr.placeholder) > -1)
            .map((attr) => {
                return ` INNER JOIN ${placeholderTableMap[attr.placeholder]} ${placeholderAliasMap[attr.placeholder]}
                  ON ${placeholderAliasMap[attr.placeholder]}.${placeholderTableMap[`${attr.placeholder}.PATIENT_ID`]}
                = ${placeholderAliasMap[factTable]}.${placeholderTableMap[`${factTable}.PATIENT_ID`]}`;
            }).join(" ");

    const foundDimTables = tableTypePlaceholderMap.dimTables
        .filter((dim) => foundPlaceholders.indexOf(dim.placeholder) > -1);

    sQuery += foundDimTables
        .map((dim) => {
            const attributeJoins = dim.attributeTables
                .filter((attr) => foundPlaceholders.indexOf(attr.placeholder) > - 1)
                .map((attr) => {
                    return ` INNER JOIN ${placeholderTableMap[attr.placeholder]} ${placeholderAliasMap[attr.placeholder]}
                  ON ${placeholderAliasMap[attr.placeholder]}.${placeholderTableMap[`${attr.placeholder}.INTERACTION_ID`]}
                = ${placeholderAliasMap[dim.placeholder]}.${placeholderTableMap[`${dim.placeholder}.INTERACTION_ID`]}`;
                });

            let returnString;

            if (sQuery) {
                returnString = ` INNER JOIN ${placeholderTableMap[dim.placeholder]} ${placeholderAliasMap[dim.placeholder]}
                        ON ${placeholderAliasMap[dim.placeholder]}.${placeholderTableMap[`${dim.placeholder}.PATIENT_ID`]}=
                         ${placeholderAliasMap[factTable]}.${placeholderTableMap[`${factTable}.PATIENT_ID`]} `;
            } else {
                returnString = `${placeholderTableMap[dim.placeholder] + " " + placeholderAliasMap[dim.placeholder]}`;
            }

            return `${returnString} ${attributeJoins.join(" ")}`;
        }).join(" ");

    if (oPlaceholders["@REF"] && defaultAttrFilter) {
            const aliasDefaultAttrFilter = replacePlaceholderWithTables(placeholderAliasMap, defaultAttrFilter)
            sQuery += " INNER JOIN " + placeholderTableMap["@REF"]
                + " " + placeholderAliasMap["@REF"]
                + " ON " + aliasDefaultAttrFilter;
    }
    
    if (oPlaceholders["@TEXT"]) {
        // there should be a corresponding single dim table for @TEXT
        if (sQuery && foundDimTables.length === 1) {
            const foundDimTablePlaceholder = foundDimTables[0].placeholder;
            sQuery += " INNER JOIN " + placeholderTableMap["@TEXT"]
                + " " + placeholderAliasMap["@TEXT"]
                + " ON " + placeholderAliasMap["@TEXT"] + "." + placeholderTableMap["@TEXT.INTERACTION_ID"] + "="
                + placeholderAliasMap[foundDimTablePlaceholder] + "." + placeholderTableMap[`${foundDimTablePlaceholder}.INTERACTION_ID`];
        }
        else {
            sQuery += placeholderTableMap["@TEXT"] + " " + placeholderAliasMap["@TEXT"];
        }
    }

    return sQuery;
}

export function getColumnPlaceholdersFromExpression(expression: string): RegExpMatchArray {
    return expression.match(/\"[\w\.]+(?:\$\w+)?\"\.(?:\"\w+\")|\"[\w\.]+(?:\$\w+)?\"\.(?:\w+)/g);
}

export function getTablePlaceholdersFromExpression(expression: string): RegExpMatchArray  {
    return expression.match(/@[A-Z]+/g);
}

export function buildPlaceholderMapAliasTable(placeholderTableMap: any) {
    const aliasMap = {};

    Object.keys(placeholderTableMap).forEach((placeholder) => {
        const tablePlaceholder = getTablePlaceholdersFromExpression(placeholder)[0];
        if (!aliasMap.hasOwnProperty(tablePlaceholder)) {
            aliasMap[tablePlaceholder] = tablePlaceholder.replace("@", "ALIAS_");
        }
    });

    return aliasMap;
}

