import * as interaction_validation_service from "./interaction_validation_service";
import * as attribute_infos_service from "./attribute_infos_service";
import * as configUtils from "@alp/alp-config-utils";
import { ExpressionDefinition } from "./ExpressionDefinition";
import * as utilsLib from "../../utils/utils";
import { Settings } from "../settings/Settings";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import ErrorStorage = configUtils.errorStorage.ErrorStorage;
import { env } from "../../configs";

//////////////////////////////////////////////////////////////////////
// 						Validation function 						//
//////////////////////////////////////////////////////////////////////

export class CDWValidator {
  definition: any;
  errorStorage: ErrorStorage;
  exprDefObj: ExpressionDefinition;
  settingsObj: Settings;

  constructor(
    public connection: ConnectionInterface,
    public config: CDMConfigType
  ) {
    this.settingsObj = new Settings();
    this.errorStorage = new ErrorStorage();
    this.exprDefObj = new ExpressionDefinition(
      this.config.advancedSettings.tableMapping
    );
  }

  public async testAllAttributes(definition) {
    const configWalkFunction = utilsLib.getJsonWalkFunction(this.config);
    const interactions = configWalkFunction("**.interactions.*");
    const attributes = configWalkFunction("**.attributes.*");

    // if (interactions) {
    //     jobList = jobList.concat(interactions.map((interaction) =>
    //         (err, cb) => {
    //             this._testExecuteOneInteraction(interaction, interaction.path, this.config, definition, (err, data) => {
    //                 cb();
    //             });
    //         },
    //     ));
    // }
    // if (attributes) {
    //     jobList = jobList.concat(attributes.map((attribute) =>
    //         (err, cb) => {
    //             this._testExecuteOneAttribute(attribute, attribute.path, this.config, definition, (err, data) => {
    //                 cb();
    //             });
    //         },
    //     ));
    // }
    // MRIAsync.series(jobList, (err, data) => {
    //     callback(null, this.errorStorage.getMessages());
    // });

    await Promise.all(
      interactions.map((interaction) =>
        this._testExecuteOneInteraction(
          interaction,
          interaction.path,
          this.config,
          definition
        )
      )
    );

    await Promise.all(
      attributes.map((attribute) =>
        this._testExecuteOneAttribute(
          attribute,
          attribute.path,
          this.config,
          definition
        )
      )
    );

    return Promise.resolve(this.errorStorage.getMessages());
  }

  public validateConfiguration(definition) {
    this.config = this.config;
    this.definition = definition;
    this._validateCatalogExpressions(this.config, definition);
    this.validate(this.config, definition);
    return this.errorStorage.getMessages();
  }

  public async _testExecuteOneInteraction(
    interaction,
    interactionPath,
    config,
    definition
  ) {
    const body = {
      interactionPath,
      values: "defaultFilter",
    };

    return new Promise(async (resolve, reject) => {
      if (interaction.obj.defaultFilter) {
        try {
          await interaction_validation_service.processRequest(
            body,
            this.connection,
            this.config.advancedSettings.tableMapping,
            config
          );
        } catch (e) {
          const path = ["Config", interactionPath, "defaultFilter"].join(".");
          const error = {
            messageDefault: utilsLib.formatErrorMessage(
              e.message,
              this.settingsObj
            ),
          };
          this.errorStorage.addError(config, definition, path, error);
        }
      }
      return resolve(null);
    });
  }

  public async _testExecuteOneAttribute(attr, attrPath, config, definition) {
    let exprToUse = null;
    const useRefText = null;
    let body = null;

    return new Promise((resolve, reject) => {
      if (!attr.obj.expression) {
        return resolve(null);
      }

      exprToUse = "expression";
      body = {
        attributePath: attrPath,
        exprToUse,
        useRefText,
        config: this.config,
        validationRequest: true,
      };

      attribute_infos_service.processRequest({
        request: body,
        connection: this.connection,
        placeholderSettings: {
          placeholderTableMap: this.config.advancedSettings.tableMapping,
          tableTypePlaceholderMap:
            this.config.advancedSettings.tableTypePlaceholderMap,
        },
        callback: (err, result) => {
          try {
            if (err) {
              throw new Error(err);
            }
            const expectedType = attr.obj.type;
            if (
              result &&
              result.data[0] &&
              result.data[0].min &&
              typeof result.data[0].min !== undefined
            ) {
              const resultType = isNaN(result.data[0].min)
                ? typeof result.data[0].min
                : "number";
              if (
                expectedType === "num" &&
                resultType !== "number" &&
                result.data[0].min !== "NoValue"
              ) {
                throw new Error("Type Mismatch");
              } else if (
                expectedType === "time" &&
                resultType !== "object" &&
                isNaN(Date.parse(result.data[0].min)) &&
                result.data[0].min !== "NoValue"
              ) {
                throw new Error("Type Mismatch");
              } else if (
                expectedType === "datetime" &&
                resultType !== "object" &&
                isNaN(Date.parse(result.data[0].min)) &&
                result.data[0].min !== "NoValue"
              ) {
                throw new Error("Type Mismatch");
              }
            }
          } catch (e) {
            const path = ["Config", attrPath, exprToUse].join(".");
            const error = {
              messageDefault: utilsLib.formatErrorMessage(
                e.message,
                this.settingsObj
              ),
            };
            this.errorStorage.addError(config, definition, path, error);
          }

          if (!attr.obj.referenceExpression) {
            return resolve(result);
          }

          exprToUse = "referenceExpression";
          body = {
            attributePath: attrPath,
            exprToUse,
            useRefText,
            config,
            validationRequest: true,
          };

          attribute_infos_service.processRequest({
            request: body,
            connection: this.connection,
            placeholderSettings: {
              placeholderTableMap: this.config.advancedSettings.tableMapping,
              tableTypePlaceholderMap:
                this.config.advancedSettings.tableTypePlaceholderMap,
            },
            callback: (err, result) => {
              try {
                if (err) {
                  throw new Error(err);
                }
              } catch (e) {
                const path = ["Config", attrPath, exprToUse].join(".");
                const error = {
                  messageDefault: utilsLib.formatErrorMessage(
                    e.message,
                    this.settingsObj
                  ),
                  catalogErr: true,
                };
                this.errorStorage.addError(config, definition, path, error);
              }
              resolve(result);
            },
          });
        },
      });
    });
  }

  public _validateCatalogExpressions(config: CDMConfigType, definition) {
    const configWalkFunction = utilsLib.getJsonWalkFunction(config);
    const attributes = configWalkFunction("**.attributes.*");
    // console.log("# of attributes: " + attributes.length);
    if (attributes) {
      for (let i = 0; i < attributes.length; i++) {
        let errorMsg = null;
        let error = null;
        const attr = attributes[i];
        if (
          attr.obj.measureExpression &&
          (attr.obj.referenceFilter || attr.obj.referenceExpression)
        ) {
          // i.e. if both aggregation & catalog attributes are specified, then add error message
          errorMsg =
            "Should not configure aggregation attributes with catalog attributes.";
          error = {
            messageDefault: errorMsg,
            messageKey:
              "HPH_CFG_VALIDATION_ERROR_STRING_SHOULD_NOT_CONFIG_AGGREGATE_WITH_CATALOG_ATTRIBUTES",
          };
          // console.log(errorMsg);
        } else if (
          (attr.obj.referenceFilter || attr.obj.referenceExpression) &&
          !(attr.obj.referenceFilter && attr.obj.referenceExpression)
        ) {
          // i.e. To specify catalog attribute, both the expression & the filter should be given.
          // If NOT add error message.
          errorMsg =
            "Should configure both the expression & the filter for catalog attributes.";
          error = {
            messageDefault: errorMsg,
            messageKey:
              "HPH_CFG_VALIDATION_ERROR_STRING_SHOULD_CONFIG_EXPR_AND_FILTER_FOR_CATALOG_ATTRIBUTES",
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

  public isValidExpression(str: string) {
    return /^\s*<EXP>\s*$/.test(str);
  }

  public isValidCondition(str: string) {
    return /^\s*<COND>s*$/.test(str);
  }
  public isValidAggregation(str: string) {
    return /^\s*<AGGR>\s*$/.test(str);
  }

  public checkExpression(str: string) {
    let match;
    for (let i = 0; i < this.exprDefObj.expressions.length; i++) {
      match = str.match(this.exprDefObj.expressions[i].regex);
      if (match) {
        if (this.exprDefObj.expressions[i].hasOwnProperty("placeholder")) {
          str = str.replace(
            this.exprDefObj.expressions[i].regex,
            this.exprDefObj.expressions[i].placeholder
          );
        } else {
          let placeholder = "<EXP>";
          for (let j = 1; j < match.length; j++) {
            if (match[j] === "AGGR") {
              placeholder = "<AGGR>";
            }
          }
          str = str.replace(this.exprDefObj.expressions[i].regex, placeholder);
        }
        return this.checkExpression(str);
      }
    }
    return str;
  }

  public _createErrorUnsupportedExpressionType(
    config,
    definition,
    path,
    expected,
    actual
  ) {
    this.errorStorage.addError(config, definition, path, {
      messageKey: "HPH_CFG_VALIDATION_ERROR_UNSUPPORTED_EXPRESSION",
      messageDefault: "Expected a {0} but got a {1} instead",
      values: [expected, actual],
      expected,
      actual,
    });
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
        messageDefault:
          "String is too short. Should have atleast {0} characters, has {1}",
        values: [definition.minLength, config.length],
        configLength: config.length,
        minLength: definition.minLength,
      });
      return false;
    } else if (
      definition.maxLength ? config.length > definition.maxLength : false
    ) {
      this.errorStorage.addError(config, definition, path, {
        messageKey: "HPH_CFG_VALIDATION_ERROR_STRING_IS_TO_LONG",
        messageDefault:
          "String is too long. Should have less than {0} characters, has {1}",
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
          messageDefault: 'Value("{0}") did not match the regex("{1}")',
          values: [config, definition.regex],
          regex: definition.regex,
        });
        return false;
      }
    }

    const substitutedExpression = this.checkExpression(config.toUpperCase());

    if (
      definition.isExpression &&
      !this.isValidExpression(substitutedExpression)
    ) {
      if (this.isValidCondition(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Expression",
          "SQL-Condition"
        );
        return false;
      } else if (this.isValidAggregation(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Expression",
          "SQL-Aggregation"
        );
        return false;
      } else {
        this.errorStorage.addError(config, definition, path, {
          messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
          messageDefault: "Syntax error while validating sql-condition",
          values: [],
        });
        return false;
      }
    } else if (
      definition.isCondition &&
      !this.isValidCondition(substitutedExpression)
    ) {
      if (this.isValidExpression(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Condition",
          "SQL-Expression"
        );
        return false;
      } else if (this.isValidAggregation(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Condition",
          "SQL-Aggregation"
        );
        return false;
      } else {
        this.errorStorage.addError(config, definition, path, {
          messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
          messageDefault: "Syntax error while validating sql-condition",
          values: [],
        });
        return false;
      }
    } else if (
      definition.isAggregation &&
      !this.isValidAggregation(substitutedExpression)
    ) {
      if (this.isValidExpression(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Aggregation",
          "SQL-Expression"
        );
        return false;
      } else if (this.isValidCondition(substitutedExpression)) {
        this._createErrorUnsupportedExpressionType(
          config,
          definition,
          path,
          "SQL-Aggregation",
          "SQL-Condition"
        );
        return false;
      } else {
        this.errorStorage.addError(config, definition, path, {
          messageKey: "HPH_CFG_VALIDATION_ERROR_INVALID_SQL_EXPRESSION_SYNTAX",
          messageDefault: "Syntax error while validating sql-condition",
          values: [],
        });
        return false;
      }
    }
    return true;
  }

  //Below are copied code from Validator in qe-config

  public validateNumber(config, definition, path) {
    let valid = true;
    const element = path
      ? path.split(".")[path.split(".").length - 1]
      : "unknown";
    if (definition.isInteger && parseInt(config, 10) !== config) {
      this.errorStorage.addError(config, definition, path, {
        messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_IS_NOT_AN_INTEGER",
        messageDefault: "Should be an integer",
        values: [],
      });
      valid = false;
    }
    if (
      typeof definition.rangeMin === "number" &&
      config < definition.rangeMin
    ) {
      this.errorStorage.addError(config, definition, path, {
        messageKey: "HPH_CFG_VALIDATION_ERROR_NUMBER_IS_TO_SMALL",
        messageDefault: "Should be greater than {0}",
        values: [definition.rangeMin],
        minRange: definition.rangeMin,
      });
      valid = false;
    }
    if (
      typeof definition.rangeMax === "number" &&
      config > definition.rangeMax
    ) {
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

  public validateObject(config, definition, path) {
    this.areMandatoryChildrenSpecified(config, definition, path);

    const childNames = Object.keys(config);
    let child;
    let childDefinitions;
    let currentPath;
    let valid = true;
    if (definition.children && definition.children.length > 0) {
      for (let i = 0; i < childNames.length; i++) {
        currentPath = path + "." + childNames[i];
        child = config[childNames[i]];
        childDefinitions = definition.children.filter((childDef) => {
          return (
            childDef.name === childNames[i] ||
            (childDef.nameRegex &&
              new RegExp(childDef.nameRegex).test(childNames[i]))
          );
        });
        if (childDefinitions.length === 0) {
          if (definition.strict) {
            this.errorStorage.addError(config, definition, path, {
              messageKey:
                "HPH_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_DEFINED_IN_STRICT_OBJECT",
              messageDefault:
                "Attribute has not been defined in a strict object: {0}",
              values: [childNames[i]],
              attributeName: childNames[i],
            });
            valid = false;
          } else {
            continue;
          }
        } else if (childDefinitions.length === 1) {
          this.validate(child, childDefinitions[0], currentPath);
        } else {
          this.errorStorage.addError(config, definition, path, {
            messageKey:
              "HPH_CFG_VALIDATION_ERROR_ATTRIBUTE_MATCHES_MULTIPLE_DEFINITIONS",
            messageDefault:
              "There is more than one definition for element: {0}",
            values: [childNames[i]],
            attributeName: childNames[i],
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

    let currentPath = path;
    if (definition.minLength ? config.length < definition.minLength : false) {
      this.errorStorage.addError(config, definition, path, {
        messageKey: "HPH_CFG_VALIDATION_ERROR_ARRAY_IS_TO_SMALL",
        messageDefault:
          "Array has too less elements. Should have atleast {0} elements, has {1}",
        values: [definition.minLength, config.length],
        configLength: config.length,
        minLength: definition.minLength,
      });
      valid = false;
    } else if (
      definition.maxLength ? config.length > definition.maxLength : false
    ) {
      this.errorStorage.addError(config, definition, path, {
        messageKey: "HPH_CFG_VALIDATION_ERROR_ARRAY_IS_TO_LARGE",
        messageDefault:
          "Array has too much elements. Should have less than {0} elements, has {1}",
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
      valid = false;
    }
    return valid;
  }

  public validate(config: CDMConfigType, definition, path = "Config"): boolean {
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
      //return true;
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
        addMessageFunction = this.errorStorage.addWarning.bind(
          this.errorStorage
        );
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
        for (let j = 0; j < definition.rules[i].defines.length; j++) {
          addMessageFunction(
            config,
            definition,
            path + "." + definition.rules[i].defines[j],
            {
              messageKey: definition.rules[i].messageKey,
              messageDefault: definition.rules[i].name,
              values: [],
              ruleName: definition.rules[i].name,
              rule: rules[i],
            }
          );
        }
      }
    }
  }

  public getTypeOf(obj) {
    if (Object.prototype.toString.call(obj) === "[object Array]") {
      return "array";
    }
    return typeof obj;
  }

  public getMandatoryChildren(definition) {
    if (definition.children) {
      return definition.children.filter((obj) => !!obj.mandatory);
    } else {
      return [];
    }
  }

  public areMandatoryChildrenSpecified(config, definition, path) {
    const mandatoryChildren = this.getMandatoryChildren(definition);
    let mandatoryChild;
    let child;
    let regex;
    let foundMandatoryChild;
    let currentPath;
    let valid = true;
    let messageKey = "HPH_CFG_VALIDATION_ERROR_MANDATORY_ATTRIBUTE_MISSING";
    let addMessageFunction = this.errorStorage.addError.bind(this.errorStorage);
    for (let i = 0; i < mandatoryChildren.length; i++) {
      mandatoryChild = mandatoryChildren[i];
      if (
        mandatoryChild.hasOwnProperty("name") &&
        !config.hasOwnProperty(mandatoryChild.name)
      ) {
        currentPath = path + "." + mandatoryChild.name;

        if (mandatoryChild.mandatoryWarn) {
          messageKey = "HPH_CFG_VALIDATION_WARNING_MANDATORY_ATTRIBUTE_MISSING";
          addMessageFunction = this.errorStorage.addWarning.bind(
            this.errorStorage
          );
        } else {
          addMessageFunction = this.errorStorage.addError.bind(
            this.errorStorage
          );
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
            messageDefault:
              "Could not find any attribute matching the mandatory attribute regex: {0}",
            values: [mandatoryChild.nameRegex],
            nameRegex: mandatoryChild.nameRegex,
          });
          valid = false;
        }
      }
    }
    return valid;
  }
}
