sap.ui.define([
	"jquery.sap.global",
	"hc/hph/cdw/config/ui/lib/ConfigUtils",
	"hc/hph/config/global/ui/lib/BackendLinker"
], function (jQuery, ConfigUtils, GlobalBackendLinker) {
	"use strict";

	var BackendLinker = {};

	BackendLinker._globalSettings = null;
	BackendLinker._defaultAdvancedSettings = {
		guardedTableMapping: {},
		language: [],
		others: {},
		settings: {},
		shared: {},
		tableMapping: {},
		tableTypePlaceholderMap: {
			factTable: {},
			dimTables: []
		}
	};
	BackendLinker._calculatedPholderMap = {
		"@@AGE_START": "FLOOR(DAYS_BETWEEN(@PATIENT.DOB, @INTERACTION.START) / 365)",
		"@@AGE_END": "FLOOR(DAYS_BETWEEN(@PATIENT.DOB, @INTERACTION.END) / 365)"
	};

	GlobalBackendLinker.loadSettings(function (result, oData) {
		if (result !== "error") {
			BackendLinker._globalSettings = oData;
		}
	});

	/**
	 * Make a POST-request and execute the callback on response. Some default
	 * settings are applied.
	 *
	 * @param {Object}
	 *            oSettings jQuery.ajax settings object
	 * @param {Function}
	 *            fCallback Callback function to be called on success or error.
	 */

	BackendLinker._postJson = function (oSettings,
		fCallback) {

		return ConfigUtils.ajax(jQuery.extend({
			url: "/hc/hph/cdw/config/services/config.xsjs",
			type: "POST",
			dataType: "json",
			contentType: "application/json; charset=utf-8"
		}, oSettings)).done(function (oData) {
				if (fCallback){
					fCallback("success", oData);
				} else {
					return oData;
				}
			}).fail(function ($jqXHR) {
				if (fCallback){
					fCallback("error", $jqXHR.responseText);
				} else {
					return $jqXHR.responseText;
				}
			});
	};

	BackendLinker.getConfigOverview = function (callback) {
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'getAll'
			})
		}, callback);

	};

	/**
	 * Get a blank CDM Config pre filled with default attributes
	 *
	 * @param {any} callback
	 */
	BackendLinker.getConfigDefaults = function (callback) {

		return BackendLinker._postJson({
			data: JSON.stringify({
				action: 'configDefaults'
			})
		}, callback);

	};

	BackendLinker.getBEConfig = function (meta, callback) {
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'getAdminConfig',
				configId: meta.configId,
				configVersion: meta.configVersion
			})
		}, callback);

	};

	BackendLinker.getSuggestionConfig = function (callback) {

		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'suggest'
			})
		}, callback);

	};

	BackendLinker.getTemplateConfig = function (callback) {

		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'template'
			})
		}, callback);

	};

	BackendLinker.getSkeletonConfig = function () {

		var config = {
			"patient": {
				"conditions": {},
				"interactions": {},
				"attributes": {}
			},
			"censor": {},
			"advancedSettings": JSON.parse(JSON.stringify(BackendLinker._defaultAdvancedSettings))
		};

		return config;
	};

	BackendLinker.testAttribute = function (beConfig,
		callback) {

		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'testAttribute',
				config: beConfig
			})
		}, callback);
	};

	BackendLinker.validateConfig = function (beConfig,
		callback) {

		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'validate',
				config: beConfig
			})
		}, callback);
	};

	BackendLinker.saveConfig = function (meta, beConfig,
		callback) {

		// send to the server
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'save',
				configId: meta.configId,
				configVersion: meta.configVersion,
				configName: meta.configName,
				config: beConfig
			})
		}, callback);
	};

	BackendLinker.autoSaveConfig = function (meta, beConfig,
		callback) {

		// send to the server
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'autosave',
				configId: meta.configId,
				configVersion: meta.configVersion,
				configName: meta.configName,
				config: beConfig
			})
		}, callback);
	};

	BackendLinker.activateConfig = function (meta,
		beConfig, callback) {
		// beConfig can also only contain a configId and a configVersion (only
		// activate)
		// if beConfig includes a complete config, it will be validated and saved
		// (save&activate)
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'activate',
				configId: meta.configId,
				configVersion: meta.configVersion,
				configName: meta.configName,
				config: beConfig
			})
		}, callback);
	};

	BackendLinker.deleteConfig = function (meta, callback) {
		// send to the server
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'delete',
				configId: meta.configId,
				configVersion: meta.configVersion
			})
		}, callback);
	};

	BackendLinker.countDependingConfig = function (meta, callback) {
		// send to the server
		BackendLinker._postJson({
			data: JSON.stringify({
				action: 'countDependingConfig',
				configId: meta.configId,
				configVersion: meta.configVersion
			})
		}, callback);
	};

	BackendLinker.testConfig = function (beConfig, path, exprToUse, useRefText,
		callbackAggregateResults, callbackSampleResults) {

		// send to the server
		BackendLinker
			._postJson(
				{
					url: "/hc/hph/cdw/services/cdw_services.xsjs?action=attribute_infos_service",
					data: JSON.stringify({
						attributePath: path,
						exprToUse: exprToUse,
						useRefText: useRefText,
						config: beConfig
					})
				}, callbackAggregateResults);

		BackendLinker
			._postJson(
				{
					url: "/hc/hph/cdw/services/cdw_services.xsjs?action=domain_values_service",
					data: JSON.stringify({
						attributePath: path,
						suggestionLimit: 10,
						exprToUse: exprToUse,
						useRefText: useRefText,
						config: beConfig
					})
				}, callbackSampleResults);

	};

	BackendLinker.getBEConfigSkeletons = function () {

		return {
			conditionSkeleton: {
				name: "",
				order: 0
			},
			interactionSkeleton: {
				name: [],
				langName: [],
				disabledLangName: [],
				defaultFilter: "",
				defaultFilterKey: "",
				defaultPlaceholder: "",
				order: 0,
				from: {},
				parentInteraction: [],
				parentInteractionLabel: "",
				allowSameInteraction: "false",
				cohortDefinitionKey: "",
				conceptIdentifierType: ""
			},
			attributeSkeleton: {
				name: [],
				langName: [],
				disabledLangName: [],
				type: "",
				expression: "",
				otsLanguage: "",
				otsSubject: "",
				otsHierarchyLevel: "",
				otsTermContext: "",
				eavExpressionKey: "",
				eavExpressionFilter: "",
				relationExpressionKey: "",
				relationExpressionFilter: "",
				relationExpressionPatientKey: "",
				relationExpressionPatientFilter: "",
				defaultPlaceholder: "",
				defaultFilter: "",
				measureExpression: "",
				referenceFilter: "",
				referenceExpression: "",
				order: 0,
				isDefault: false,
				from: {},
				annotations: [],
				domainFilter: "",
				standardConceptCodeFilter: "",
				cohortDefinitionKey: "",
				conceptIdentifierType: ""
			},
			censorSkeleton: {
				minCohortSize: 0
			},
			settingsSkeleton: {
				fuzziness: 0,
				maxResultSize: 0,
				dateFormat: "",
				timeFormat: ""
			},
			factTableSkeleton: {
				placeholder: "",
				attributeTables: []
			},
			dimTableSkeleton: {
				placeholder: "",
				attributeTables: [],
				hierarchy: true,
				time: true,
				oneToN: true,
				condition: true,
			},
			attributeTableSkeleton: {
				placeholder: "",
				oneToN: true
			},
			factTableColumnsSkeleton: {
				PATIENT_ID: "",
				DOD: "",
				DOB: ""
			},
			factAttributeColumnsSkeleton: {
				PATIENT_ID: "",
				OBSERVATION_ID: "",
				OBS_TYPE: "",
				OBS_CHAR_VAL: ""
			},
			dimTableColumnsSkeleton: {
				PATIENT_ID: "",
				INTERACTION_ID: "",
				CONDITION_ID: "",
				PARENT_INTERACT_ID: "",
				START: "",
				END: "",
				INTERACTION_TYPE: ""
			},
			dimTableAttributeColumnsSkeleton: {
				INTERACTION_ID: "",
				ATTRIBUTE: "",
				VALUE: ""
			},
			refColumnsSkeleton: {
				VOCABULARY_ID: "",
				CODE: "",
				TEXT: ""
			},
			textColumnsSkeleton: {
				INTERACTION_ID: "",
				INTERACTION_TEXT_ID: "",
				VALUE: ""
			}
		};
	};

	BackendLinker._frontToBackPropertyConverter = {
		from: function (frontValue, originalContainer, destination, tableMappings) {
			var errors = [];
			if (frontValue.value.length === 0) {
				if (destination.otsLanguage) {
					destination.from = tableMappings.otsTableMapping;
				}
				return;
			}
			var backValue = {};
			frontValue.value.forEach(function (arrayElem) {
				if (!backValue.hasOwnProperty(arrayElem.placeholder)) {
					backValue[arrayElem.placeholder] = arrayElem.table;
				} else {
					errors.push({
						messageKey: "HPH_CDM_CFG_VALID_MULTIPLE_TBL",
						messageDefault: "Placeholder {0} is ambiguously defined",
						values: [arrayElem.placeholder],
						config: arrayElem.placeholder
					});
				}

			});
			destination.from = backValue;

			if (destination.otsLanguage) {
				destination.from = tableMappings.otsTableMapping;
			}

			return errors;
		},

		name: function (frontValue, originalContainer, destination) {
			// frontValue is a string, put it in the array 'name' as a pair {'lang':
			// '', 'value': 'xxx'}

			if (!destination.hasOwnProperty("name")) {
				destination.name = [];
			}
			destination.name.push({
				lang: "",
				value: frontValue.value
			});
		},

		langName: function (frontValue, originalContainer, destination) {
			// frontValue is an array with all the languages (except developer), put
			// it in the array 'name' as a pair {'lang': '', 'value': 'xxx'}
			if (!frontValue.value) {
				return;
			}
			if (!destination.hasOwnProperty("name")) {
				destination.name = [];
			}
			if (!destination.hasOwnProperty("disabledLangName")) {
				destination.disabledLangName = [];
			}

			for (var i = 0; i < frontValue.value.length; i++) {

				var duplicatedObj = JSON.parse(JSON.stringify(frontValue.value[i]));
				delete duplicatedObj.enabled;

				if (frontValue.value[i].enabled) {
					destination.name.push(duplicatedObj);
				} else {
					destination.disabledLangName.push(duplicatedObj);
				}
			}
		},

		type: function (frontValue, originalContainer, destination) {
			destination.type = frontValue.value;
		},

		expression: function (frontValue, originalContainer, destination) {
			if (frontValue.value === ""
				|| !originalContainer.hasOwnProperty("isNormalAttribute")
				|| !originalContainer.isNormalAttribute) {
				return;
			}
			destination.expression = frontValue.value;
		},

		defaultFilter: function (frontValue, originalContainer, destination, filtercardSettings) {

			try {

				var check = function (key) {
					return originalContainer.hasOwnProperty(key) && originalContainer[key].value !== '';
				};
				// if this key is present, default filter must be transformed accordingly
				// filtercard
				if (check('defaultFilterKey')) {
					var defaultFilterKey = originalContainer.defaultFilterKey.value;
					var placeholder = originalContainer.defaultPlaceholder.value;

					// use filtercardfilter for filtercards
					var foundFilter = jQuery.grep(filtercardSettings.preloadedSuggestions.filterCardFilter, function(item){
						return item.pholder.table === placeholder && item.value === defaultFilterKey;
					});

					if (foundFilter.length === 1) {
						destination.defaultFilter = BackendLinker.buildFilter(
							foundFilter[0].pholder.table,
							foundFilter[0].pholder.filterOn,
							foundFilter[0].value,
							filtercardSettings.tableMapping
						);
						return;
					}
				} else {
					//attribute
					if (check('eavExpressionKey')) {
						var defaultFilterKey = originalContainer.eavExpressionKey.value;
						var foundFilter = jQuery.grep(filtercardSettings.preloadedSuggestions.attributeEAV, function (item) {
							return item.value === defaultFilterKey && item.pholder.table === originalContainer.defaultPlaceholder.value;
						});

						if (foundFilter.length === 1) {
							var advanceViewValues = BackendLinker.feConfigBuildAttributeAdvanceView(
								foundFilter[0].pholder.table,
								foundFilter[0].pholder.dataSource,
								foundFilter[0].pholder.filterOn,
								foundFilter[0].value,
								originalContainer.eavExpressionFilter.value,
								filtercardSettings.tableMapping
							);

							if (advanceViewValues.defaultFilter !== '') {
								destination.defaultFilter = advanceViewValues.defaultFilter;
							}
							destination.expression = advanceViewValues.expression;
							return;
						}
					}

					if (check('relationExpressionPatientKey')) {
						var defaultFilterKey = originalContainer.relationExpressionPatientKey.value;
						var foundFilter = jQuery.grep(filtercardSettings.preloadedSuggestions.attributeRelationalPatient, function (item) {
							return item.value === defaultFilterKey;
						});

						if (foundFilter.length === 1) {
							var advanceViewValues = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
								foundFilter[0].pholder.table || foundFilter[0].pholder.computedPholder,
								foundFilter[0].value,
								originalContainer.relationExpressionPatientFilter.value,
								filtercardSettings.tableMapping
							);
							if (advanceViewValues.defaultFilter !== '') {
								destination.defaultFilter = advanceViewValues.defaultFilter;
							}
							destination.expression = advanceViewValues.expression;
							return;
						}
					}

					if (check('relationExpressionKey')) {
						var defaultFilterKey = originalContainer.relationExpressionKey.value;
						var foundFilter = jQuery.grep(filtercardSettings.preloadedSuggestions.attributeRelational, function (item) {
							return item.value === defaultFilterKey;
						});

						if (foundFilter.length === 1) {
							var advanceViewValues = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
								foundFilter[0].pholder.table,
								foundFilter[0].pholder.computedPholder || foundFilter[0].value,
								originalContainer.relationExpressionFilter.value,
								filtercardSettings.tableMapping
							);
							if (advanceViewValues.defaultFilter !== '') {
								destination.defaultFilter = advanceViewValues.defaultFilter;
							}
							destination.expression = advanceViewValues.expression;
							return;
						}
					}


				}

				if (frontValue.value === "") {
					return;
				}
					destination.defaultFilter = frontValue.value;
			}
			catch (e) {
				console.error(e);
			}
		},

		domainFilter: function (frontValue, originalContainer, destination) {
			destination.domainFilter = frontValue.value;
		},

		standardConceptCodeFilter: function (frontValue, originalContainer, destination) {
			destination.standardConceptCodeFilter = frontValue.value;
		},

		cohortDefinitionKey: function (frontValue, originalContainer, destination) {
			destination.cohortDefinitionKey = frontValue.value;
		},

		conceptIdentifierType: function (frontValue, originalContainer, destination) {
			destination.conceptIdentifierType = frontValue.value;
		},

		defaultFilterKey: function (frontValue, originalContainer, destination, feConfig) {

			if (frontValue.value === "") {
				return;
			}
			destination.defaultFilterKey = frontValue.value;
		},
		defaultPlaceholder: function (frontValue, originalContainer, destination, feConfig) {

			if (frontValue.value === "") {
				return;
			}
			destination.defaultPlaceholder = frontValue.value;
		},

		eavExpressionKey: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.eavExpressionKey = frontValue.value;
		},

		eavExpressionFilter: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.eavExpressionFilter = frontValue.value;
		},

		relationExpressionKey: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.relationExpressionKey = frontValue.value;
		},

		relationExpressionFilter: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.relationExpressionFilter = frontValue.value;
		},

		relationExpressionPatientKey: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.relationExpressionPatientKey = frontValue.value;
		},

		relationExpressionPatientFilter: function (frontValue, originalContainer, destination) {

			if (frontValue.value === ""
			) {
				return;
			}
			destination.relationExpressionPatientFilter = frontValue.value;
		},

		measureExpression: function (frontValue, originalContainer, destination) {
			if (frontValue.value === ""
				|| !originalContainer.hasOwnProperty("isNormalAttribute")
				|| originalContainer.isNormalAttribute) {
				return;
			}
			destination.measureExpression = frontValue.value;
		},

		referenceExpression: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.referenceExpression = frontValue.value;
		},

		referenceFilter: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.referenceFilter = frontValue.value;
		},
		_referenceExpression: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._referenceExpression = frontValue.value;
		},

		_referenceFilter: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._referenceFilter = frontValue.value;
		},

		isInitialAttribute: function (frontValue, originalContainer, destination) {
			if (frontValue.value === false) {
				return;
			}
			destination.isInitialAttribute = frontValue.value;
		},

		isDisabled: function (frontValue, originalContainer, destination) {
			if (frontValue === false) {
				return;
			}
			destination.isDisabled = frontValue;
		},

		isDefault: function (frontValue, originalContainer, destination) {
			if (frontValue === false) {
				return;
			}
			destination.isDefault = frontValue;
		},

		parentInteraction: function (frontValue, originalContainer, destination) {
			if (!frontValue && frontValue.length <= 0) {
				return;
			}

			destination.parentInteraction = frontValue;
		},

		parentInteractionLabel: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.parentInteractionLabel = frontValue.value;
		},

		allowSameInteraction: function (frontValue, destination) {
			if (frontValue === false) {
				return;
			}
			destination.allowSameInteraction = frontValue;
		},
		otsLanguage: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.otsLanguage = frontValue.value;
		},
		otsSubject: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.otsSubject = frontValue.value;
		},
		otsHierarchyLevel: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.otsHierarchyLevel = frontValue.value;
		},
		otsTermContext: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination.otsTermContext = frontValue.value;
		},
		_otsLanguage: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._otsLanguage = frontValue.value;
		},
		_otsSubject: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._otsSubject = frontValue.value;
		},
		_otsHierarchyLevel: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._otsHierarchyLevel = frontValue.value;
		},
		_otsTermContext: function (frontValue, originalContainer, destination) {
			if (frontValue.value === "") {
				return;
			}
			destination._otsTermContext = frontValue.value;
		},
		annotations: function (frontValue, originalContainer, destination) {
			if (frontValue.length === 0) {
				return;
			}

			destination.annotations = frontValue.map(function (obj) {
				return obj.value;
			});
		}

		// validity : function(frontValue, destination){
		// // the validity property is not transferred to the back-end for the time
		// being
		// }

	};

	/**
	 *
	 * Generate filter expression
	 * @param {string} sTablePholder - table placeholder e.g. @CODE, @INTERACTION
	 * @param {string} sFilterOnPholder - filter column placeholder e.g. @MEASURE.VALUE for EAV
	 * @param {string} sFilterOnValue - the value to check for sFilterOnPholder
	 * @returns {string} - filter expression
	 */
	BackendLinker.buildFilter = function (sTablePholder, sFilterOnPholder, sFilterOnValue, tableMapping) {
		var generatedFilter = "";
		if (sFilterOnValue) {
			generatedFilter = sTablePholder + "."
				+ tableMapping[sFilterOnPholder]
				+ "='" + sFilterOnValue + "'";
		}

		return generatedFilter;
	};

	/**
	 * Builds the defaultFilter and expression for an Attribute Advance view
	 *
	 * @param {string} sTablePholder - table placeholder e.g. @CODE, @INTERACTION
	 * @param {string} sDataSourcePholder - data source column placeholder e.g. @CODE.VALUE
	 * @param {string} sFilterOnPholder - filter column placeholder e.g. @MEASURE.VALUE for EAV
	 * @param {string} sFilterOnValue - the value to check for sFilterOnPholder
	 * @param {string} sAdditionalFilter - any extra filter expression. converts the placeholder $$VALUE to sDataSourcePholder
	 * @returns {any}  {defaultFilter: string; expression: string}
	 */
	BackendLinker.feConfigBuildAttributeAdvanceView = function (sTablePholder,
		sDataSourcePholder, sFilterOnPholder, sFilterOnValue, sAdditionalFilter, tableMapping) {
		var basicFilter = "";
		var expressionValue = "";
		var defaultFilter = [];

		//Build expression
		if (tableMapping[sDataSourcePholder]) {
			expressionValue = sTablePholder + "." + tableMapping[sDataSourcePholder];
		} else {
			expressionValue = sTablePholder + ".\"" + sDataSourcePholder + "\"";
		}

		//Do not build filter if these are not provided
		if (sFilterOnPholder && sFilterOnValue) {
			basicFilter = BackendLinker.buildFilter(sTablePholder, sFilterOnPholder, sFilterOnValue, tableMapping);
		}

		//replace placeholders in extraFilter
		sAdditionalFilter = sAdditionalFilter ? sAdditionalFilter : "";
		sAdditionalFilter = sAdditionalFilter.replace(/\$\$VALUE/g, expressionValue);

		//Build the advance view filter
		if (basicFilter !== "") {
			defaultFilter.push(basicFilter);
		}
		if (sAdditionalFilter !== "") {
			defaultFilter.push("(" + sAdditionalFilter + ")");
		}

		return {
			defaultFilter: defaultFilter.join(" AND "),
			expression: expressionValue
		};
	};

	/**
	 * Generate the advance view for Attribute relational filter
	 *
	 * @param {string} sTablePholder - table placeholder e.g. @CODE, @INTERACTION
	 * @param {string} sDataSourcePholder - data source column placeholder e.g. @CODE.VALUE. or a computer pholder e.g. @@AGE_START
	 * @param {string} sAdditionalFilter - any extra filter expression. converts the placeholder $$VALUE to sDataSourcePholder
	 * @returns {any} {defaultFilter: string; expression: string}
	 */
	BackendLinker.feConfigBuildAttributeRelationalAdvanceView = function (sTablePholder,
		sDataSourcePholder, sAdditionalFilter, tableMapping) {
		var expressionValue = "";

		//Build expression
		if (tableMapping[sDataSourcePholder]) {
			expressionValue = sTablePholder + "." + tableMapping[sDataSourcePholder];
		} else if (BackendLinker._calculatedPholderMap[sDataSourcePholder]) {
			expressionValue = BackendLinker._calculatedPholderMap[sDataSourcePholder];

			//Get all column pholders
			expressionValue.replace(/@[A-Z.]*/g, function (columnMatch, i, str) {
				if (tableMapping[columnMatch]) {
					var tableMatch = columnMatch.match(/@[A-Z]*/);
					if (tableMatch && tableMapping[tableMatch[0]]) {
						expressionValue = expressionValue.replace(columnMatch,
							tableMatch[0] + "." + tableMapping[columnMatch]);
					}
				}
			});
		}
		else {
			expressionValue = sTablePholder + ".\"" + sDataSourcePholder + "\"";
		}

		//replace placeholders in extraFilter. sAdditionalFilter should be a valid conditional expression
		if (sAdditionalFilter === "") {
			sAdditionalFilter = "$$VALUE";
		} else {
			sAdditionalFilter = "CASE WHEN ( " + sAdditionalFilter + " ) THEN ( $$VALUE ) ELSE NULL END";
		}

		sAdditionalFilter = sAdditionalFilter.replace(/\$\$VALUE/g, expressionValue);

		return {
			defaultFilter: "",
			expression: sAdditionalFilter
		};
	};

	BackendLinker._backToFrontPropertyConverter = {

		from: function (backValue, destination) {
			var frontValue = {
				value: [],
				validity: {
					message: "",
					status: "valid"
				}
			};
			for (var key in backValue) {
				if (backValue.hasOwnProperty(key)) {

					if (destination.otsLanguage && destination.otsLanguage.value && key === "@CODE") {
						continue;
					}

					frontValue.value.push({
						placeholder: key,
						table: backValue[key]
					});
				}
			}
			destination.from = frontValue;
		},

		name: function (backValue, destination) {

			// backValue is an array with all the languages, such as [{'lang': '',
			// 'value':'xxx'}, {'lang': 'en', 'value': 'xXx'}, ...]
			if (!destination.langName) {
				destination.langName = {
					value: [],
					validity: {
						message: "",
						status: "valid"
					}
				};
			}

			destination.name = {
				value: "",
				validity: {
					message: "",
					status: "valid"
				}
			};

			var key;
			if (backValue instanceof Array) {
				for (key in backValue) {
					if (backValue.hasOwnProperty(key)) {
						if (backValue[key].lang === "") {
							destination.name.value = backValue[key].value;
						} else {
							var langObj = backValue[key];
							langObj.enabled = true;
							destination.langName.value.push(langObj);
						}
					}
				}
			} else {
				destination.name.value = backValue;
			}
		},

		disabledLangName: function (backValue, destination) {

			// backValue is an array with all the languages, such as [{'lang': '',
			// 'value':'xxx'}, {'lang': 'en', 'value': 'xXx'}, ...]

			if (!destination.langName) {
				destination.langName = {
					value: [],
					validity: {
						message: "",
						status: "valid"
					}
				};
			}

			var key;
			if (backValue instanceof Array) {
				for (key in backValue) {
					if (backValue.hasOwnProperty(key)) {
						if (!(backValue[key].lang === "")) {
							var langObj = backValue[key];
							langObj.enabled = false;
							destination.langName.value.push(langObj);
						}
					}
				}
			} else {
				destination.name.value = backValue;
			}
		},

		type: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.type = frontValue;
		},

		expression: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.expression = frontValue;
			destination.isNormalAttribute = true;
		},

		defaultFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.defaultFilter = frontValue;

			// find the placeholder from the defaultFilter
			var match = /@[A-Z]+/.exec(backValue);
			var placeholder = "";
			
			if (match) {
				placeholder = match.length === 1 ? match[0] : "";
				
				if (placeholder !== "") {
					destination.defaultPlaceholder = {
						value: placeholder,
						validity: {
							message: "",
							status: "valid"
						}
					};
				}
			}
		},

		defaultPlaceholder: function (backValue, destination) {
			if (backValue !== "") {
				destination.defaultPlaceholder = {
					value: backValue,
					validity: {
						message: "",
						status: "valid"
					}
				};
				return;
			}
			destination.defaultPlaceholder = destination.defaultPlaceholder;
		},

		defaultFilterKey: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.defaultFilterKey = frontValue;
		},

		eavExpressionKey: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.eavExpressionKey = frontValue;
		},

		eavExpressionFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.eavExpressionFilter = frontValue;
		},

		relationExpressionKey: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.relationExpressionKey = frontValue;
		},

		relationExpressionFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.relationExpressionFilter = frontValue;
		},

		relationExpressionPatientKey: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.relationExpressionPatientKey = frontValue;
		},

		relationExpressionPatientFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.relationExpressionPatientFilter = frontValue;
		},

		measureExpression: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.measureExpression = frontValue;
			destination.isNormalAttribute = false;
		},

		domainFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.domainFilter = frontValue;
		},

		standardConceptCodeFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.standardConceptCodeFilter = frontValue;
		},

		cohortDefinitionKey: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.cohortDefinitionKey = frontValue;
		},

		conceptIdentifierType: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.conceptIdentifierType = frontValue;
		},

		parentInteraction: function (backValue, destination) {
			if (!backValue && backValue.length <= 0) {
				return;
			}

			destination.parentInteraction = backValue;
		},

		parentInteractionLabel: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.parentInteractionLabel = frontValue;
		},

		referenceExpression: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.referenceExpression = frontValue;
			destination.isCatalogAttribute = true;
		},

		referenceFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.referenceFilter = frontValue;
			destination.isCatalogAttribute = true;
		},

		_referenceExpression: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.referenceExpression = frontValue;
		},

		_referenceFilter: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.referenceFilter = frontValue;
		},

		isInitialAttribute: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.isInitialAttribute = frontValue;
		},
		otsLanguage: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsLanguage = frontValue;
			destination.isOTSAttribute = true;
		},
		otsSubject: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsSubject = frontValue;
			destination.isOTSAttribute = true;
		},
		otsHierarchyLevel: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsHierarchyLevel = frontValue;
			destination.isOTSAttribute = true;
		},
		otsTermContext: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsTermContext = frontValue;
			destination.isOTSAttribute = true;
		},
		_otsLanguage: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsLanguage = frontValue;
		},
		_otsSubject: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsSubject = frontValue;
		},
		_otsHierarchyLevel: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsHierarchyLevel = frontValue;
		},
		_otsTermContext: function (backValue, destination) {
			var frontValue = {
				value: backValue,
				validity: {
					message: "",
					status: "valid"
				}
			};
			destination.otsTermContext = frontValue;
		},

		annotations: function (backValue, destination) {
			if (backValue.length === 0) {
				return [];
			}
			destination.annotations = backValue.map(function (obj) {
				var newObj = {
					value: obj
				};
				return newObj;
			});
		}

	};

	BackendLinker.getAttributeTypes = function (callback) {
		return BackendLinker
			._postJson(
				{
					url: "/hc/hph/cdw/services/cdw_services.xsjs?action=attributeType_service",
					data: JSON.stringify({})
				}, callback);
	};

	BackendLinker.filterSuggestion = function (data, callback) {

		return BackendLinker
			._postJson(
				{
					url: "/hc/hph/cdw/services/cdw_services.xsjs?action=table_suggestion_service",
					data: JSON.stringify({
						expression: data.expression,
						table: data.table,
						mapping: data.mapping
					})
				}, callback);

	};

	BackendLinker.columnFilterSuggestion = function (data, callback) {
		return BackendLinker
			._postJson(
				{
					url: "/hc/hph/cdw/services/cdw_services.xsjs?action=column_suggestion_service",
					data: JSON.stringify({
						table: data.table,
						mapping: data.mapping
					})
				}, callback);

	};

	BackendLinker.getColumns = function (dbObjectList) {
		return BackendLinker._postJson({
			data: JSON.stringify({
				action: "getColumns",
				dbObjectList: dbObjectList
			})
		});
	};

	BackendLinker.getDefaultMapping = function () {
		return BackendLinker._postJson({
			data: JSON.stringify({
				action: "default_mapping"
			})
		}, function (status, oData) {
			if (status === "success") {
				BackendLinker._defaultAdvancedSettings = JSON.parse(JSON.stringify(oData));
				BackendLinker._defaultAdvancedSettings.guardedTableMapping = {};
				BackendLinker._defaultAdvancedSettings.guardedTableMapping[
					oData.tableTypePlaceholderMap.factTable.placeholder
				] = oData.guardedTableMapping[oData.tableTypePlaceholderMap.factTable.placeholder];
			}
		});
	};

	BackendLinker.getDefaultMapping();
	return BackendLinker;
});