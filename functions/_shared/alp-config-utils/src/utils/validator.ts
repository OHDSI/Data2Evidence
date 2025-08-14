// import { ExpressionDefinition } from "./expressionDefinition";
import { utils } from "@alp/alp-base-utils";
import { Connection } from "@alp/alp-base-utils";
// import { Settings } from "../../../qe/settings/Settings";
import { Logger } from "@alp/alp-base-utils";
import * as errorStorageLib from "./errorStorage";

// let settingsObj: any;
// let exprDefObj: ExpressionDefinition;

//////////////////////////////////////////////////////////////////////
//                         Validation function                         //
//////////////////////////////////////////////////////////////////////
// let connection: Connection.ConnectionInterface;

export class Validator {
    public definition: any;
    public config: any;
   // exprDefObj: ExpressionDefinition;
    // settingsObj: any;
    public connection: Connection.ConnectionInterface;
    public errorStorage: any;
    constructor(connection: Connection.ConnectionInterface) {
        this.errorStorage = new errorStorageLib.ErrorStorage();
        this.connection = connection;
        // this.settingsObj = settings;
        // this.exprDefObj = new ExpressionDefinition(placeholderMap);
    }

    public validateConfiguration(config, definition) {
        this.config = config;
        this.definition = definition;
        this.validateCatalogExpressions(config, definition);
        this.validate(config, definition, null);
        return this.errorStorage.getMessages();
    }

    /*testAllAttributes(config, definition) {
        // new utilsLib.Connection($.hdb.getConnection()); #pure_node

        let configWalkFunction = getJsonWalkFunction(config);
        let attributes = configWalkFunction("**.attributes.*");

        if (attributes) {
            for (let attribute of attributes) {
                this._testExecuteOneAttribute(attribute, attribute.path, config, definition, this.connection, this.settingsObj.getPlaceholderMap());
            }
        }

        return this.errorStorage.getMessages();
    }*/

    public _testExecuteOneAttribute(attr, attrPath, config, definition, connection, placeholderTableMap) {
        let exprToUse = null;
        const useRefText = null;
        let body = null;
        const that = this;

        if (attr.obj.expression) {
            exprToUse = "expression";
        } else if (attr.obj.referenceExpression) {
            exprToUse = "referenceExpression";
        }

        body = {
            attributePath: attrPath,
            exprToUse,
            useRefText,
            config,
            validationRequest: true,
        };

        /* if (exprToUse) {
             try {
                 attribute_infos_service.processRequest(body, connection, placeholderTableMap,  (err, result) => {
                     let expectedType = attr.obj.type;
                     if (result && result.data[0] && result.data[0].min && typeof result.data[0].min !== undefined) {
                         let resultType = typeof result.data[0].min;
                         if (expectedType === "num" && resultType !== "number" && result.data[0].min !== "NoValue") {
                             throw new Error("Type Mismatch");
                         } else if (expectedType === "time" && resultType !== "object" && (isNaN(Date.parse(result.data[0].min)))
                            && result.data[0].min !== "NoValue") {
                                throw new Error("Type Mismatch");
                         } else if (expectedType === "datetime" && resultType !== "object" && (isNaN(Date.parse(result.data[0].min)))
                            && result.data[0].min !== "NoValue") {
                                throw new Error("Type Mismatch");
                         }
                     }
                 });
             } catch (e) {
                 let path = ["Config", attrPath, exprToUse].join(".");
                 let error = { messageDefault: formatErrorMessage(e.message, this.settingsObj) };
                 that.errorStorage.addError(config, definition, path, error);
             }
         }*/
    }

    public validateCatalogExpressions(config, definition) {
        const configWalkFunction = utils.getJsonWalkFunction(config);
        const attributes = configWalkFunction("**.attributes.*");
        // console.log("# of attributes: " + attributes.length);

        if (attributes) {
            for (const attr of attributes) {
                let errorMsg = null;
                let error = null;
                if (attr.obj.measureExpression && (attr.obj.referenceFilter || attr.obj.referenceExpression)) {
                    // i.e. if both aggregation & catalog attributes are specified,
                    // then add error message.
                    errorMsg = "Should not configure aggregation attributes with catalog attributes.";
                    error = {
                        messageDefault: errorMsg,
                        messageKey: "HPH_CFG_VALIDATION_ERROR_STRING_SHOULD_NOT_CONFIG_AGGREGATE_WITH_CATALOG_ATTRIBUTES",
                    };
                    // console.log(errorMsg);
                } else if ((attr.obj.referenceFilter || attr.obj.referenceExpression) && !(attr.obj.referenceFilter && attr.obj.referenceExpression)) {
                    // i.e. To specify catalog attribute, both the expression & the filter should be given.
                    // If NOT add error message.
                    errorMsg = "Should configure both the expression & the filter for catalog attributes.";
                    error = {
                        messageDefault: errorMsg,
                        messageKey: "HPH_CFG_VALIDATION_ERROR_STRING_SHOULD_CONFIG_EXPR_AND_FILTER_FOR_CATALOG_ATTRIBUTES",
                    };
                    // console.log(errorMsg);
                }

                const path = ["Config", attr.path, "referenceExpression"].join(".");
                // console.log("path: " + path);
                if (error) {
                    this.errorStorage.addError(config, definition, path, error);
                }
            }
        }
    }

    public validate(config, definition, path) {
        path = path || "Config";

        try {
            const configType = this.getTypeOf(config);
            if (!this.isTypeMatchingDefinition(config, definition, path)) {
                return false;
            }
            if (definition.hasOwnProperty("rules")) {
                this.runRuleValidation(config, definition, path);
            }
            switch (configType) {
                case "object":
                    return this.validateObject(config, definition, path);
                case "array":
                    return this.validateArray(config, definition, path);
                case "string":
                    return this.validateString(config, definition, path);
                case "number":
                    return this.validateNumber(config, definition, path);
                case "boolean":
                    return this.validateBoolean(config, definition, path);
                default:
                    this.errorStorage.addError(config, definition, path, {
                        messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_OBJECT_TYPE",
                        messageDefault: "Datatype is not supported: {0}",
                        values: [configType],
                        given: configType,
                        expected: ["object", "array", "string", "number", "boolean"],
                    });
                    return false;
            }
            // return true;
        } catch (error) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_UNEXPECTED_ERROR",
                messageDefault: "Unexpected error occured while validating path: {0}",
                values: [path],
                error,
            });
            return false;
        }
    }

    public isTypeMatchingDefinition(config, definition, path) {
        const configType = this.getTypeOf(config);
        if (configType !== definition.type) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_OBJECT_TYPE_DOES_NOT_MATCH",
                messageDefault: "{0} has wrong type: expected {1}",
                values: [definition.name || "Object", definition.type],
                name: definition.name || "Object",
                expectedType: definition.type,
                actualType: configType,
            });
            return false;
        }
        return true;
    }

    public runRuleValidation(config, definition, path) {
        const rules = definition.rules.map((element) => element.rule);
        let result = [];
        let addMessageFunction;

        // for all rules do:
        for (let i = 0; i < rules.length; i++) {

            // run rule validation
            result = rules[i].getObjects(config);
            if (result.length === 1) {
                if (result[0]) {
                    continue;
                }
            }

            if (definition.rules[i].isWarning) {
                addMessageFunction = this.errorStorage.addWarning.bind(this.errorStorage);
            } else {
                addMessageFunction = this.errorStorage.addError.bind(this.errorStorage);
            }

            if (!definition.rules[i].defines) {
                addMessageFunction(config, definition, path, {
                    messageKey: definition.rules[i].messageKey,
                    messageDefault: definition.rules[i].name,
                    values: [],
                    ruleName: definition.rules[i].name,
                    rule: rules[i],
                });
            } else {
                for (const define of definition.rules[i].defines) {
                    addMessageFunction(config, definition, path + "." + define, {
                        messageKey: definition.rules[i].messageKey,
                        messageDefault: definition.rules[i].name,
                        values: [],
                        ruleName: definition.rules[i].name,
                        rule: rules[i],
                    });
                }
            }
        }
    }

    public getTypeOf(obj) {
        if (Object.prototype.toString.call(obj) === "[object Array]") {
            return "array";
        }
        return typeof (obj);
    }

    public getMandatoryChildren(definition) {
        if (definition.children) {
            return definition.children.filter((obj) => {
                return !!obj.mandatory;
            });
        } else {
            return [];
        }
    }

    public areMandatoryChildrenSpecified(config, definition, path) {
        const mandatoryChildren = this.getMandatoryChildren(definition);
        let child;
        let regex;
        let foundMandatoryChild;
        let currentPath;
        let valid = true;
        let messageKey = "HPH_CFG_VALIDATION_ERROR_MANDATORY_ATTRIBUTE_MISSING";
        let addMessageFunction = this.errorStorage.addError.bind(this.errorStorage);
        for (const mandatoryChild of mandatoryChildren) {
            if (mandatoryChild.hasOwnProperty("name") && !config.hasOwnProperty(mandatoryChild.name)) {
                currentPath = path + "." + mandatoryChild.name;

                if (mandatoryChild.mandatoryWarn) {
                    messageKey = "HPH_CFG_VALIDATION_WARNING_MANDATORY_ATTRIBUTE_MISSING";
                    addMessageFunction = this.errorStorage.addWarning.bind(this.errorStorage);
                } else {
                    addMessageFunction = this.errorStorage.addError.bind(this.errorStorage);
                }

                addMessageFunction(config, definition, currentPath, {
                    messageKey,
                    messageDefault: "Mandatory attribute is not specified: {0}",
                    values: [mandatoryChild.name],
                    attrName: mandatoryChild.name,
                });
                valid = false;

            } else if (mandatoryChild.hasOwnProperty("nameRegex")) {
                regex = new RegExp(mandatoryChild.nameRegex);
                foundMandatoryChild = false;
                for (child in config) {
                    if (regex.test(child)) {
                        foundMandatoryChild = true;
                    }
                }
                if (!foundMandatoryChild) {
                    this.errorStorage.addError(config, definition, path, {
                        messageKey: "HPH_CFG_NO_ATTRIBUTE_MATCHED_MANDATORY_CRITERIA",
                        messageDefault: "Could not find any attribute matching the mandatory attribute regex: {0}",
                        values: [mandatoryChild.nameRegex],
                        nameRegex: mandatoryChild.nameRegex,
                    });
                    valid = false;

                }
            }
        }
        return valid;
    }

    public validateObject(config, definition, path) {
        this.areMandatoryChildrenSpecified(config, definition, path);

        const childNames = Object.keys(config);
        let child;
        let childDefinitions;
        let currentPath;
        let valid = true;
        if (definition.children && definition.children.length > 0) {
            for (const cname of childNames) {
                currentPath = path + "." + cname;
                child = config[cname];
                childDefinitions = definition.children.filter((childDef) => {
                    return (childDef.name === cname ||
                        (childDef.nameRegex && (new RegExp(childDef.nameRegex)).test(cname)));
                });
                if (childDefinitions.length === 0) {
                    if (definition.strict) {
                        this.errorStorage.addError(config, definition, path, {
                            messageKey: "HPH_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_DEFINED_IN_STRICT_OBJECT",
                            messageDefault: "Attribute has not been defined in a strict object: {0}",
                            values: [cname],
                            attributeName: cname,
                        });
                        valid = false;
                    } else {
                        continue;
                    }

                } else if (childDefinitions.length === 1) {
                    this.validate(child, childDefinitions[0], currentPath);
                } else {
                    this.errorStorage.addError(config, definition, path, {
                        messageKey: "HPH_CFG_VALIDATION_ERROR_ATTRIBUTE_MATCHES_MULTIPLE_DEFINITIONS",
                        messageDefault: "There is more than one definition for element: {0}",
                        values: [cname],
                        attributeName: cname,
                    });
                    valid = false;
                }

            }

        } else if (childNames.length > 0 && definition.strict) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_OBJECT_IS_NOT_EMPTY",
                messageDefault: "Object should not have any attributes. Has {0}",
                values: [childNames.length],
                attributeCount: childNames.length,
            });
            valid = false;
        }
        return valid;
    }

    public validateArray(config, definition, path) {
        let valid = true;
        let currentPath = path;

        if (!Array.isArray(config)) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_OBJECT_TYPE",
                messageDefault: "Datatype is not supported: {0}",
                values: [typeof config],
                given: typeof config,
                expected: "array",
            });
            return false;
        }

        if (definition.minLength ? config.length < definition.minLength : false) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_ARRAY_IS_TO_SMALL",
                messageDefault: "Array has too less elements. Should have atleast {0} elements, has {1}",
                values: [definition.minLength, config.length],
                configLength: config.length,
                minLength: definition.minLength,
            });
            valid = false;

        } else if (definition.maxLength ? config.length > definition.maxLength : false) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_ARRAY_IS_TO_LARGE",
                messageDefault: "Array has too much elements. Should have less than {0} elements, has {1}",
                values: [definition.maxLength, config.length],
                configLength: config.length,
                maxLength: definition.maxLength,
            });
            valid = false;
        }

        if (definition.children.length === 1) {
            for (let i = 0; i < config.length; i++) {
                currentPath = path + "." + i;
                this.validate(config[i], definition.children[0], currentPath);
            }
        } else {
            const e = new Error("definition does not support multiple child definitions for an array. Error occured while evaluating: " + path);
            Logger.CreateLogger("config-util-log").error(e);
            valid = false;
        }
        return valid;

    }

    public validateString(config, definition, path) {
        if (typeof config !== "string") {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_OBJECT_TYPE",
                messageDefault: "Datatype is not supported: {0}",
                values: [typeof config],
                given: typeof config,
                expected: "string",
            });
            return false;
        }

        if (definition.minLength ? config.length < definition.minLength : false) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_STRING_IS_TO_SHORT",
                messageDefault: "String is too short. Should have atleast {0} characters, has {1}",
                values: [definition.minLength, config.length],
                configLength: config.length,
                minLength: definition.minLength,
            });
            return false;
        } else if (definition.maxLength ? config.length > definition.maxLength : false) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_STRING_IS_TO_LONG",
                messageDefault: "String is too long. Should have less than {0} characters, has {1}",
                values: [definition.maxLength, config.length],
                configLength: config.length,
                maxLength: definition.maxLength,
            });
            return false;
        }
        if (definition.hasOwnProperty("regex")) {
            const reg = new RegExp(definition.regex);
            if (!reg.test(config)) {
                this.errorStorage.addError(config, definition, path, {
                    messageKey: "HPH_CFG_VALIDATION_ERROR_VALUE_DID_NOT_MATCH_CRITERTIA",
                    messageDefault: "Value(\"{0}\") did not match the regex(\"{1}\")",
                    values: [config, definition.regex],
                    regex: definition.regex,
                });
                return false;
            }
        }

        // let substitutedExpression = this.checkExpression(config.toUpperCase());

        /*if (definition.isExpression && !this.isValidExpression(substitutedExpression)) {
            if (this.isValidCondition(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Expression", "SQL-Condition");
                return false;
            } else if (this.isValidAggregation(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Expression", "SQL-Aggregation");
                return false;
            } else {
                this.errorStorage.addError(config, definition, path, {
                    messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
                    messageDefault: "Syntax error while validating sql-condition",
                    values: [],
                });
                return false;
            }
        } else if (definition.isCondition && !this.isValidCondition(substitutedExpression)) {
            if (this.isValidExpression(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Condition", "SQL-Expression");
                return false;
            } else if (this.isValidAggregation(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Condition", "SQL-Aggregation");
                return false;
            } else {
                this.errorStorage.addError(config, definition, path, {
                    messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
                    messageDefault: "Syntax error while validating sql-condition",
                    values: [],
                });
                return false;
            }
        } else if (definition.isAggregation && !this.isValidAggregation(substitutedExpression)) {
            if (this.isValidExpression(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Aggregation", "SQL-Expression");
                return false;

            } else if (this.isValidCondition(substitutedExpression)) {
                this._createErrorUnsupportedExpressionType(config, definition, path, "SQL-Aggregation", "SQL-Condition");
                return false;

            } else {
                this.errorStorage.addError(config, definition, path, {
                    messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
                    messageDefault: "Syntax error while validating sql-condition",
                    values: [],
                });
                return false;
            }
        }*/
        return true;
    }

    public _createErrorUnsupportedExpressionType(config, definition, path, expected, actual) {
        this.errorStorage.addError(config, definition, path, {
            messageKey: "HPH_CFG_VALIDATION_ERROR_UNSUPPORTED_EXPRESSION",
            messageDefault: "Expected a {0} but got a {1} instead",
            values: [expected, actual],
            expected,
            actual,
        });
    }
    public validateNumber(config, definition, path) {
        let valid = true;
        const element = path ? path.split(".")[path.split(".").length - 1] : "unknown";
        if (definition.isInteger && parseInt(config, 10) !== config) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_IS_NOT_AN_INTEGER",
                messageDefault: "Should be an integer",
                values: [],
            });
            valid = false;
        }
        if (typeof (definition.rangeMin) === "number" && config < definition.rangeMin) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_IS_TO_SMALL",
                messageDefault: "Should be greater than {0}",
                values: [definition.rangeMin],
                minRange: definition.rangeMin,
            });
            valid = false;
        }
        if (typeof (definition.rangeMax) === "number" && config > definition.rangeMax) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_IS_TO_BIG",
                messageDefault: "Should be less than {0}",
                values: [definition.rangeMax],
                maxRange: definition.rangeMax,
            });
            valid = false;
        }
        if (definition.notZero && config === 0) {
            this.errorStorage.addError(config, definition, path, {
                messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_SHOULD_NOT_BE_ZERO",
                messageDefault: "Should not be 0",
                values: [],
            });
            valid = false;
        }
        return valid;
    }

    public validateBoolean(config, definition, path) {
        return true;
    }
    public isValidExpression(mystring) {
        return /^\s*<EXP>\s*$/.test(mystring);
    }
    public isValidCondition(mystring) {
        return /^\s*<COND>\s*$/.test(mystring);
    }
    public isValidAggregation(mystring) {
        return /^\s*<AGGR>\s*$/.test(mystring);
    }

    /*checkExpression(mystring) {
        let match;
        for (let expr of this.exprDefObj.expressions) {
            match = mystring.match(expr.regex);
            if (match) {
                if (expr.hasOwnProperty("placeholder")) {
                    mystring = mystring.replace(expr.regex, expr.placeholder);
                } else {
                    let placeholder = "<EXP>";
                    for (let j = 1; j < match.length; j++) {
                        if (match[j] === "AGGR") {
                            placeholder = "<AGGR>";
                        }
                    }
                    mystring = mystring.replace(expr.regex, placeholder);
                }
                return this.checkExpression(mystring);
            }
        }
        return mystring;
    }*/
}
