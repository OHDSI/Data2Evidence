
import * as customRules from "./customRules";
import {ruleValidator as rulesLib } from "@alp/alp-config-utils";

// ////////////////////////////////////////////////////////////////// //
//                   Definition for valid Configs                     //
// ////////////////////////////////////////////////////////////////// //

/*
ObjectDescription:
    Parameter:
        name: string,
        nameRegex: regexString,                             // checks name attribute of objects in array
        type: "array"|"object"|"string"|"number"|"boolean",
        minLength: false|integer (default: false),          // min length of array/string
        maxLength: false|integer (default: false),          // max length of array/string
        mandatory: boolean,
        regex: regexString,                                 // checks value of string objects
        children: ObjectDescription[],
        strict: boolean,                                    // all attributes have to be declared in "children" parameter
        rules: {
            name: String,
            messageKey: String,                             // i18n translation id
            rule: Rule,
            isWarning: boolean (default: false),            // a warning won't prevent saving/activation
            defines: String[]                               // relative path to child, that is causing this rule to fail.
        }[],
        isExpression: boolean,                              // is sql expression (e.g. SUBSTR(@CODE.CODE,0,3))
        isAggregation: boolean,                             // is sql aggregation (e.g. count(*))
        isCondition: boolean,                               // is sql condition (e.g. @PATIENT.PID < 400)
        isInteger: boolean,                                 // checks if number is an integer
        rangeMin: number,                                   // checks if number is greater than the given value
        rangeMax: number,                                   // checks if number is less than the given value
        notZero: boolean                                    // checks if number is not 0
Rule:
    Components:
        RuleValidatorBase(dataSource)                       // abstract
        UniqueValidation(dataSource)                        // checks if all the values are unique
        BaseSelector(dataSource)                            // returns object parameters as an object
        PropertySelector(dataSource, property)              // returns the property with the name "property" in an array
        ChildPropertySelector(dataSource, property)         // returns the properties with the name "property" of all children
        BaseValidation(dataSource)                          // abstract
        CompareValueValidation(dataSource, mode, value)     // compares each element with the value. modes: eq,lt,le,gt,ge,ne
        CountSelector(dataSource)                           // returns the count of all true-like values
        BinaryOperator(datasource[])                        // abstract. takes up to two datasources
        OrOperator(dataSource[])                            // checks if one of the dataSources provides a true-like element
        AndOperator(dataSource[])                           // checks if the dataSources provides only true-like elements
*/

function _getValidDefinition(cdwConfig) {
    const rules = {
        defaultBinSizeRequirements: {
            name: "For an attribute to be binned, it requires to be an ordered category attribute.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_BIN_SIZE_REQUIREMENTS",
            rule: new rulesLib.OrOperator([
                // defaultBinSize and category and ordered
                new rulesLib.CompareValueValidation(
                    new rulesLib.CountSelector(
                        new rulesLib.UnionOperator([
                            new rulesLib.PropertySelector(null, "defaultBinSize"),
                            new rulesLib.PropertySelector(null, "category"),
                            new rulesLib.PropertySelector(null, "ordered"),
                        ]),
                    ),
                    "eq", 3,
                ),
                // not defaultBinSize
                new rulesLib.CompareValueValidation(
                    new rulesLib.CountSelector(
                        new rulesLib.PropertySelector(null, "defaultBinSize"),
                    ),
                    "eq", 0,
                ),
            ]),
            isWarning: false,
        },
        visibleXAxisAttribute: {
            name: "In order for an attribute to be used on the x-axis, it must be visible in the filtercard as well.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_VISIBLE_X_AXIS",
            rule: new customRules.XAxisVisibilityRule(),
            isWarning: false,
        },
        noAggregatedCategories: {
            name: "A category can not be aggregated",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_AGGREGATED_CATEGORY",
            rule: new customRules.NoAggregatedCategory(cdwConfig),
            isWarning: false,
        },
        noAggregatedFiltercardAttributes: {
            name: "An aggregated attribute can not be put on a filtercard",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_AGGREGATED_ATTR_ON_FILTERCARD",
            rule: new customRules.NoAggregatedFiltercardAttribute(cdwConfig),
            isWarning: false,
        },
        filtercardUniqueOrder: {
            name: "The order numbers of filtercards have to be unique",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_FILTERCARDS_UNIQUE_ORDER_VIOLATION",
            rule: new rulesLib.UniqueValidation(
                new rulesLib.ChildPropertySelector(
                    null,
                    "order",
                ),
            ),
            isWarning: false,
        },
        attributesUniqueOrder: {
            name: "The order numbers of attributes have to be unique",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_ATTRIBUTES_UNIQUE_ORDER_VIOLATION",
            rule: new rulesLib.UniqueValidation(
                new rulesLib.ChildPropertySelector(
                    new rulesLib.ChildPropertySelector(
                        null,
                        "filtercard",
                    ),
                    "order",
                ),
            ),
            isWarning: false,
        },
        sourceExistsInCDWConfig: {
            name: "The specified attribute does not exist in the CDW config",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_SOURCE_DOES_NOT_EXIST",
            rule: new customRules.PathExistsInConfig(cdwConfig),
            isWarning: false,
        },
        initialYAxisValidation: {
            name: "An initial attribute needs to be specified for the Y-axis",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_NO_Y_ATTRIBUTE",
            rule: new customRules.InitialYAxisRule(),
            isWarning: false,
        },
        initialAttributeValidation: {
            name: "An initial attribute needs to be on an initial filtercard.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_INITIAL_ATTRIBUTE_ON_NON_INITIAL_FILTERCARD",
            rule: new customRules.InitialAttributesRule(),
            isWarning: false,
        },
        initialAttributesVisibilityValidation: {
            name: "An initial attribute needs to be visible.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_INITIAL_ATTRIBUTE_NOT_VISIBLE",
            rule: new customRules.InitialAttributesVisibilityRule(),
            isWarning: false,
        },
        atLeastOneChartVisibleValidation: {
            name: "At least one chart needs to be visible.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_NO_CHART_VISIBLE",
            rule: new customRules.AtLeastOneChartVisibleRule(),
            isWarning: false,
        },
        defaultBinSizeValidation: {
            name: "Attribute does not qualify as a binnable attribute.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_VALID_FOR_BINNING",
            rule: new customRules.DefaultBinSizeRule(cdwConfig),
            isWarning: false,
        },
        UseRefTextRuleValidation: {
            name: "Attribute requires a configured \"Reference Filter\" in the Clinical Data Model to use the Reference Text.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_VALID_FOR_USE_REF_TEXT",
            rule: new customRules.UseRefTextRule(cdwConfig),
            isWarning: false,
        },
        UseRefValueRuleValidation: {
            name: "Attribute requires a configured \"Reference Expression\" and \"Reference Filter\" in the Clinical Data Model to use the Reference Value.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_VALID_FOR_USE_REF_VALUE",
            rule: new customRules.UseRefValueRule(cdwConfig),
            isWarning: false,
        },
        initialChartCategoriesVisibleRule: {
            name: "Attributes used as initial chart categories have to be inital and visible.",
            messageKey: "MRI_PA_CFG_VALIDATION_ERROR_ATTRIBUTE_NOT_VALID_AS_INITIAL_CATEGORY",
            rule: new customRules.InitialChartCategoriesVisibleRule(cdwConfig),
            isWarning: false,
        },
    };

    const attribute = {
        type: "object",
        strict: true,
        rules: [
            rules.defaultBinSizeRequirements,
            rules.noAggregatedCategories,
            rules.noAggregatedFiltercardAttributes,
            rules.defaultBinSizeValidation,
            rules.UseRefTextRuleValidation,
            rules.UseRefValueRuleValidation,
            rules.visibleXAxisAttribute,
        ],
        children: [
            {
                name: "annotations",
                mandatory: false,
                type: "array",
                children: [
                    {
                        name: "annotation",
                        mandatory: false,
                        type: "string",
                    },
                ],
            },
            {
                name: "modelName",
                mandatory: false,
                type: "string",
            },
            {
                name: "source",
                mandatory: true,
                type: "string",
                rules: [
                    rules.sourceExistsInCDWConfig,
                ],
                regex: "^patient\\.(?:(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+\\.)?attributes\\.[0-9a-zA-Z_]+$",
            },
            {
                name: "ordered",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "useRefText",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "useRefValue",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "category",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "measure",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "aggregated",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "cached",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "defaultBinSize",
                mandatory: false,
                type: "number",
            },
            {
                name: "filtercard",
                mandatory: false,
                type: "object",
                strict: "true",
                rules: [
                    rules.initialAttributesVisibilityValidation,
                ],
                children: [
                    {
                        name: "initial",
                        mandatory: false,
                        type: "boolean",
                    },
                    {
                        name: "visible",
                        mandatory: false,
                        type: "boolean",
                    },
                    {
                        name: "order",
                        mandatory: false,
                        type: "number",
                        isInteger: true,
                        rangeMin: 0,
                    },
                ],
            },
            {
                name: "patientlist",
                mandatory: false,
                type: "object",
                strict: "true",
                rules: [
                    rules.initialAttributesVisibilityValidation,
                ],
                children: [
                    {
                        name: "initial",
                        mandatory: false,
                        type: "boolean",
                    },
                    {
                        name: "visible",
                        mandatory: false,
                        type: "boolean",
                    },
                    {
                        name: "linkColumn",
                        mandatory: false,
                        type: "boolean",
                    },
                    {
                        name: "order",
                        mandatory: false,
                        type: "number",
                        isInteger: true,
                        rangeMin: 0,
                    },
                ],
            },
        ],
    };

    const attributes = {
        name: "attributes",
        type: "array",
        strict: true,
        minLength: 1,
        rules: [
            rules.attributesUniqueOrder,
        ],
        children: [
            attribute,
        ],
    };

    const filtercard = {
        type: "object",
        strict: true,
        children: [
            {
                name: "modelName",
                mandatory: false,
                type: "string",
            },
            {
                name: "source",
                mandatory: true,
                type: "string",
                rules: [
                    rules.sourceExistsInCDWConfig,
                ],
                regex: "^patient$|^patient\\.(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+$",
            },
            {
                name: "visible",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "order",
                mandatory: false,
                type: "number",
                isInteger: true,
                rangeMin: 0,
            },
            {
                name: "initial",
                mandatory: false,
                type: "boolean",
            },
            {
                name: "initialPatientlistColumn",
                mandatory: false,
                type: "boolean",
            },
            attributes,
        ],
    };

    const filtercards = {
        name: "filtercards",
        type: "array",
        strict: true,
        minLength: 1,
        rules: [
            rules.filtercardUniqueOrder,
        ],
        children: [
            filtercard,
        ],
    };

    const chartAttributes = {
        visible: {
            name: "visible",
            mandatory: false,
            type: "boolean",
        },
        downloadEnabled: {
            name: "downloadEnabled",
            mandatory: false,
            type: "boolean",
        },
        pdfDownloadEnabled: {
            name: "pdfDownloadEnabled",
            mandatory: false,
            type: "boolean",
        },
        imageDownloadEnabled: {
            name: "imageDownloadEnabled",
            mandatory: false,
            type: "boolean",
        },
        zipDownloadEnabled: {
            name: "zipDownloadEnabled",
            mandatory: false,
            type: "boolean",
        },
        collectionEnabled: {
            name: "collectionEnabled",
            mandatory: false,
            type: "boolean",
        },
        beginVisible: {
            name: "beginVisible",
            mandatory: false,
            type: "boolean",
        },
        fillMissingValuesEnabled: {
            name: "fillMissingValuesEnabled",
            mandatory: false,
            type: "boolean",
        },
        confidenceInterval: {
            name: "confidenceInterval",
            mandatory: false,
            type: "number",
            rangeMin: 0,
        },
        filters: {
            strict: true,
            name: "filters",
            mandatory: false,
            type: "array",
            children: [
                {
                    name: "sources",
                    mandatory: false,
                    type: "string",
                    rules: [
                        rules.sourceExistsInCDWConfig,
                    ],
                    regex: "^patient$|^patient\\.(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+$",
                },
            ],
        },
        selectedInteractions: {
            strict: true,
            name: "selectedInteractions",
            mandatory: false,
            type: "array",
            children: [
                {
                    name: "sources",
                    mandatory: false,
                    type: "string",
                    rules: [
                        rules.sourceExistsInCDWConfig,
                    ],
                    regex: "^patient$|^patient\\.(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+$",
                },
            ],
        },
        selectedEndInteractions: {
            strict: true,
            name: "selectedEndInteractions",
            mandatory: false,
            type: "array",
            children: [
                {
                    name: "sources",
                    mandatory: false,
                    type: "string",
                    rules: [
                        rules.sourceExistsInCDWConfig,
                    ],
                    regex: "^patient$|^patient\\.(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+$",
                },
            ],
        },
        pageSize: {
            name: "pageSize",
            mandatory: false,
            type: "number",
            rangeMin: 1,
        },
    };

    const customChart = {
        name: "customChart",
        type: "object",
        children: [
            {
                name: "chartName",
                type: "string",
                mandatory: true,
            },
            {
                name: "chartView",
                type: "string",
                mandatory: true,
            },
        ],
    };

    const customCharts = {
        name: "customCharts",
        type: "array",
        children: [
            customChart,
        ],
    };

    const sacChart = {
        name: "sacChart",
        type: "object",
        children: [
            {
                name: "chartName",
                type: "string",
                mandatory: true,
            },
            {
                name: "url",
                type: "string",
                mandatory: true,
            },
        ],
    };

    const sacCharts = {
        name: "sacCharts",
        type: "array",
        children: [
            sacChart,
        ],
    };

    const chartOptions = {
        name: "chartOptions",
        type: "object",
        strict: true,
        children: [
            {
                name: "initialAttributes",
                type: "object",
                strict: true,
                children: [
                    {
                        name: "measures",
                        type: "array",
                        strict: true,
                        mandatory: true,
                        children: [
                            {
                                name: "source",
                                mandatory: true,
                                type: "string",
                                regex: "^patient\\.(?:(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+\\.)?attributes\\.[0-9a-zA-Z_]+$",
                            },
                        ],
                    },
                    {
                        name: "categories",
                        type: "array",
                        strict: true,
                        children: [
                            {
                                name: "source",
                                mandatory: true,
                                type: "string",
                                regex: "^patient\\.(?:(?:conditions.[0-9a-zA-Z_]+\\.)?interactions\\.[0-9a-zA-Z_]+\\.)?attributes\\.[0-9a-zA-Z_]+$",
                            },
                        ],
                    },
                ],
            },
            {
                name: "minCohortSize",
                mandatory: false,
                type: "number",
                isInteger: true,
                rangeMin: 0,
            },
            {
                name: "initialChart",
                mandatory: true,
                type: "string",
                regex: "^(stacked)$|^(boxplot)$|^(km)$|^(list)$|^(vb)$|^(custom)$",
            },
            {
                name: "stacked",
                type: "object",
                strict: true,
                children: [
                    chartAttributes.visible,
                    chartAttributes.downloadEnabled,
                    chartAttributes.pdfDownloadEnabled,
                    chartAttributes.imageDownloadEnabled,
                    chartAttributes.collectionEnabled,
                    chartAttributes.beginVisible,
                    chartAttributes.fillMissingValuesEnabled,
                ],
            },
            {
                name: "boxplot",
                type: "object",
                strict: true,
                children: [
                    chartAttributes.visible,
                    chartAttributes.downloadEnabled,
                    chartAttributes.pdfDownloadEnabled,
                    chartAttributes.imageDownloadEnabled,
                    chartAttributes.collectionEnabled,
                    chartAttributes.beginVisible,
                    chartAttributes.fillMissingValuesEnabled,
                ],
            },
            {
                name: "km",
                type: "object",
                strict: true,
                children: [
                    chartAttributes.visible,
                    chartAttributes.downloadEnabled,
                    chartAttributes.pdfDownloadEnabled,
                    chartAttributes.imageDownloadEnabled,
                    chartAttributes.collectionEnabled,
                    chartAttributes.beginVisible,
                    chartAttributes.confidenceInterval,
                    chartAttributes.filters,
                    chartAttributes.selectedInteractions,
                    chartAttributes.selectedEndInteractions,
                ],
            },
            {
                name: "list",
                type: "object",
                strict: true,
                children: [
                    chartAttributes.visible,
                    chartAttributes.downloadEnabled,
                    chartAttributes.zipDownloadEnabled,
                    chartAttributes.collectionEnabled,
                    chartAttributes.beginVisible,
                    chartAttributes.pageSize,

                    // deprecated
                    chartAttributes.pdfDownloadEnabled,
                ],
            },
            {
                name: "vb",
                type: "object",
                strict: false,
                children: [
                    chartAttributes.visible,
                    {
                        name: "referenceName",
                        type: "string",
                        mandatory: true,
                    },
                ],
            },
            {
                name: "custom",
                type: "object",
                strict: false,
                children: [
                    chartAttributes.visible,
                    customCharts,
                ],
            },
            {
                name: "sac",
                type: "object",
                strict: false,
                children: [
                    chartAttributes.visible,
                    sacCharts,
                ],
            },
            {
                name: "shared",
                type: "object",
                strict: false,
                children: [
                    {
                        name: "enabled",
                        type: "boolean",
                        strict: false,
                    },
                    {
                        name: "systemName",
                        type: "string",
                        strict: false,
                    },
                ],
            },
        ],
    };

    const panelOptions = {
      name: "panelOptions",
      type: "object",
      strict: true,
      children: [
        {
          name: "addToCohorts",
          type: "boolean",
          strict: false,
        },
        {
          name: "domainValuesLimit",
          type: "number",
          strict: false,
        },
        {
          name: "maxFiltercardCount",
          type: "number",
          strict: false,
        },
        {
          name: "calcViewAccessPoint",
          type: "boolean",
          strict: false,
        },
        {
          name: "externalAccessPoints",
          type: "boolean",
          strict: false,
        },
        {
          name: "cohortEntryExit",
          type: "boolean",
          strict: false,
        },
        {
          name: "atlasCohortDefinition",
          type: "boolean",
          strict: false,
        },
        // deprecated
        {
          name: "afp",
          type: "object",
          strict: false,
          mandatory: false,
        },
        {
          name: "advancedTimeFiltering",
          type: "object",
          strict: false,
          mandatory: false,
        },
        {
          name: "absoluteTimeFiltering",
          type: "object",
          strict: false,
          mandatory: false,
        },
        {
          name: "noValueText",
          type: "object",
          strict: false,
          mandatory: false,
        },
      ],
    };

    const configInformations = {
        name: "configInformations",
        type: "object",
        strict: true,
        mandatory: false,
        children: [
            {
                name: "note",
                type: "string",
                mandatory: false,
            },
        ],
    };

    const validDefinition = {
        type: "object",
        strict: true,
        rules: [
            rules.initialAttributeValidation,
            rules.initialChartCategoriesVisibleRule,
            rules.initialYAxisValidation,
            rules.atLeastOneChartVisibleValidation,
        ],
        children: [
            filtercards,
            chartOptions,
            panelOptions,
            configInformations,
            {
                name: "pageTitle",
                type: "string",
                strict: false,
            },
        ],
    };
    return validDefinition;
}

export function getDefinition(cdwConfig) {
    return _getValidDefinition(cdwConfig);
}
