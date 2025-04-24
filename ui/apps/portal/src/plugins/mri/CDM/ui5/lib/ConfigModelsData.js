sap.ui.define([
	"jquery.sap.global",
	"hc/hph/cdw/config/ui/lib/BackendLinker",
	"hc/hph/cdw/config/ui/lib/ConfigUtils"
], function (jQuery, BackendLinker, ConfigUtils) {
	"use strict";

	var ConfigModelsData = function () {
		this._initConfigGeneralModelData();
		this._initConfigOverviewModelData();
		this._initConfigEditorModelData();
	};

	ConfigModelsData.prototype._initConfigGeneralModelData = function () {
		if (!this._configModelsData) {
			this._configModelsData = {};
		}

		this._configModelsData.configGeneralModelData = {
			supportedLanguages: [],
			supportedTablesForInteractions: []
		};

		this._configModelsData.configGeneralModelData.supportedTablesForInteractions = [{
			key: "@INTERACTION",
			text: "@INTERACTION"
		}, {
			key: "@CODE",
			text: "@CODE"
		}, {
			key: "@MEASURE",
			text: "@MEASURE"
		},
		{
			key: "@OBS",
			text: "@OBS"
		}, {
			key: "@REF",
			text: "@REF"
		},
		{
			key: "@TEXT",
			text: "@TEXT"
		}
		];


		this._configModelsData.configGeneralModelData.supportedTablesForAttributes = [
			{
				key: "@CODE",
				text: "@CODE"
			}, {
				key: "@MEASURE",
				text: "@MEASURE"
			}, {
				key: "@OBS",
				text: "@OBS"
			}, {
				key: "@REF",
				text: "@REF"
			},
			{
				key: "@TEXT",
				text: "@TEXT"
			}];

		this._configModelsData.configGeneralModelData.supportedTablesForAttributesOTS = [
			{
				key: "@MEASURE",
				text: "@MEASURE"
			}, {
				key: "@OBS",
				text: "@OBS"
			}, {
				key: "@REF",
				text: "@REF"
			},
			{
				key: "@TEXT",
				text: "@TEXT"
			}];

	};
	ConfigModelsData.prototype._initConfigOverviewModelData = function () {
		if (!this._configModelsData) {
			this._configModelsData = {};
		}

		this._configModelsData.configOverviewModelData = {
			configurations: [],
			focusedConfigItem: null,
			focusedConfigVersionItem: null,

			deleteModeConfig: false,
			deleteModeConfigAll: false,
			deleteModeVersion: false
		};
	};

	ConfigModelsData.prototype._initConfigEditorModelData = function () {
		var that = this;
		if (!this._configModelsData) {
			this._configModelsData = {};
		}

		// add default condition types
		var emptyCond = this.getEmptyConditionType("", "");

		this._configModelsData.configEditorModelData = {
			configName: "",
			configVersion: "0",
			configId: "",
			filterCards: [],
			generalSettingsFilterCards: [],
			suggestedFilterCards: [],
			conditionTypes: [emptyCond],
			attributeTypes: [],
			parentInteractions: [emptyCond],

			queryValidation: [],
			feValidation: [],
			beValidation: [],
			beWarning: [],
			templateFilterCards: [],
			templateFilterCardsGroup: [],
			conditionTypesFromTemplate: [], //Element here will only be coppied into the list of condition when a template filter was copied into the filter cards
			preloadedSuggestions: {},
			settings: {
				fuzziness: 0,
				languages: [],
				maxResultSize: 0
			},
			censor: {},
			editFlag: false,
			autoSaveFlag: true,
			configNavStatus: {
				cdm: { validity: { status: "valid", message: "" } },
				tableMappings: { validity: { status: "valid", message: "" }},
				settings: { validity: { status: "valid", message: "" }}
			},
			tableTypePlaceholderMap: {
				dimTables: [],
				factTables: []
			},
			otherPlaceholders: {
				refPlaceholder: [],
				textPlaceholder: [],
				guardedPlaceholder: [],
				otsPlaceholder: []
			}
		};

		BackendLinker.getAttributeTypes(function (err, types) {
			types.forEach(function (oAttributeType) {
				that._configModelsData.configEditorModelData.attributeTypes.push({
					key: oAttributeType.key,
					text_key: oAttributeType.text_key
				});
			}, that);
		});
	};

	
	/*
	Get table mappings from front end config
	*/
	ConfigModelsData.prototype.getFETableMapping = function (feConfig) {
		return $.extend(
			this.getAllPlaceholdersFromUI(feConfig.tableTypePlaceholderMap),
			this.getAllPlaceholdersFromUI(feConfig.otherPlaceholders.refPlaceholder),
			this.getAllPlaceholdersFromUI(feConfig.otherPlaceholders.textPlaceholder)
		);
	};

	/**
	 * 
	 * @param {JSON} uiTableTypePlaceholderMap - tableTypePlaceholderMap from UI (ui format)
	 * @param {JSON} options - includeTablesOnly - exclude/include column placeholders as well
	 * 						 - excludedKeys - array of keys that we don't want to get the values
	 * @returns {JSON} - A dictionary of table mappings key - placeholder, value - 
	 */
	ConfigModelsData.prototype.getAllPlaceholdersFromUI = function (uiTableTypePlaceholderMap, options) {

		options = options || {
			includeTablesOnly: false,
			excludedKeys: []
		};

		// fill with default options
		if (!options.hasOwnProperty("includeTablesOnly")) {
			options.includeTablesOnly = false;
		}

		if (!options.hasOwnProperty("excludedKeys")) {
			options.excludedKeys = [];
		}

		try {		
		var placeholders = {};
		ConfigUtils.JSONFindAndDo(uiTableTypePlaceholderMap,
			function (obj, key) {
				return key === "placeholder" && options.excludedKeys.indexOf(key) === -1;
			},
			function (obj, key) {
				var placeholderKey = obj[key]; 
				placeholders[placeholderKey] = obj["placeholderValue"];
				
				// only include @PATIENT and not columns ex. @PATIENT.PATIENT_ID
				if (options.includeTablesOnly) {
					return;
				}

				if (obj.hasOwnProperty("columnPlaceholders")) {
					// build the column placeholders as well
					Object.keys(obj.columnPlaceholders).forEach(function (key) {
						placeholders[placeholderKey + "." + key] = obj.columnPlaceholders[key];
					});
				}
			});

			return placeholders;
		} catch (e) {
			console.log(e);
		}
	};

	ConfigModelsData.prototype.getEmptyFactTableAttribute = function () {
		return {
			columns: [], // list of table columns from database. used to populate the columns listbox in ui
			placeholder: "", // @<PLACEHOLDER_NAME>
			placeholderValue: "",
			columnPlaceholders: {
				PATIENT_ID: "",
				OBSERVATION_ID: "",
				OBS_TYPE: "",
				OBS_CHAR_VAL: ""
			}
		};
	};

	ConfigModelsData.prototype.getEmptyDimTable = function () {
		return {
			columns: [], // list of table columns from database. used to populate the columns listbox in ui
			placeholder: "", // @<PLACEHOLDER_NAME>
			placeholderValue: "",
			attributeTables: [],
			columnPlaceholders: {
				PATIENT_ID: "",
				INTERACTION_ID: "",
				CONDITION_ID: "",
				PARENT_INTERACT_ID: "",
				START: "",
				END: "",
				INTERACTION_TYPE: ""
			}
		};
	};

	ConfigModelsData.prototype.getEmptyDimAttributeTable = function () {
		return {
			columns: [], // list of table columns from database. used to populate the columns listbox in ui
			placeholder: "", // @<PLACEHOLDER_NAME>
			placeholderValue: "",
			columnPlaceholders: {
				INTERACTION_ID: "",
				ATTRIBUTE: "",
				VALUE: ""
			}
		};
	};

	ConfigModelsData.prototype.getModelData = function () {
		return this._configModelsData;
	};

	ConfigModelsData.prototype.getEmptyAttribute = function (
		name, idName) {

		var attrName = name ? name : "";
		var attrIdName = idName ? idName : "";

		var attr = {
			idName: attrIdName,
			isNew: true,
			isNormalAttribute: true,
			isCatalogAttribute: false,
			isOTSAttribute: false,
			editable: true,

			// properties that need validation in the frontend
			name: { value: attrName, validity: { status: "valid", message: "" } },
			frontEndID: { value: attrIdName, validity: { status: "valid", message: "" } },
			type: { value: "text", validity: { status: "valid", message: "" } },
			queryValidity: { validity: { status: "valid", message: "" } },
			catalogQueryValidity: { validity: { status: "valid", message: "" } },
			expression: { value: "", validity: { status: "valid", message: "" } },
			defaultPlaceholder: { value: "", validity: { status: "valid", message: "" } },
			defaultFilter: { value: "", validity: { status: "valid", message: "" } },
			measureExpression: { value: "", validity: { status: "valid", message: "" } },
			referenceFilter: { value: "", validity: { status: "valid", message: "" } },
			eavExpressionKey: { value: "", validity: { status: "valid", message: "" } },
			eavExpressionFilter: { value: "", validity: { status: "valid", message: "" } },
			relationExpressionKey: { value: "", validity: { status: "valid", message: "" } },
			relationExpressionFilter: { value: "", validity: { status: "valid", message: "" } },
			relationExpressionPatientKey: { value: "", validity: { status: "valid", message: "" } },
			relationExpressionPatientFilter: { value: "", validity: { status: "valid", message: "" } },
			referenceExpression: { value: "", validity: { status: "valid", message: "" } },
			extraData: { value: "", validity: { status: "valid", message: "" } },
			langName: { value: [], validity: { status: "valid", message: "" } },
			from: { value: [], validity: { status: "valid", message: "" } },
			otsLanguage: { value: "", validity: { status: "valid", message: "" } },
			otsSubject: { value: "", validity: { status: "valid", message: "" } },
			otsHierarchyLevel: { value: "", validity: { status: "valid", message: "" } },
			otsTermContext: { value: "", validity: { status: "valid", message: "" } },
			annotations: [],
			domainFilter: { value: "", validity: { status: "valid", message: "" } },
			standardConceptCodeFilter: { value: "", validity: { status: "valid", message: "" } },
			cohortDefinitionKey: { value: "", validity: { status: "valid", message: "" } },
			conceptIdentifierType: { value: "", validity: { status: "valid", message: "" } }
		};

		return attr;

	};

	/**
	 * name - optional idName - optional
	 *
	 */
	ConfigModelsData.prototype.getEmptyFilterCard = function (
		name, idName) {

		var cardName = name ? name : "";
		var cardIdName = idName ? idName : "";

		var card = {
			idName: cardIdName,
			conditionType: this.getEmptyConditionType(),
			changeable: true,
			attributes: [],
			parentInteraction: [],
			description: "",
			isNew: true,
			additionalInformation: "",
			allowSameInteraction: false,
			editable: true,

			frontEndID: { value: idName, validity: { status: "valid", message: "" } },
			queryValidity: { validity: { status: "valid", message: "" } },
			defaultFilter: { value: "", validity: { status: "valid", message: "" }, basicKey: "" },
			defaultFilterKey: { value: "", validity: { status: "valid", message: "" } },
			defaultPlaceholder: { value: "", validity: { status: "valid", message: "" } },
			parentInteractionLabel: { value: "parent", validity: { status: "valid", message: "" } },
			langName: { value: [], validity: { status: "valid", message: "" } },
			from: { value: [], validity: { status: "valid", message: "" } },
			name: { value: cardName, validity: { status: "valid", message: "" } },
			cohortDefinitionKey: { value: "", validity: { status: "valid", message: "" } },
			conceptIdentifierType: { value: "", validity: { status: "valid", message: "" } }
		};

		return card;

	};


	/**
	 * name - optional key - optional
	 *
	 */
	ConfigModelsData.prototype.getEmptyConditionType = function (
		name, key) {

		var condName = name ? name : "";
		var condKey = key ? key : "";

		var condition = {
			name: condName,
			key: condKey
		};

		return condition;

	};

	/**
	 * name - optional idName - optional
	 *
	 */
	ConfigModelsData.prototype.getEmptyFilterCardGroup = function (
		name, idName) {

		var cardName = name ? name : "";
		var cardIdName = idName ? idName : "";

		var card = {
			name: cardName,
			idName: cardIdName,
			filterCards: [],
			attributes: [],
			langName: { value: [], validity: { status: "valid", message: "" } }
		};

		return card;

	};

	ConfigModelsData.prototype.getEmptyTableMapping = function (data) {

		var interactionTable = data ? data.interaction : "";
		var observationTable = data ? data.obs : "";
		var codeTable = data ? data.code : "";
		var measureTable = data ? data.measure : "";
		var refTable = data ? data.ref : "";
		var patientTable = data ? data.patient : "";
		var patientAddressTable = data ? data.patient_address : "";
		var textTable = data ? data.text : "";

		var tableMapping = {
			"@INTERACTION": interactionTable,
			"@OBS": observationTable,
			"@CODE": codeTable,
			"@MEASURE": measureTable,
			"@REF": refTable,
			"@PATIENT": patientTable,
			"@PATIENT_ADDRESS": patientAddressTable,
			"@TEXT": textTable
		};

		return tableMapping;
	};

	ConfigModelsData.prototype.getEmptyParentInteractionType = function (name, key) {


		var parName = name ? name : "";
		var parKey = key ? key : "";

		var interaction = {
			name: parName,
			key: parKey
		};

		return interaction;

	};

	return ConfigModelsData;
});

