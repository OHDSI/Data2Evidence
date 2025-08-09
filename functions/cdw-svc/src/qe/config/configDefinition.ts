import { ruleValidator as rulesLib } from "@alp/alp-config-utils";
import { getTablePlaceholdersFromExpression } from "../utils/queryutils";
export const allowedPlaceholderRegex =
  /^((((?!(_SYS|SYS|SYSTEM|HANA_XS_BASE))(\w+)|(_SYS_BIC))|("((?!(_SYS|SYS|SYSTEM|HANA_XS_BASE))([^\]]+)|(_SYS_BIC))"))\."([^"]*)")|^("([^"]*)")$/i;

export function getDefinition(tableMapping: any) {
  const sPlaceholders = Object.keys(tableMapping)
    .map((key) => {
      const found = getTablePlaceholdersFromExpression(key);
      if (!found) {
        return null;
      }
      if (found.length === 1) {
        return found[0];
      }
    })
    .filter((key) => key !== null)
    .reduce((list, currentKey) => {
      if (list.indexOf(currentKey) === -1) {
        list.push(currentKey);
      }
      return list;
    }, [])
    .map((key) => key.replace("@", ""))
    .join("|");

  //////////////////////////////////////////////////////////////////////
  // 					Definition for valid Configs 					//
  //////////////////////////////////////////////////////////////////////

  /*

	ObjectDescription:
		Parameter:
			name: string,
			nameRegex: regexString, 							// checks name attribute of objects in array
			type: "array"|"object"|"string"|"number"|"boolean",
			minLength: false|integer (default: false),			// min length of array/string
			maxLength: false|integer (default: false),			// max length of array/string
			mandatoryWarn: boolean,								// checks if a warning should be returned
			mandatory: boolean,
			regex: regexString, 								// checks value of string objects

			children: ObjectDescription[],
			strict: boolean,									// all attributes have to be declared in "children" parameter
			rules: {
				name: String,
				messageKey: String,								// i18n translation id
				rule: Rule,
				isWarning: boolean (default: false),			// a warning won't prevent saving/activation
				defines: String[]     							// relative path to child, that is causing this rule to fail.
			}[],
			isExpression: boolean, 								// is sql expression (e.g. SUBSTR(@CODE.CODE,0,3))
			isAggregation: boolean, 							// is sql aggregation (e.g. count(*))
			isCondition: boolean, 								// is sql condition (e.g. @PATIENT.PID < 400)
			isInteger: boolean,									// checks if number is an integer
			rangeMin: number,									// checks if number is greater than the given value
			rangeMax: number,									// checks if number is less than the given value
			notZero: boolean									// checks if number is not 0
	Rule:
		Components:
			RuleValidatorBase(dataSource)  						// abstract
			UniqueValidation(dataSource) 						// checks if all the values are unique
			BaseSelector(dataSource)	 						// returns object parameters as an object
			PropertySelector(dataSource, property)				// returns the property with the name "property" in an array
			ChildPropertySelector(dataSource, property)			// returns the properties with the name "property" of all children
			BaseValidation(dataSource)							// abstract
			CompareValueValidation(dataSource, mode, value) 	// compares each element with the value. modes: eq,lt,le,gt,ge,ne
			CountSelector(dataSource)							// returns the count of all true-like values
			BinaryOperator(datasource[])						// abstract. takes up to two datasources
			OrOperator(dataSource[])							// checks if one of the dataSources provides a true-like element
			AndOperator(dataSource[])							// checks if the dataSources provides only true-like elements

	Layout of our config:

		---------------------------------------------------------
		| Vailed Definition -> Patient                          |
		---------------------------------------------------------
			|				|				|
			v 				|				|
		  --------------	|				|
		  | Conditions |	|				|
		  --------------	v 				|
					|	----------------	|
					--->| Interactions |	|
						----------------	v
								|	|	-------------
								|	--->| Attributes |
								|		-------------
								|				|	  -----------
								|				----> | Name 	|
								--------------------> -----------
	*/
  const disabledNameObject = {
    name: "disabledLangName",
    mandatory: false,
    type: "array",
    minLength: false,
    maxLength: false,
    strict: true,
    rules: [
      {
        name: "Each language can only be defined once",
        messageKey: "HPH_CDM_CFG_VALID_MULTIPLE_LANG",
        rule: new rulesLib.UniqueValidation(
          new rulesLib.ChildPropertySelector(
            new rulesLib.BaseSelector(),
            "lang"
          )
        ),
      },
    ],
    children: [
      {
        type: "object",
        children: [
          {
            name: "lang",
            mandatory: true,
            type: "string",
            regex: "^$|^[a-zA-Z]{2}$",
          },
          {
            name: "value",
            mandatory: true,
            type: "string",
            minLength: 0,
          },
        ],
      },
    ],
  };

  const nameObject = {
    name: "name",
    mandatory: true,
    type: "array",
    minLength: 1,
    maxLength: false,
    strict: true,
    rules: [
      {
        // There is exactly one entry with a default name ('lang': '')
        name: "There should be exactly one entry for the default name",
        messageKey:
          "HPH_CDM_CFG_VALIDATION_ERROR_DEFAULT_NAME_AMBIGUOUSLY_DEFINED",
        rule: new rulesLib.CompareValueValidation(
          new rulesLib.CountSelector(
            new rulesLib.CompareValueValidation(
              new rulesLib.ChildPropertySelector(
                new rulesLib.BaseSelector(),
                "lang"
              ),
              "eq",
              ""
            )
          ),
          "eq",
          1
        ),
      },
      {
        // Each entry has a unique language key
        name: "Each language can only be defined once",
        messageKey: "HPH_CDM_CFG_VALID_MULTIPLE_LANG",
        rule: new rulesLib.UniqueValidation(
          new rulesLib.ChildPropertySelector(
            new rulesLib.BaseSelector(),
            "lang"
          )
        ),
      },
    ],
    children: [
      {
        type: "object",
        children: [
          {
            name: "lang",
            mandatory: true,
            type: "string",
            regex: "^$|^[a-zA-Z]{2}$",
          },
          {
            name: "value",
            mandatory: true,
            type: "string",
            regex: "^.*\\S.*$", // containes non whitespace characters
            minLength: 1,
          },
        ],
      },
    ],
  };

  const parentInteractionsMappingObject = {
    name: "parentInteractionsMapping",
    mandatory: false,
    type: "array",
    strict: true,
    children: [
      {
        type: "object",
        children: [
          {
            name: "currentMappingInteractionId",
            mandatory: false,
            type: "string",
            isExpression: true,
            regex: "@(" + sPlaceholders + ')\\.("(?:(?:"")|[^"])+"|[a-zA-Z0-9_]+)',
          },
          {
            name: "parentMappingInteraction",
            mandatory: false,
            type: "string",
            isExpression: false,
            regex: "^@(" + sPlaceholders + ")$",
          },
        ],
      },
    ],
  };

  const attributesObject = {
    name: "attributes",
    mandatory: true,
    type: "object",
    strict: true,
    children: [
      {
        nameRegex: "(?!^\\d+$)^[0-9a-zA-Z_]+$",
        //nameRegex:"[0-9a-zA-Z_]+_[0-9a-f]{8,8}_[0-9a-f]{4,4}_[0-9a-f]{4,4}_[0-9a-f]{4,4}_[0-9a-f]{12,12}$",
        mandatory: false,
        strict: true,
        type: "object",
        rules: [
          {
            // expression or measureExpression has to be defined
            name: 'Either "expression" or "measureExpression" has to be defined',
            messageKey: "HPH_CDM_CFG_VALID_EMPTY_EXPRESSION",
            rule: new rulesLib.OrOperator([
              new rulesLib.PropertySelector(undefined, "expression"),
              new rulesLib.PropertySelector(undefined, "measureExpression"),
            ]),
            defines: ["expression", "measureExpression"],
          },
        ],
        children: [
          nameObject,
          disabledNameObject,
          {
            name: "from",
            type: "object",
            mandatory: false,
            strict: true,
            children: [
              {
                nameRegex: "^@(" + sPlaceholders + ")$",
                type: "string",
                mandatory: false,
                regex: allowedPlaceholderRegex,
              },
            ],
          },
          {
            name: "expression",
            mandatory: false,
            type: "string",
            isExpression: true,
            regex:
              "@(" + sPlaceholders + ')\\.("(?:(?:"")|[^"])+"|[a-zA-Z0-9_]+)',
            rules: [
              {
                name: "Use LEFT instead of SUBSTR where possible",
                messageKey: "HPH_CDM_CFG_VALID_SUBSTR_WARN",
                isWarning: true,
                rule: new rulesLib.CompareValueValidation(
                  undefined,
                  "notContains",
                  "SUBSTR"
                ),
              },
            ],
          },
          {
            name: "defaultFilter",
            mandatory: false,
            type: "string",
            isCondition: true,
          },
          {
            name: "eavExpressionKey",
            mandatory: false,
            type: "string",
          },
          {
            name: "eavExpressionFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "relationExpressionKey",
            mandatory: false,
            type: "string",
          },
          {
            name: "relationExpressionFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "relationExpressionPatientKey",
            mandatory: false,
            type: "string",
          },
          {
            name: "relationExpressionPatientFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "measureExpression",
            mandatory: false,
            type: "string",
            isAggregation: true,
          },
          {
            name: "type",
            type: "string",
            mandatory: true,
            regex:
              "^(num)$|^(text)$|^(time)$|^(freetext)$|^(datetime)|^(conceptSet)$",
          },
          {
            name: "referenceFilter",
            mandatory: false,
            type: "string",
            isCondition: true,
          },
          {
            name: "referenceExpression",
            mandatory: false,
            type: "string",
            isExpression: true,
            regex:
              "@(" + sPlaceholders + ')\\.("(?:(?:"")|[^"])+"|[a-zA-Z0-9_]+)',
          },
          {
            name: "_referenceFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "_referenceExpression",
            mandatory: false,
            type: "string",
          },
          {
            name: "otsLanguage",
            mandatory: false,
            type: "string",
          },
          {
            name: "otsSubject",
            mandatory: false,
            type: "string",
          },
          {
            name: "otsHierarchyLevel",
            mandatory: false,
            type: "string",
          },
          {
            name: "otsTermContext",
            mandatory: false,
            type: "string",
          },
          {
            name: "_otsLanguage",
            mandatory: false,
            type: "string",
          },
          {
            name: "_otsSubject",
            mandatory: false,
            type: "string",
          },
          {
            name: "_otsHierarchyLevel",
            mandatory: false,
            type: "string",
          },
          {
            name: "_otsTermContext",
            mandatory: false,
            type: "string",
          },
          {
            name: "order",
            mandatory: false,
            type: "number",
            rangeMin: 0,
            isInteger: true,
          },
          {
            name: "fuzziness",
            mandatory: false,
            type: "number",
            rangeMin: 0,
            rangeMax: 1,
          },
          {
            name: "annotations",
            type: "array",
            mandatory: false,
            strict: false,
            children: [
              {
                type: "string",
                mandatory: false,
              },
            ],
          },
          {
            name: "isDefault",
            mandatory: false,
            type: "boolean",
          },
          {
            name: "defaultPlaceholder",
            mandatory: false,
            type: "string",
          },
          {
            name: "domainFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "standardConceptCodeFilter",
            mandatory: false,
            type: "string",
          },
          {
            name: "cohortDefinitionKey",
            mandatory: false,
            type: "string",
          },
          {
            name: "useRefValue",
            mandatory: false,
            type: "boolean",
          },
          {
            name: "useRefText",
            mandatory: false,
            type: "boolean",
          },
          {
            name: "conceptIdentifierType",
            mandatory: false,
            type: "string",
          },
        ],
      },
    ],
  };

  const interactionsObject = {
    name: "interactions",
    mandatory: true,
    type: "object",
    strict: true,
    children: [
      {
        nameRegex: "(?!^\\d+$)^[0-9a-zA-Z_]+$", // _[0-9a-f]{8,8}_[0-9a-f]{4,4}_[0-9a-f]{4,4}_[0-9a-f]{4,4}_[0-9a-f]{12,12}$",
        //nameRegex: "^[0-9a-zA-Z_]*_[0-9]{8}$",
        mandatory: false,
        type: "object",
        children: [
          attributesObject,
          nameObject,
          disabledNameObject,
          {
            name: "order",
            mandatory: false,
            type: "number",
            isInteger: true,
            rangeMin: 0,
          },
          {
            name: "defaultFilter",
            mandatory: true,
            mandatoryWarn: true,
            type: "string",
            isCondition: true,
          },
          {
            name: "from",
            type: "object",
            mandatory: false,
            strict: true,
            children: [
              {
                nameRegex: "^@(" + sPlaceholders + ")$",
                type: "string",
                mandatory: false,
                regex: allowedPlaceholderRegex,
              },
            ],
          },
          {
            name: "defaultPlaceholder",
            mandatory: false,
            type: "string",
          },
          parentInteractionsMappingObject,
        ],
      },
    ],
  };

  const conditionsObject = {
    name: "conditions",
    mandatory: true,
    type: "object",
    strict: true,
    children: [
      {
        nameRegex: "(?!^\\d+$)^[0-9a-zA-Z_]*$",
        mandatory: false,
        type: "object",
        children: [
          interactionsObject,
          // 		nameObject
          {
            name: "name",
            mandatory: true,
            type: "string",
            regex: "^.*\\S.*$", // containes non whitespace characters
            minLength: 1,
          },
        ],
      },
    ],
  };

  const mappingObject = {
    name: "mapping",
    mandatory: false,
    type: "object",
    strict: true,
    children: [
      {
        name: "interaction",
        mandatory: false,
        type: "string",
      },
      {
        name: "code",
        mandatory: false,
        type: "string",
      },
      {
        name: "measure",
        mandatory: false,
        type: "string",
      },
      {
        name: "obs",
        mandatory: false,
        type: "string",
      },
      {
        name: "ref",
        mandatory: false,
        type: "string",
      },
      {
        name: "text",
        mandatory: false,
        type: "string",
      },
      {
        name: "patient",
        mandatory: false,
        type: "string",
      },
      {
        name: "patient_address",
        mandatory: false,
        type: "string",
      },
    ],
  };

  const advancedSettings = {
    name: "advancedSettings",
    mandatory: true,
    type: "object",
    strict: true,
    children: [
      {
        name: "tableTypePlaceholderMap",
        mandatory: true,
        type: "object",
      },
      {
        name: "tableMapping",
        mandatory: true,
        type: "object",
      },
      {
        name: "guardedTableMapping",
        mandatory: true,
        type: "object",
      },
      {
        name: "language",
        mandatory: true,
        strict: false,
        type: "array",
        children: [
          {
            type: "string",
            mandatory: false,
          },
        ],
      },
      {
        name: "settings",
        mandatory: true,
        type: "object",
      },
      {
        name: "others",
        mandatory: true,
        type: "object",
      },
      {
        name: "shared",
        mandatory: false,
        type: "object",
      },
      {
        name: "configId",
        mandatory: false,
        type: "string",
      },
      {
        name: "schemaVersion",
        mandatory: false,
        type: "string",
      },
    ],
  };

  const censorObject = {
    name: "censor",
    mandatory: false,
    type: "object",
    strict: true,
    children: [
      {
        name: "minCohortSize",
        mandatory: false,
        type: "number",
        isInteger: true,
      },
    ],
  };

  const validDefinition = {
    type: "object",
    strict: true,
    children: [
      {
        name: "patient",
        mandatory: true,
        type: "object",
        children: [conditionsObject, interactionsObject, attributesObject],
      },
      mappingObject,
      censorObject,
      advancedSettings,
    ],
  };

  return validDefinition;
}
