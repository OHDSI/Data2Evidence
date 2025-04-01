sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "hc/hph/cdw/config/ui/lib/ConfigModelsData",
    "hc/hph/cdw/config/ui/lib/ConfigJSONModel"
], function (jQuery, ConfigUtils, BackendLinker, ConfigModelsData, JSONModel) {
    "use strict";

    var ConfigModelsManager = function () {
        this._eventBus = sap.ui.getCore().getEventBus();

        ConfigUtils.logDebug("ConfigModelsManager.ctor");
        this._configModelsData = new ConfigModelsData();
        this._oJSONModels = {
            configGeneralJSONModel: null,
            configOverviewJSONModel: null,
            configEditorJSONModel: null
        };

        this._preloadedSuggestions = {
            filterCardFilter: [],
            attributeEAV: [],
            attributeRelational: [],
            attributeRelationalPatient: []
        };
    
        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE_AND_ACTIVATION,
            this._saveAndActivateConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_MULTIPLE_CONFIG_PRESSED,
            this._deleteMultipleConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ANNOTATION_ATTRIBUTE,
            this._addAnnotationToAttribute, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_ANNOTATION_ATTRIBUTE,
            this._deleteAnnotationToAttribute, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
            this._updateIDValidation, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_QUERY_CHECK,
            this._queryCheck, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_VALIDATION,
            this._validateConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE,
            this._saveConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION,
            this._activateConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ATTRIBUTE,
            this._addNewAttribute, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ELEM,
            this._addNewElementToArray, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_FILTER_CARD,
            this._addNewFilterCard, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
            this._removeElementFromArrayEvt, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_ELEM,
            this._duplicateElementFromArray, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_ELEM_FROM_OTHER,
            this._duplicateElementFromOther, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ACCEPT_ELEM,
            this._acceptSuggestedElement, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_CONDITION,
            this._addNewConditionType, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REORDER_ARRAY,
            this._reorderArrayModel, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED,
            this._deleteConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_PRESSED,
            this._deleteConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CREATE_CONFIG,
            this._createConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_CONFIG,
            this._duplicateConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_IMPORT_CONFIG,
            this._importConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_OTS_ACTIVATION,
            this._otsActivation, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE,
            this._autoValidateSaveConfig, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_UPDATE_PARENT_INTERACTION,
            this._updateParentInteraction, this);

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_LOAD_SUGGESTION,
            this._eventReloadSuggestions, this);
        
        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER,
            this._eventFiltercardChangePlaceholder, this);
    };

    /**
     * Cleanly destroys a ConfigModelsManager instance. It unsubscribes from all the events.
     *
     */
    ConfigModelsManager.prototype.destroy = function () {
        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE_AND_ACTIVATION,
            this._saveAndActivateConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_MULTIPLE_CONFIG_PRESSED,
            this._deleteMultipleConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ANNOTATION_ATTRIBUTE,
            this._addAnnotationToAttribute, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_ANNOTATION_ATTRIBUTE,
            this._deleteAnnotationToAttribute, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_QUERY_CHECK,
            this._queryCheck, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
            this._updateIDValidation, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_VALIDATION,
            this._validateConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_SAVE,
            this._saveConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION,
            this._activateConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ATTRIBUTE,
            this._addNewAttribute, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ELEM,
            this._addNewElementToArray, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_FILTER_CARD,
            this._addNewFilterCard, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
            this._removeElementFromArrayEvt, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_ELEM,
            this._duplicateElementFromArray, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ACCEPT_ELEM,
            this._acceptSuggestedElement, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_CONDITION,
            this._addNewConditionType, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_REORDER_ARRAY,
            this._reorderArrayModel, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED,
            this._deleteConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_PRESSED,
            this._deleteConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CREATE_CONFIG,
            this._createConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_CONFIG,
            this._duplicateConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_IMPORT_CONFIG,
            this._importConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_OTS_ACTIVATION,
            this._otsActivation, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE,
            this._autoValidateSaveConfig, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_UPDATE_PARENT_INTERACTION,
            this._updateParentInteraction, this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_LOAD_SUGGESTION,
            this._eventReloadSuggestions, this);
        
        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER,
            this._eventFiltercardChangePlaceholder, this);
    };

    ConfigModelsManager.prototype._eventFiltercardChangePlaceholder = function (sChannelId, sEventId, oEventData) {
        var allData = this._oJSONModels.configEditorJSONModel.getData();
        var currentData = this._getDataElementFromPath(oEventData.path);
        var dimTableList = jQuery.grep(allData.tableTypePlaceholderMap.dimTables, function (dim) {
            return dim.placeholder === oEventData.placeholder;
        });
        
        if (dimTableList.length === 0) {
            return;
        }

        var dimTable = dimTableList[0];

        // currentData.defaultFilter.value = "";

        if (!dimTable.hierarchy) {
            currentData.parentInteraction = [];
            currentData.parentInteractionLabel.value = "";
        }

        if (!dimTable.oneToN) {
            currentData.defaultFilterKey.value = "";
            currentData.defaultFilter.value = "1=1";
        }

        this._oJSONModels.configEditorJSONModel.setProperty(oEventData.path, currentData);
       
    };

    ConfigModelsManager.prototype._eventReloadSuggestions = function (sChannelId, sEventId, oEventData) {
        var triggerOnThese = [
            "@INTERACTION",
            "@CODE",
            "@MEASURE",
            "@PATIENT"
        ];

        if (triggerOnThese.indexOf(oEventData.key) === -1) {
            return;
        }

        this._reloadSuggestions();
    };

    ConfigModelsManager.prototype._reloadSuggestions = function () {
        var that = this;
        var convertedBeConfig;
        var configEditorModelData = that._oJSONModels.configEditorJSONModel.getData();

        this.convertFrontendConfig(configEditorModelData, function (result, meta, beConfig, feErrors) {
            if (result === "error") {
                ConfigUtils.logError("error", arguments);
            } else {
                convertedBeConfig = beConfig;
            }
        });

        return this._loadSuggestions(convertedBeConfig, configEditorModelData)
            .then(function (result) {
                that._oJSONModels.configEditorJSONModel.setData(result);
            });
    };

    /**
   * Helper method for adding items to the suggestion list
   *
   * @param {preloadedSuggestions} _preloadedSuggestions
   */
    ConfigModelsManager.prototype._addSuggestions = function (_preloadedSuggestions) {
//TODO: DEFAULT PLACEHOLDERS SHOULD BE EXTRACTED FROM  defaultFilter FIELD OF INTERACTION
        return {
            filterCardFilter: function (oSuggestion, placeholder) {
                var item = {
                    pholder: {
                        table: placeholder || "@INTERACTION",
                        filterOn: placeholder + ".INTERACTION_TYPE"
                    },
                    value: oSuggestion
                };
                _preloadedSuggestions.filterCardFilter.push(item);
                return item;
            },
            attributeEAV: function (oSuggestion, placeholder) {
                var item = {
                    pholder: {
                        table: placeholder || "@CODE",
                        dataSource: placeholder + ".VALUE",
                        filterOn: placeholder + ".ATTRIBUTE"
                    },
                    value: oSuggestion
                };
                _preloadedSuggestions.attributeEAV.push(item);
                return item;
            },
            attributeRelational: function (oSuggestion, placeholder) {
                var item = {
                    pholder: {
                        table: placeholder || "@INTERACTION"
                    },
                    value: oSuggestion
                };
                _preloadedSuggestions.attributeRelational.push(item);
                return item;
            },
            attributeRelationalPatient: function (oSuggestion, placeholder) {
                var item = {
                    pholder: {
                        table: placeholder || "@PATIENT"
                    },
                    value: oSuggestion
                };
                _preloadedSuggestions.attributeRelationalPatient.push(item);
                return item;
            },
            attributeRelationalComputed: function (oComputed) {
                var item = {
                    pholder: {
                        table: "computed",
                        computedPholder: oComputed.computedPholder
                    },
                    value: oComputed.value
                };
                _preloadedSuggestions.attributeRelational.push(item);
                return item;
            }
        };
    };

    /**
       * Method to load suggestion from backend
       *
       */
    ConfigModelsManager.prototype._preloadSuggestions = function (mapping, tableTypePlaceholderMap) {
        //load as default suggestions
        this._preloadedSuggestions = {
            filterCardFilter: [],
            attributeEAV: [],
            attributeRelational: [],
            attributeRelationalPatient: []
        };
        
        var suggestionProcessor = this._addSuggestions(this._preloadedSuggestions);

        // //Insert computed expressions
        // suggestionProcessor.attributeRelationalComputed({
        //     value: "{AGE AT START}",
        //     computedPholder: "@@AGE_START"
        // });
        // suggestionProcessor.attributeRelationalComputed({
        //     value: "{AGE AT END}",
        //     computedPholder: "@@AGE_END"
        // });

        return $.when.apply($, tableTypePlaceholderMap.dimTables
            .reduce(function (list, dim) {
                
                list.push(BackendLinker.filterSuggestion({
                    expression: dim.placeholder + ".INTERACTION_TYPE",
                    table: dim.placeholder,
                    mapping: mapping
                }, function (result, data) {
                    if (result !== "error") {
                        data.data.forEach(function (item) {
                            suggestionProcessor.filterCardFilter(item.value, dim.placeholder);
                        });
                    }
                    }));
                
                list.push(BackendLinker.columnFilterSuggestion({
                    table: dim.placeholder,
                    mapping: mapping
                }, function (result, data) {
                    if (result !== "error") {
                        data.data.forEach(function (item) {
                            suggestionProcessor.attributeRelational(item.value, dim.placeholder);
                        });
                    }
                    }));
                
                return list.concat(dim.attributeTables.map(function (a) {
                    return BackendLinker.filterSuggestion({
                        expression: a.placeholder + ".ATTRIBUTE",
                        table: a.placeholder,
                        mapping: mapping
                    }, function (result, data) {
                        if (result !== "error") {
                            data.data.forEach(function (item) {
                                suggestionProcessor.attributeEAV(item.value, a.placeholder);
                            });
                        }
                    });  
                }));                
                
            }, [
                BackendLinker.columnFilterSuggestion({
                    table: tableTypePlaceholderMap.factTable.placeholder,
                    mapping: mapping
                }, function (result, data) {
                    if (result !== "error") {
                        data.data.forEach(function (item) {
                            suggestionProcessor.attributeRelationalPatient(item.value, tableTypePlaceholderMap.factTable.placeholder);
                        });
                    }
                })
            ]));       
    };


    ConfigModelsManager.prototype._addAnnotationToAttribute = function (sChannelId, sEventId, oEventData) {
        var allData = this._oJSONModels.configEditorJSONModel.getData();
        var currentData = this._getDataElementFromPath(oEventData.Path);
        var annotationText = oEventData.Token;
        currentData.annotations.push({ value: annotationText });

        this._oJSONModels.configEditorJSONModel.setData(allData);
    };

    ConfigModelsManager.prototype._deleteAnnotationToAttribute = function (sChannelId, sEventId, oEventData) {
        var allData = this._oJSONModels.configEditorJSONModel.getData();
        var currentData = this._getDataElementFromPath(oEventData.Path);
        var annotationText = oEventData.Token;

        currentData.annotations = currentData.annotations.filter(function (obj) {
            return !(obj.value === annotationText);
        });

        this._oJSONModels.configEditorJSONModel.setData(allData);
    };

    /**
     * Get the columns for the placeholders and save it in the model. 
     * - configEditorModel.tableMapping
     * - configEditorModel.tableTypePlaceholderMap.**.columns
     * enrich configeditorjsonmodel with placeholder columns
     */
    ConfigModelsManager.prototype.loadPlaceholderColumns = function (configForUi) {

        var pholderKeys = $.extend(
            this._configModelsData.getAllPlaceholdersFromUI(configForUi.configEditorModelData.tableTypePlaceholderMap, {includeTablesOnly: true}),
            this._configModelsData.getAllPlaceholdersFromUI(configForUi.configEditorModelData.otherPlaceholders.refPlaceholder, {includeTablesOnly: true}),
            this._configModelsData.getAllPlaceholdersFromUI(configForUi.configEditorModelData.otherPlaceholders.textPlaceholder, {includeTablesOnly: true})
        );
        configForUi.configEditorModelData.tableColumns = {};

        var objectList = Object.keys(pholderKeys).reduce(function (acc, key) {
            if (pholderKeys[key]) {
                acc.push({
                    key: key,
                    value: pholderKeys[key]
                });
            }
            return acc;
        }, []);

        return BackendLinker.getColumns(objectList)
            .then((function (data) {
                function set(t) {
                    // update tableTypeplaceholders with columns from db
                    ConfigUtils.JSONFindAndDo(t,
                        function (obj, key) {
                            return key === "placeholder";
                        },
                        function (obj, key) {
                            obj.columns = [];
                            if (configForUi.configEditorModelData.tableColumns[obj.placeholder]) {
                                obj.columns = configForUi.configEditorModelData.tableColumns[obj.placeholder];
                            }
                        });   
                }

                configForUi.configEditorModelData.tableColumns = data.result;
                set(configForUi.configEditorModelData.tableTypePlaceholderMap);
                set(configForUi.configEditorModelData.otherPlaceholders.refPlaceholder);
                set(configForUi.configEditorModelData.otherPlaceholders.textPlaceholder);
                return configForUi;
            }).bind(this));
    };

    /**
     * Builds the suggestion list
     *
     * @param {configEditorModel} configForUi configEditorModel JSON object
     * @returns {configEditorModel} configEditorModel JSON object
     */
    ConfigModelsManager.prototype._loadSuggestions = function (beConfig, configForUi) {
        // Do all backend calls to build the finally build the frontend config
        return this._preloadSuggestions(
            beConfig.advancedSettings.tableMapping,
            beConfig.advancedSettings.tableTypePlaceholderMap)
            .then((function () {
                return this.loadPlaceholderColumns(configForUi);
            }).bind(this))
            .then((function (result) {
                //_configForUi = result;
                var preloadedSuggestions = JSON.parse(JSON.stringify(this._preloadedSuggestions));
                var interactionID;
                var suggestionProcessor = this._addSuggestions(preloadedSuggestions);
                var tableMapping = this._configModelsData.getFETableMapping(configForUi.configEditorModelData);

                function setupInteraction(interaction) {
                    var existInPreloaded, newObj, attribute, filterItem, advanceView;
                    if (interaction.defaultFilterKey && (!(interaction.defaultFilterKey.value === ""))) {
                        existInPreloaded = false;
                        for (var preloaded in preloadedSuggestions.filterCardFilter) {
                            filterItem = preloadedSuggestions.filterCardFilter[preloaded];
                            if (interaction.defaultFilterKey.value === filterItem.value) {
                                existInPreloaded = true;
                                break;
                            }
                        }
                        if (!existInPreloaded) {
                            filterItem = suggestionProcessor.filterCardFilter(
                                interaction.defaultFilterKey.value,
                                interaction.defaultPlaceholder.value);
                        }
                        //build defaultFilter
                        interaction.defaultFilter.value = BackendLinker.buildFilter(
                            filterItem.pholder.table,
                            filterItem.pholder.filterOn,
                            filterItem.value,
                            tableMapping
                        );
                    }

                    for (var attributeID in interaction.attributes) {
                        attribute = interaction.attributes[attributeID];
                        if (attribute.relationExpressionPatientKey && (!(attribute.relationExpressionPatientKey.value === ""))) {
                            existInPreloaded = false;
                            for (var preloaded in preloadedSuggestions.attributeRelationalPatient) {
                                filterItem = preloadedSuggestions.attributeRelationalPatient[preloaded];
                                if (attribute.relationExpressionPatientKey.value === filterItem.value) {
                                    existInPreloaded = true;
                                    break;
                                }
                            }
                            if (!existInPreloaded) {
                                filterItem = suggestionProcessor.attributeRelationalPatient(
                                    attribute.relationExpressionPatientKey.value,
                                    attribute.defaultPlaceholder.value);
                            }
                            //build advance view expression and filter
                            advanceView = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
                                filterItem.pholder.table,
                                filterItem.pholder.computedPholder || filterItem.value,
                                attribute.relationExpressionPatientFilter.value,
                                tableMapping
                            );

                            attribute.defaultFilter.value = advanceView.defaultFilter;
                            attribute.expression.value = advanceView.expression;
                        }
                        if (attribute.relationExpressionKey && (!(attribute.relationExpressionKey.value === ""))) {
                            existInPreloaded = false;
                            for (var preloaded in preloadedSuggestions.attributeRelational) {
                                filterItem = preloadedSuggestions.attributeRelational[preloaded];
                                if (attribute.relationExpressionKey.value === filterItem.value) {
                                    existInPreloaded = true;
                                    break;
                                }
                            }
                            if (!existInPreloaded) {
                                filterItem = suggestionProcessor.attributeRelational(
                                    attribute.relationExpressionKey.value,
                                    attribute.defaultPlaceholder.value);
                            }
                            //build advance view expression and filter
                            advanceView = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
                                filterItem.pholder.table,
                                filterItem.pholder.computedPholder || filterItem.value,
                                attribute.relationExpressionFilter.value,
                                tableMapping
                            );

                            attribute.defaultFilter.value = advanceView.defaultFilter;
                            attribute.expression.value = advanceView.expression;
                        }
                        if (attribute.eavExpressionKey && attribute.eavExpressionKey.value !== "") {
                            existInPreloaded = false;
                            for (var preloaded in preloadedSuggestions.attributeEAV) {
                                filterItem = preloadedSuggestions.attributeEAV[preloaded];
                                if (attribute.eavExpressionKey.value === filterItem.value 
                                    && attribute.defaultPlaceholder.value === filterItem.pholder.table) {
                                    existInPreloaded = true;
                                    break;
                                }
                            }
                            if (!existInPreloaded) {
                                //need to check if from @CODE or @MEASURES
                                //suggestionProcessor.attributeEAVMeasures(attribute.eavExpressionKey.value);
                                filterItem = suggestionProcessor.attributeEAV(
                                    attribute.eavExpressionKey.value,
                                    attribute.defaultPlaceholder.value);
                            }
                            //build advance view expression and filter
                            advanceView = BackendLinker.feConfigBuildAttributeAdvanceView(
                                filterItem.pholder.table,
                                filterItem.pholder.dataSource,
                                filterItem.pholder.filterOn,
                                filterItem.value,
                                attribute.eavExpressionFilter.value,
                                tableMapping
                            );

                            attribute.defaultFilter.value = advanceView.defaultFilter;
                            attribute.expression.value = advanceView.expression;
                        }
                    }
                }

                for (interactionID in configForUi.configEditorModelData.filterCards) {
                    setupInteraction(configForUi.configEditorModelData.filterCards[interactionID]);
                }

                for (interactionID in configForUi.configEditorModelData.generalSettingsFilterCards) {
                    setupInteraction(configForUi.configEditorModelData.generalSettingsFilterCards[interactionID]);
                }

                configForUi.configEditorModelData.preloadedSuggestions = preloadedSuggestions;
                return configForUi;
            }).bind(this));
    };

    /**
     * Creates a new basic config and sets it to the CONFIG_EDITOR model.
     *
     * @param {String}
     *            sChannelId Event Channel Id (unused).
     * @param {String}
     *            sEventId Event Id (unused).
     * @param {Object}
     *            oEventData Event Data containing the configuration name.
     */
    ConfigModelsManager.prototype._createConfig = function (
        sChannelId, sEventId, oEventData) {
        var configurationName = oEventData.configurationName;
        var beConfig = BackendLinker.getSkeletonConfig();
        var meta = {
            configName: configurationName,
            configVersion: "1",
            configId: ""
        };

        var that = this;
        BackendLinker.getConfigDefaults(function (result, mConfigDefaults) {
            if (result === "error") {
                ConfigUtils.logError("error", mConfigDefaults);
                that.loadBeConfig(meta, beConfig);
            } else {
                BackendLinker.getTemplateConfig(function (result, mTemplate) {
                    if (result === "error") {
                        ConfigUtils.logError("error", mTemplate);
                        that.loadBeConfig(meta, mConfigDefaults);
                    } else {
                        that.loadBeConfig(meta, mConfigDefaults, mTemplate);
                    }
                });
            }
        });

    };

    /**
     * Creates a new basic config from another config object and sets it to the
     * CONFIG_EDITOR model.
     *
     * @param {String}
     *            sChannelId Event Channel Id (unused).
     * @param {String}
     *            sEventId Event Id (unused).
     * @param {Object}
     *            oEventData Event Data containing the configuration name, id,
     *            version and config object to use.
     */
    ConfigModelsManager.prototype._importConfig = function (
        sChannelId, sEventId, oEventData) {

        var beConfig = oEventData.importedConfig;

        var meta = {
            configName: oEventData.configurationName,
            configVersion: oEventData.configVersion,
            configId: oEventData.configId
        };

        var that = this;
        BackendLinker.getTemplateConfig(function (result, oData) {
            if (result === "error") {
                ConfigUtils.logError("error", oData);
                that.loadBeConfig(meta, beConfig);
            } else {
                that.loadBeConfig(meta, beConfig, oData);
            }
        });
    };

    ConfigModelsManager.prototype._otsActivation = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var currentData = allData;

        var objToDuplicateInfo = this._findObjectByPath(currentData, oEventData.path);

        var objToDuplicate = objToDuplicateInfo[0].from.value;

        var index;

        objToDuplicateInfo[0].from.value.forEach(function (el) {
            if (el.placeholder === "@CODE") {
                ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "HPH_CDM_CFG_OTS_MAPPING_EXIST", "");
            }
        });

        objToDuplicateInfo[0].from.value = objToDuplicate.filter(function (el) {
            return el.placeholder !== "@CODE";
        });
    };


    ConfigModelsManager.prototype._duplicateConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;

        var configurationName = oEventData.configurationName;

        var baseConfigMeta = {
            configId: oEventData.baseConfigId,
            configVersion: oEventData.baseConfigVersion.toString()
        };

        BackendLinker.getBEConfig(baseConfigMeta, function (result, oData) {
            if (result === 'error') {
                ConfigUtils
                    .logError("error", oData, true);
                var text = "HPH_CDM_CFG_LOAD_FAILED";
                var title = "HPH_CDM_CFG_ERROR";
                var suffix = oData ? ": " + oData : "";
                ConfigUtils.createAlertDialog(title, text, suffix);
            } else {
                var beConfig = oData.config;
                var meta = {
                    configName: configurationName,
                    configVersion: "1",
                    configId: ""
                };
                var template = oData.template;
                that.loadBeConfig(meta, beConfig, template);

            }

        });
    };

    ConfigModelsManager.prototype.ConfigLevel = {
        CONFIG: 0,
        FILTER_CARDS_LIST: 1,
        FILTER_CARD: 2,
        ATTRIBUTE: 3,
        NONE: 4
    };

    ConfigModelsManager.prototype.buildConfigGeneralModel = function (
        callBack) {

        ConfigUtils
            .logDebug("ConfigModelsManager.buildConfigGeneralModel");
        this._oJSONModels.configGeneralJSONModel = null;

        var configModelsData = this._configModelsData.getModelData();

        this._oJSONModels.configGeneralJSONModel = new JSONModel(
            configModelsData.configGeneralModelData);

        callBack(this._oJSONModels.configGeneralJSONModel);

    };

    ConfigModelsManager.prototype.buildConfigOverviewModel = function (
        callBack) {

        ConfigUtils
            .logDebug("ConfigModelsManager.buildConfigOverviewModel");
        var that = this;
        this._oJSONModels.configOverviewJSONModel = null;

        BackendLinker
            .getConfigOverview(function (result, oData) {

                var configModelsData = that._configModelsData.getModelData();

                if (result === "error") {
                    ConfigUtils.logError("error",
                        oData, true);

                    // Update the model data with an empty object

                    that._configModelsData._initConfigOverviewModelData();

                    oData = configModelsData.configOverviewModelData.configurations;

                }

                ConfigUtils.logDebug(
                    "CONFIG OVERVIEW DATA:", oData);

                try {
                    if (!oData) {
                        throw "oData not valid";
                    }

                    configModelsData.configOverviewModelData.configurations = oData;
                    configModelsData.configOverviewModelData.configurations
                        .forEach(function (config) {
                            config.panelExpanded = false;
                            config.deleteFlagSelect = false;
                            config.deleteFlagAllVersion = false;

                            config.versions.forEach(function (version) {
                                version.deleteFlagSelect = false;
                            });

                        });

                    that._oJSONModels.configOverviewJSONModel = new JSONModel(
                        configModelsData.configOverviewModelData);

                    callBack(that._oJSONModels.configOverviewJSONModel);

                } catch (e) {
                    ConfigUtils.logError(e);
                }

            });
    };

    ConfigModelsManager.prototype.buildConfigEditorModel = function (
        meta, callBack) {

        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.buildConfigEditorModel");

        this._oJSONModels.configEditorJSONModel = null;

        BackendLinker
            .getBEConfig(
            meta,
            function (result, oData) {
                var configForUi;
                if (result === "error") {

                    ConfigUtils.logError(
                        "error", oData, true);

                    configForUi = that._configModelsData.getModelData();

                    that._oJSONModels.configEditorJSONModel = new JSONModel(
                        configForUi.configModel);

                    callBack(that._oJSONModels.configEditorJSONModel);
                } else {

                    ConfigUtils.logDebug(
                        "CONFIG DATA:", oData);

                    try {
                        if (!oData) {
                            throw "oData not valid";
                        }
                        var meta = oData.meta;
                        var config = oData.config;
                        configForUi = that._convertBackendConfig(meta,
                            config);

                        var template = oData.template;
                        configForUi = that._loadTemplates(template, configForUi);
                        that._loadSuggestions(config, configForUi)
                            .then(function (result) {
                                configForUi = result;
                                that._oJSONModels.configEditorJSONModel = new JSONModel(
                                    configForUi.configEditorModelData);
                                callBack(that._oJSONModels.configEditorJSONModel);
                            });

                    } catch (e) {
                        ConfigUtils
                            .logError(e);
                    }
                }

            });

    };

    ConfigModelsManager.prototype.cleanConfigEditorModel = function (
        meta, callback) {

        ConfigUtils
            .logDebug("ConfigModelsManager.cleanConfigEditorModel");

        this._configModelsData._initConfigEditorModelData();

        var configModelsData = this._configModelsData.getModelData();

        if (typeof meta.configName === "string") {
            configModelsData.configEditorModelData.configName = meta.configName;
        }

        if (typeof meta.configId === "string") {
            configModelsData.configEditorModelData.configId = meta.configId;
        }

        if (typeof meta.configVersion === "string") {
            configModelsData.configEditorModelData.configVersion = meta.configVersion;
        }

        // this._oJSONModels.configEditorJSONModel = new JSONModel(
        //     configModelsData.configEditorModelData);

    };

    ConfigModelsManager.prototype._getDataElementFromPath = function (
        path, modelName) {

        var allData = this._getDataOfModel(modelName);

        var currentData = allData;

        var pathArr = path.split("/");
        if (!pathArr[0]) {
            pathArr = pathArr.slice(1);
        }

        // traverse the data using the path
        for (var i = 0; i < pathArr.length; i++) {
            currentData = currentData[pathArr[i]];
        }

        return currentData;
    };

    ConfigModelsManager.prototype.loadBeConfig = function (
        meta, beConfig, template) {
        var configForUi = this._convertBackendConfig(meta, beConfig);
        configForUi = this._loadTemplates(template, configForUi);
        this._loadSuggestions(beConfig, configForUi)
            .then((function (result) {
                configForUi = result;
                this._oJSONModels.configEditorJSONModel = new JSONModel(
                    configForUi.configEditorModelData);

                this._eventBus.publish(
                    ConfigUtils.configEvents.EVENT_CONFIG_CONFIG_CHANGED, {
                        configEditorJSONModel: this._oJSONModels.configEditorJSONModel
                    });
        // TODO: change to a local (@Component) model instead of @ core
        // sap.ui.getCore().setModel(this._oJSONModels.configEditorJSONModel,
        // ConfigUtils.models.CONFIG_EDITOR);

            }).bind(this));
    };

    ConfigModelsManager.prototype._queryCheck = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.validateConfig");
        var feConfig = oEventData.feConfig;

        var genericErrorString = "HPH_CDM_CFG_ERROR";
        var genericSuccessString = "HPH_CDM_CFG_SUCCESS";
        var convertedBeConfig;
        var queryErrors;

        var feErrors;
        var feWarnings;

        that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: true });

        function callbackFEValidation(result, oData) {
            var text, title, suffix;
            if (result === "error") {
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
            } else {
                if (oData.validationResult.cdmConfigValidationResult.errors.length === 0
                    && oData.validationResult.advancedConfigValidationResult.messages.length === 0) {
                    title = genericSuccessString;
                    text = "HPH_CDM_CFG_QUERY_VALIDITY_OK";
                    feErrors = [];
                    feWarnings = oData.validationResult.cdmConfigValidationResult.warnings;
                    callbackValidation(result, oData);
                } else {
                    text = "HPH_CDM_CFG_VALIDITY_ERROR";
                    title = genericErrorString;
                    that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                                                oData.validationResult.advancedConfigValidationResult.messages,
                                                oData.validationResult.cdmConfigValidationResult.warnings);
                    ConfigUtils.createAlertDialog(title, text, suffix);
                    that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
                }
            }

        }

        function callbackValidation(result, oData) {
            var text;
            var title;
            var suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);
                that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
            } else {
                //Update
                var modelData = that._configModelsData.getModelData();
                var allErrors = oData.validationResult.cdmConfigValidationResult.errors.concat(oData.validationResult.advancedConfigValidationResult.messages);
                modelData.configEditorModelData.queryValidation = allErrors;
                that._configModelsData._configModelsData = modelData;
                queryErrors = allErrors;

                if (queryErrors.length === 0) {
                    text = "HPH_CDM_CFG_QUERY_VALIDITY_OK";
                    title = genericSuccessString;
                } else {
                    text = "HPH_CDM_CFG_QUERY_VALIDITY_ERROR";
                    title = genericErrorString;
                }

                ConfigUtils.createAlertDialog(title, text, suffix);
                that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
            }
            that._updateConfigValidStates(feErrors, queryErrors, feWarnings);
        }

        function callbackConfigConversion(result, meta, beConfig, feErrors) {
            var text, suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);

                text = "HPH_CDM_CFG_ERROR_CONVERT_FAILED";
                suffix = beConfig ? ": " + beConfig : "";

                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);
                that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
            } else {
                convertedBeConfig = beConfig;
                BackendLinker.validateConfig(beConfig, callbackFEValidation);
            }
        }

        this.convertFrontendConfig(feConfig, callbackConfigConversion);

    };

    ConfigModelsManager.prototype._validateConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.validateConfig");
        var feConfig = oEventData.feConfig;

        var genericErrorString = "HPH_CDM_CFG_ERROR";
        var genericSuccessString = "HPH_CDM_CFG_SUCCESS";

        function callbackValidation(result, oData) {
            var text, title, suffix;
            if (result === "error") {
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
            } else if (oData.validationResult.cdmConfigValidationResult.errors.length === 0
                        && oData.validationResult.advancedConfigValidationResult.messages.length === 0) {
                // No errrors found
                title = genericSuccessString;
                if (oData.validationResult.cdmConfigValidationResult.warnings.length === 0) {
                    text = "HPH_CDM_CFG_VALIDITY_OK";
                } else {
                    text = "HPH_CDM_CFG_VALIDITY_WARNING";
                }
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);

            } else {
                // Errors found
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
            }

            ConfigUtils.createAlertDialog(title, text, suffix);
        }

        function callbackConfigConversion(result, meta, beConfig, feErrors) {
            var text, suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);

                text = "HPH_CDM_CFG_ERROR_CONVERT_FAILED";
                suffix = beConfig ? ": " + beConfig : "";

                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);

            } else {
                BackendLinker.validateConfig(beConfig, callbackValidation);
            }
        }

        this.convertFrontendConfig(feConfig, callbackConfigConversion);

    };

    ConfigModelsManager.prototype._autoValidateSaveConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.validateConfig");
        var feConfig = oEventData.feConfig;

        var genericErrorString = "HPH_CDM_CFG_ERROR";
        var genericSuccessString = "HPH_CDM_CFG_SUCCESS";

        function callbackAutoSave(result, oData) {
            var text, title, suffix;
            if (result === "error") {
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_ERROR_SAVE_FAILED";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
            } else if (oData.saved) {
                // No errrors found
                title = genericSuccessString;
                if (oData.validationResult.cdmConfigValidationResult.warnings.length === 0
                    && oData.validationResult.advancedConfigValidationResult.messages.length === 0) {
                    text = "HPH_CDM_CFG_SAVE_SUCCESS";
                } else {
                    text = "HPH_CDM_CFG_SAVED_WITH_WARNINGS";
                }
                var meta = oData.meta;
                var config = oData.config;

                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
                that._eventBus.publish(
                    ConfigUtils.configEvents.EVENT_CONFIG_SAVED_CONFIG, {});
            } else {
                // Errors found
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
            }

            that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_AUTO_VALIDATION_AND_SAVE_DONE, {});
        }

        function callbackConfigConversion(result, meta, beConfig, feErrors) {
            var text, suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);

                text = "HPH_CDM_CFG_ERROR_CONVERT_FAILED";
                suffix = beConfig ? ": " + beConfig : "";

                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);

            } else {

                if (meta.configId) {
                    BackendLinker.getBEConfig(meta, function (result, oData) {
                        if (result === 'error') {
                            that._updateConfigEditFlag(true);
                        } else {
                            var beDBConfig = oData.config;
                            var configUnchanged = that._isObjectEqual(beDBConfig, beConfig);
                            if (configUnchanged && !(meta.configVersion === "0")) {
                                that._updateConfigEditFlag(false);
                            } else {
                                that._updateConfigEditFlag(true);
                            }
                        }
                    });
                } else {
                    that._updateConfigEditFlag(true);
                }



                var conf = JSON.stringify(beConfig);

                if (!that._changedConfig || that._changedConfig !== conf) {
                    that._changedConfig = conf;
                    meta.configVersion = '0';
                    BackendLinker.autoSaveConfig(meta, beConfig, callbackAutoSave);
                }
            }
        }

        if (that._oJSONModels.configEditorJSONModel.getProperty("/autoSaveFlag")) {
            this.convertFrontendConfig(feConfig, callbackConfigConversion);
        }

    };

    ConfigModelsManager.prototype._saveConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.validateConfig");
        var feConfig = oEventData.feConfig;

        var genericErrorString = "HPH_CDM_CFG_ERROR";
        var genericSuccessString = "HPH_CDM_CFG_SUCCESS";

        function callbackSave(result, oData) {
            var text, title, suffix;
            if (result === "error") {
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_ERROR_SAVE_FAILED";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
            } else if (oData.saved) {
                // No errrors found
                title = genericSuccessString;
                if (oData.validationResult.cdmConfigValidationResult.warnings.length === 0
                    && oData.validationResult.advancedConfigValidationResult.messages.length === 0) {
                    text = "HPH_CDM_CFG_SAVE_SUCCESS";
                } else {
                    text = "HPH_CDM_CFG_SAVED_WITH_WARNINGS";
                }
                var meta = oData.meta;
                var config = oData.config;
                var template = oData.template;
                // update feconfig with oData.config
                that.loadBeConfig(meta, config, template);
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
                that._eventBus.publish(
                    ConfigUtils.configEvents.EVENT_CONFIG_SAVED_CONFIG, {});
            } else {
                // Errors found
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
            }
            ConfigUtils.createAlertDialog(title, text, suffix);
        }

        function callbackConfigConversion(result, meta, beConfig, feErrors) {
            var text, suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);

                text = "HPH_CDM_CFG_ERROR_CONVERT_FAILED";
                suffix = beConfig ? ": " + beConfig : "";

                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);

            } else {

                //Perform Comparison First
                if (meta.configId === "") {
                    BackendLinker.saveConfig(meta, beConfig, callbackSave);
                } else {
                    BackendLinker.getBEConfig(meta, function (result, oData) {
                        if (result === 'error') {
                            BackendLinker.saveConfig(meta, beConfig, callbackSave);
                        } else {
                            var beDBConfig = oData.config;
                            var configUnchanged = that._isObjectEqual(beDBConfig, beConfig);
                            if (configUnchanged && !(meta.configVersion === "0")) {
                                text = "HPH_CDM_CFG_ERROR_CONFIG_UNCHANGED";
                                ConfigUtils.createAlertDialog("HPH_CDM_CFG_INFORMATION_CONFIG", text, "");
                            } else {
                                BackendLinker.saveConfig(meta, beConfig, callbackSave);
                            }
                        }
                    });
                }

            }
        }

        this.convertFrontendConfig(feConfig, callbackConfigConversion);

    };

    ConfigModelsManager.prototype._isObjectEqual = function (object1, object2) {

        if (typeof object1 === "object" && typeof object2 === "object") {
            var that = this;
            for (var prop in object1) {
                if (object2.hasOwnProperty(prop)) {
                    if (!that._isObjectEqual(object1[prop], object2[prop])) { return false; }
                } else {
                    return false;
                }
            }
            for (var prop in object2) {
                if (!object1.hasOwnProperty(prop)) { return false; }
            }
            return true;
        } else {
            return object1 === object2;
        }
    };

    ConfigModelsManager.prototype._saveAndActivateConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager.validateConfig");
        var feConfig = oEventData.feConfig;

        var genericErrorString = "HPH_CDM_CFG_ERROR";
        var genericSuccessString = "HPH_CDM_CFG_SUCCESS";
        that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: true });

        function callbackActivate(result, oData) {
            var text, title, suffix;
            if (result === "error") {
                // Error during validation (e.g. 500)
                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_ACTIVATE_FAILED";
                title = genericErrorString;
                suffix = oData ? ": " + oData : "";
            } else if (oData.saved) {
                // No errrors found
                title = genericSuccessString;
                if (oData.validationResult.cdmConfigValidationResult.warnings.length === 0
                    && oData.validationResult.advancedConfigValidationResult.messages.length === 0) {
                    text = "HPH_CDM_CFG_ACTIVATE_SUCCESS";
                } else {
                    text = "HPH_CDM_CFG_VALIDITY_WARNING";
                }
                var meta = oData.meta;
                var config = oData.config;

                // update feconfig with oData.config
                var template = oData.template;
                that.loadBeConfig(meta, config, template);
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
                that._eventBus.publish(
                    ConfigUtils.configEvents.EVENT_CONFIG_ACTIVATED_CONFIG, {});
            } else {
                // Errors found
                text = "HPH_CDM_CFG_VALIDITY_ERROR";
                title = genericErrorString;
                that._updateConfigValidStates(oData.validationResult.cdmConfigValidationResult.errors, 
                    oData.validationResult.advancedConfigValidationResult.messages,
                    oData.validationResult.cdmConfigValidationResult.warnings);
            }
            ConfigUtils.createAlertDialog(title, text, suffix);
            that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
        }

        function callbackConfigConversion(result, meta, beConfig, feErrors) {
            var text, suffix;
            if (result === "error") {
                ConfigUtils.logError("error", arguments);

                text = "HPH_CDM_CFG_ERROR_CONVERT_FAILED";
                suffix = beConfig ? ": " + beConfig : "";

                ConfigUtils.createAlertDialog(genericErrorString, text, suffix);
                that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
            } else {

                if (meta.configId === "") {
                    BackendLinker.activateConfig(meta, beConfig, callbackActivate);
                } else {
                    BackendLinker.getBEConfig(meta, function (result, oData) {
                        if (result === 'error') {
                            BackendLinker.activateConfig(meta, beConfig, callbackActivate);
                        } else {
                            var beDBConfig = oData.config;
                            var configUnchanged = that._isObjectEqual(beDBConfig, beConfig);
                            if (configUnchanged && !(meta.configVersion === "0")) {
                                //Just Perform Activation
                                BackendLinker.activateConfig(meta, null, callbackActivate);
                            } else {
                                BackendLinker.activateConfig(meta, beConfig, callbackActivate);
                            }
                        }
                    });
                }

            }
        }

        this.convertFrontendConfig(feConfig, callbackConfigConversion);
    };

    /**
     * Activates a given config - expects: oEventData.configName - mandatory,
     * oEventData.configVersion - mandatory
     */
    ConfigModelsManager.prototype._activateConfig = function (
        sChannelId, sEventId, oEventData) {
        var that = this;
        var viewLoad = oEventData.view;
        that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: true });

        function callbackActivate(result, oData) {
            var title, text;
            if (result === "error") {
                ConfigUtils.logError("error", oData);
                title = "HPH_CDM_CFG_ERROR";
                text = "HPH_CDM_CFG_ACTIVATE_FAILED";
            } 
            else {

                var allGood = function(){
                    title = "HPH_CDM_CFG_SUCCESS";
                    text = "HPH_CDM_CFG_ACTIVATE_SUCCESS";
                    that._eventBus.publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_ACTIVATED_CONFIG, {});
                };

                if (oData && oData.hasOwnProperty("validationResult")) {
                    var result = oData.validationResult;
                    if (result.hasOwnProperty("advancedConfigValidationResult") && !result.advancedConfigValidationResult.valid) {
                        ConfigUtils.logError("error", oData);
                        title = "HPH_CDM_CFG_ERROR";
                        text = "HPH_CDM_CFG_ACTIVATE_FAILED";
                    } else if (result.hasOwnProperty("cdmConfigValidationResult") && !result.cdmConfigValidationResult.valid) {
                        ConfigUtils.logError("error", oData);
                        title = "HPH_CDM_CFG_ERROR";
                        text = "HPH_CDM_CFG_ACTIVATE_FAILED";
                    } else {
                        allGood();
                    }                    
                } else {
                    allGood();
                }
             
            }
            ConfigUtils.createAlertDialog(title, text);
            that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
        }

        var meta = {
            configId: oEventData.configId,
            configName: oEventData.configName,
            configVersion: oEventData.configVersion
        };
        BackendLinker.activateConfig(meta, null, callbackActivate);
    };

    /**
     * Delete a specific config from the DB (one or all versions)
     */
    ConfigModelsManager.prototype._deleteConfig = function (
        sChannelId, sEventId, oEventData) {

        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager._deleteConfig");

        var configurationVersion = oEventData.configVersion;
        var configurationId = oEventData.configId;

        var meta = {
            configId: configurationId,
            configVersion: configurationVersion
        };
        BackendLinker.deleteConfig(meta,

            function (result, oData) {

                var text = null;
                if (result === "error") {

                    ConfigUtils.logError("error", oData);
                    text = "HPH_CDM_CFG_ERROR_DELETE_FAILED";
                } else {
                    text = "HPH_CDM_CFG_DELETE_SUCCESS";

                    that._eventBus.publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_DELETED_CONFIG, {

                        });

                }

                if (oEventData.callBack) {
                    oEventData.callBack(result, text);
                } else {
                    ConfigUtils.createAlertDialog(text, text);
                }
            });
    };


    ConfigModelsManager.prototype._deleteConfigIndex = function (configurations, index, callback) {
        var that = this;

        if (configurations.length > index + 1) {
            BackendLinker.deleteConfig(configurations[index], function () {
                that._deleteConfigIndex(configurations, index + 1, callback);
            });
        } else {
            BackendLinker.deleteConfig(configurations[index], callback);
        }
    };

    ConfigModelsManager.prototype._deleteMultipleConfig = function (
        sChannelId, sEventId, oEventData) {

        var that = this;
        ConfigUtils
            .logDebug("ConfigModelsManager._deleteConfig");

        var configurations = oEventData.configurations;

        var finalCallBack = function (result, oData) {

            var text = null;
            if (result === "error") {

                ConfigUtils.logError("error", oData);
                text = "HPH_CDM_CFG_ERROR_DELETE_FAILED";
            } else {
                text = "HPH_CDM_CFG_DELETE_SUCCESS";

                that._eventBus.publish(
                    ConfigUtils.configEvents.EVENT_CONFIG_DELETED_CONFIG, {

                    });

            }

            if (oEventData.callBack) {
                oEventData.callBack(result, text);
            } else {
                ConfigUtils.createToast(text);
            }
        };

        if (configurations.length > 0) {
            that._deleteConfigIndex(configurations, 0, finalCallBack);
        }
    };

    function getUniqueName(existingNames, prefix, startValue) {
        var attrNumber = startValue ? startValue : 1;
        while (existingNames.indexOf(prefix + attrNumber) !== -1) {
            ++attrNumber;
        }
        return prefix + attrNumber;
    }

    ConfigModelsManager.prototype._addNewAttribute = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var currentData = this._getDataElementFromPath(oEventData.Path);

        var newText = ConfigUtils.getText("HPH_CDM_CFG_NEW_ATTRIBUTE");

        var existingNames = currentData.attributes.map(function (attr) {
            return attr.name.value;
        });
        var name = getUniqueName(existingNames, newText + " - ");

        var newAttr = this._configModelsData.getEmptyAttribute(name);

        newAttr.order = 0;

        newAttr.langName.value = this._generateLanguageValue();

        for (var i = 0; i < currentData.attributes.length; i++) {
            if (currentData.attributes[i].hasOwnProperty("order")) {
                currentData.attributes[i].order = currentData.attributes[i].order + 1;
            } else {
                currentData.attributes[i].order = i + 1;
            }
        }

        currentData.attributes.push(newAttr);

        this._oJSONModels.configEditorJSONModel.setData(allData);
    };

    ConfigModelsManager.prototype._addNewFilterCard = function () {

        var data = this._oJSONModels.configEditorJSONModel.getData();

        var newText = ConfigUtils.getText("HPH_CDM_CFG_NEW_INTERACTION");

        var existingNames = data.filterCards.map(function (attr) {
            return attr.name.value;
        });
        var name = getUniqueName(existingNames, newText + " - ");

        var newCard = this._configModelsData.getEmptyFilterCard(name);

        newCard.order = 0;

        newCard.langName.value = this._generateLanguageValue();

        for (var i = 0; i < data.filterCards.length; i++) {
            if (data.filterCards[i].hasOwnProperty("order")) {
                data.filterCards[i].order = data.filterCards[i].order + 1;
            } else {
                data.filterCards[i].order = i + 1;
            }
        }

        data.filterCards.push(newCard);

        this._oJSONModels.configEditorJSONModel.setData(data);

    };

    ConfigModelsManager.prototype._generateLanguageValue = function () {
        return this._configModelsData._configModelsData.configGeneralModelData.supportedLanguages.map(function (langObj) {
            return {
                lang: langObj.key,
                value: "",
                enabled: false,
                visible: true
            };
        });
    };

    ConfigModelsManager.prototype._addNewConditionType = function (
        sChannelId, sEventId, oEventData) {

        var data = this._oJSONModels.configEditorJSONModel.getData();
        for (var i = 0; i < data.conditionTypes.length; ++i) {
            if (data.conditionTypes[i].key === oEventData.newElement.key) {
                var text = "{hc.hph.cdw.ui.i18n>HPH_CDM_CFG_ERROR_KEY_EXISTS}";
                oEventData.callBack("error", text);
                return;
            }
        }

        this._addNewElementToArray(sChannelId, sEventId, oEventData);

    };

    ConfigModelsManager.prototype.clearModelAfterSave = function () {

        var data = this._oJSONModels.configEditorJSONModel.getData();

        var markFilterCardsArray = function (array) {

            for (var i = 0; i < array.length; ++i) {
                if (array[i].hasOwnProperty("isNew")) {
                    array[i].isNew = false;
                }
                for (var j = 0; j < array[i].attributes.length; ++j) {
                    if (array[i].attributes[j].hasOwnProperty("isNew")) {
                        array[i].attributes[j].isNew = false;
                    }
                }
            }
        };

        markFilterCardsArray(data.filterCards);
        markFilterCardsArray(data.generalSettingsFilterCards);

        this._oJSONModels.configEditorJSONModel.setData(data);
    };

    /**
     * Converts a front-end path into a back-end config path
     *
     * @param feConfig
     * @param callBack
     */
    ConfigModelsManager.prototype.convertFrontendPath = function (
        feConfig, fePath, callBack) {

        var skeletons = BackendLinker.getBEConfigSkeletons();
        var beConfig = BackendLinker.getSkeletonConfig();

        try {
            var bePathString = "";

            var addAttributeToContainer = function (attributesArray,
                attributesIndex, container) {

                var idName = attributesArray[attributesIndex].idName;
                if (!idName || idName === "") {
                    idName = attributesArray[attributesIndex].name.value.replace(
                        " ", "");
                }
                container[idName] = {};
                bePathString += "." + idName;

                for (var prop in skeletons.attributeSkeleton) {
                    if (attributesArray[attributesIndex].hasOwnProperty(prop)) {

                        if ((prop === "referenceFilter" || prop === "referenceExpression") && (!attributesArray[attributesIndex].isCatalogAttribute)) {
                            continue;
                        }

                        if ((prop === "otsLanguage" || prop === "otsSubject" || prop === "otsHierarchyLevel" || prop === "otsTermContext") && (!attributesArray[attributesIndex].isOTSAttribute)) {
                            continue;
                        }

                        // convert the property if needed
                        if (BackendLinker._frontToBackPropertyConverter
                            .hasOwnProperty(prop)) {
                            BackendLinker._frontToBackPropertyConverter[prop](
                                attributesArray[attributesIndex][prop], 
                                attributesArray[attributesIndex],
                                container[idName],
                                feConfig
                            );
                        } else {
                            // just copy the property
                            container[idName][prop] = attributesArray[attributesIndex][prop];
                        }

                    }
                }
            };

            var addFilterCardToContainer = function (filterCard, attributeId,
                container) {

                var idName = filterCard.idName;
                if (!idName || idName === "") {
                    idName = filterCard.name.value.match(/[a-zA-Z0-9_]+/g)
                        .join("_");
                }

                container[idName] = {};
                bePathString += "." + idName;

                for (var prop in skeletons.interactionSkeleton) {
                    if (filterCard.hasOwnProperty(prop)) {

                        // convert the property if needed
                        if (BackendLinker._frontToBackPropertyConverter
                            .hasOwnProperty(prop)) {
                            BackendLinker._frontToBackPropertyConverter[prop](
                                filterCard[prop],
                                filterCard,
                                container[idName],
                                feConfig
                            );
                        } else {
                            // just copy the property
                            container[idName][prop] = filterCard[prop];
                        }

                    }
                }

                container[idName].attributes = {};

                if (filterCard.attributes[attributeId]) {
                    bePathString += ".attributes";
                    addAttributeToContainer(filterCard.attributes, attributeId,
                        container[idName].attributes);
                }
            };

            beConfig.patient.interactions = {};
            beConfig.patient.conditions = {};
            beConfig.patient.attributes = {};
            beConfig.mapping = {};
            delete beConfig.settings;
            beConfig.censor = {};
            var meta = {
                configName: feConfig.configName,
                configId: feConfig.configId,
                configVersion: feConfig.configVersion
            };

            // split the path in an array
            var fePathArray = fePath.split("/");
            if (!fePathArray[0]) {
                fePathArray = fePathArray.slice(1);
            }

            var allConds = {};
            for (var i = 0; i < feConfig.conditionTypes.length; ++i) {
                allConds[feConfig.conditionTypes[i].key] = feConfig.conditionTypes[i];
            }

            beConfig.advancedSettings = this.convertFrontendConfigAdvancedSettings(feConfig);

            beConfig.censor = feConfig.censor;

            var fcGroup = fePathArray[0];
            var fcIndex = fePathArray[1];
            var attributeIndex = fePathArray[3];

            if (fcGroup === "generalSettingsFilterCards") {
                bePathString = "patient.attributes";
                addAttributeToContainer(
                    feConfig.generalSettingsFilterCards[fcIndex].attributes,
                    attributeIndex, beConfig.patient.attributes);
            } else if (fcGroup === "filterCards" || fcGroup === "suggestedFilterCards") {

                var filterCard = fcGroup === "filterCards" ? feConfig.filterCards[fcIndex] : feConfig.suggestedFilterCards[fcIndex];
                var container = null;

                if (filterCard.conditionType && filterCard.conditionType.key !== '') {

                    var condKey = filterCard.conditionType.key;
                    if (!beConfig.patient.conditions.hasOwnProperty(condKey)) {
                        beConfig.patient.conditions[condKey] = {
                            interactions: {}
                        };
                        for (var prop in skeletons.conditionSkeleton) {
                            // copy all conditions properties
                            if (allConds[condKey].hasOwnProperty(prop)) {
                                beConfig.patient.conditions[condKey][prop] = allConds[condKey][prop];
                            }
                        }

                    }
                    bePathString = "patient.conditions." + condKey;
                    container = beConfig.patient.conditions[condKey];

                } else {
                    bePathString = "patient";
                    container = beConfig.patient;

                }
                bePathString += ".interactions";
                addFilterCardToContainer(filterCard, attributeIndex,
                    container.interactions);

            }

            callBack("success", {
                meta: meta,
                config: beConfig,
                path: bePathString
            });

        } catch (e) {
            callBack("error", e);
        }

    };

    /*
    Convert front end config advanced settings to backend format
    */
    ConfigModelsManager.prototype.convertFrontendConfigAdvancedSettings = function (feConfig) {
        var skeletons = BackendLinker.getBEConfigSkeletons();
        var beConfig = BackendLinker.getSkeletonConfig();
        var beAdvancedSettings = JSON.parse(JSON.stringify(beConfig.advancedSettings));

        function convertAttributeTable(attributeTable) {
            var returnAttributeTable = {};
            for (var prop in skeletons.attributeTableSkeleton) {
                if (attributeTable.hasOwnProperty(prop)) {
                    returnAttributeTable[prop] = attributeTable[prop];
                } else {
                    returnAttributeTable[prop] = skeletons.attributeTableSkeleton[prop];
                }
            }
            return returnAttributeTable;
        }

        // convert fact tables to be format
        for (var prop in skeletons.factTableSkeleton) {
            if (feConfig.tableTypePlaceholderMap.factTables[0].hasOwnProperty(prop)) {
                beAdvancedSettings.tableTypePlaceholderMap.factTable[prop]
                    = feConfig.tableTypePlaceholderMap.factTables[0][prop];
            } else {
                beAdvancedSettings.tableTypePlaceholderMap.factTable[prop]
                    = skeletons.factTableSkeleton[prop];
            }
        }
        beAdvancedSettings.tableTypePlaceholderMap.factTable.attributeTables =
            beAdvancedSettings.tableTypePlaceholderMap.factTable.attributeTables.map(convertAttributeTable);

        // convert dim tables to be format
        beAdvancedSettings.tableTypePlaceholderMap.dimTables = feConfig.tableTypePlaceholderMap.dimTables.map(function (dimTable) {
            var returnDimTable = {};
            for (var prop in skeletons.dimTableSkeleton) {
                if (dimTable.hasOwnProperty(prop)) {
                    returnDimTable[prop] = dimTable[prop];
                } else {
                    // get the default value from the skeleton
                    returnDimTable[prop] = skeletons.dimTableSkeleton[prop];
                }
            }
            if (returnDimTable.hasOwnProperty("attributeTables")) {
                returnDimTable.attributeTables = returnDimTable.attributeTables.map(convertAttributeTable);
            }
            return returnDimTable;
        });

        // build table mapping
        beAdvancedSettings.tableMapping = this._configModelsData.getFETableMapping(feConfig);
        beAdvancedSettings.settings.otsTableMap = this._configModelsData.getAllPlaceholdersFromUI(feConfig.otherPlaceholders.otsPlaceholder);
        // build guarded table mapping by copying table mapping
        // then replace guarded fact table with guardedplaceholder
        beAdvancedSettings.guardedTableMapping = {};
        beAdvancedSettings.guardedTableMapping[beAdvancedSettings.tableTypePlaceholderMap.factTable.placeholder]
            = feConfig.otherPlaceholders.guardedPlaceholder[0].placeholderValue;

        beAdvancedSettings.language = feConfig.settings.languages.value.map(function(obj){
            return obj.key;
        });

        for (var prop in skeletons.settingsSkeleton) {
            if (feConfig.settings.hasOwnProperty(prop)) {
                beAdvancedSettings.settings[prop] = feConfig.settings[prop].value;
            }
        }
        return beAdvancedSettings;
    };

    /**
     * TODO - have a method in the backend which brings back only the skeleton of
     * the config in addition think of the attribute structure - do we want to have
     * a backend model so no ui related properties will be saved
     *
     */
    ConfigModelsManager.prototype.convertFrontendConfig = function (
        feConfig, callBack) {
        var that = this;
        var skeletons = BackendLinker.getBEConfigSkeletons();
        var beConfig = BackendLinker.getSkeletonConfig();

        try {
            var errors = [];

            var addCardAttributesToContainer = function (filterCard, container,
                bePathString) {

                var attributesArray = filterCard.attributes;
                var isDefault = filterCard.idName === "defaultAttributes";
                for (var i = 0; i < attributesArray.length; ++i) {

                    var idName = attributesArray[i].idName;
                    if (!idName || idName === "") {
                        idName = (attributesArray[i].name.value + "_" + ConfigUtils
                            .createGuid()).match(/[a-zA-Z0-9_]+/g).join("_");
                        attributesArray[i].idName = idName;
                    }

                    container[idName] = {};

                    var propertyConversionErrors;
                    for (var prop in skeletons.attributeSkeleton) {

                        if (((prop === "referenceExpression" || prop === "referenceFilter") &&
                            !attributesArray[i].isCatalogAttribute) ||
                            ((prop === "otsLanguage" || prop === "otsSubject" || prop === "otsHierarchyLevel" || prop === "otsTermContext") &&
                                !attributesArray[i].isOTSAttribute)) {

                            var backupProp = "_" + prop;

                            if (BackendLinker._frontToBackPropertyConverter
                                .hasOwnProperty(backupProp)) {
                                propertyConversionErrors = BackendLinker._frontToBackPropertyConverter[backupProp](
                                        attributesArray[i][prop], 
                                        attributesArray[i],
                                        container[idName],
                                        {
                                            preloadedSuggestions: that._preloadedSuggestions,
                                            tableMapping: beConfig.advancedSettings.tableMapping,
                                            otsTableMapping: beConfig.advancedSettings.settings.otsTableMap
                                        }
                                    );
                                if (propertyConversionErrors) {
                                    for (var j = 0; j < propertyConversionErrors.length; j++) {
                                        propertyConversionErrors[j].path = bePathString +
                                            "." + idName + "." + prop;
                                        errors.push(propertyConversionErrors[j]);
                                    }
                                }
                            } else {
                                // just copy the property
                                if (!that
                                    ._isEmptyProperty(attributesArray[i][prop])) {
                                    container[idName][backupProp] = attributesArray[i][prop];
                                }

                            }


                            continue;
                        } else {
                            if (attributesArray[i].hasOwnProperty(prop)) {

                                // convert the property if needed
                                if (BackendLinker._frontToBackPropertyConverter
                                    .hasOwnProperty(prop)) {
                                    propertyConversionErrors = BackendLinker._frontToBackPropertyConverter[prop](
                                        attributesArray[i][prop], 
                                        attributesArray[i],
                                        container[idName],
                                        {
                                            preloadedSuggestions: that._preloadedSuggestions,
                                            tableMapping: beConfig.advancedSettings.tableMapping,
                                            otsTableMapping: beConfig.advancedSettings.settings.otsTableMap
                                        }
                                    );
                                    if (propertyConversionErrors) {
                                        for (var j = 0; j < propertyConversionErrors.length; j++) {
                                            propertyConversionErrors[j].path = bePathString +
                                                "." + idName + "." + prop;
                                            errors.push(propertyConversionErrors[j]);
                                        }
                                    }
                                } else {
                                    // just copy the property
                                    if (!that
                                        ._isEmptyProperty(attributesArray[i][prop])) {
                                        container[idName][prop] = attributesArray[i][prop];
                                    }

                                }
                            }
                        }
                    }

                    if (isDefault) {
                        container[idName].isDefault = true;
                    }

                    var extraData = attributesArray[i].extraData.value;
                    if (extraData) {
                        try {
                            var extraObj = JSON.parse(extraData);
                            for (var extraProp in extraObj) {
                                container[idName][extraProp] = extraObj[extraProp];
                            }
                        } catch (e) {
                            errors
                                .push({
                                    path: bePathString + "." + idName +
                                    ".extraData",
                                    messageKey: "HPH_CDM_CFG_VALID_INVALID_JSON",
                                    values: [],
                                    messageDefault: "HPH_CDM_CFG_VALID_INVALID_JSON"
                                });
                        }

                    }
                }
            };

            var addFilterCardToContainer = function (filterCard, container,
                bePathString) {

                var idName = filterCard.idName;
                if (!idName || idName === "") {
                    idName = (filterCard.name.value + "_" + ConfigUtils
                        .createGuid()).match(/[a-zA-Z0-9_]+/g).join("_");
                    filterCard.idName = idName;
                }

                container[idName] = {};
                var propertyConversionErrors;
                for (var prop in skeletons.interactionSkeleton) {
                    if (filterCard.hasOwnProperty(prop)) {

                        // convert the property if needed
                        if (BackendLinker._frontToBackPropertyConverter
                            .hasOwnProperty(prop)) {
                            propertyConversionErrors = BackendLinker._frontToBackPropertyConverter[prop](
                                filterCard[prop],
                                filterCard,
                                container[idName],                             
                                {
                                    preloadedSuggestions: that._preloadedSuggestions,
                                    tableMapping: beConfig.advancedSettings.tableMapping,
                                    otsTableMapping: beConfig.advancedSettings.settings.otsTableMap
                                }
                            );
                            if (propertyConversionErrors) {
                                for (var j = 0; j < propertyConversionErrors.length; j++) {
                                    propertyConversionErrors[j].path = bePathString +
                                        "." + idName + "." + prop;
                                    errors.push(propertyConversionErrors[j]);
                                }
                            }
                        } else {
                            // just copy the property
                            if (!that._isEmptyProperty(filterCard[prop])) {
                                container[idName][prop] = filterCard[prop];
                            }
                        }
                    }
                }

                container[idName].attributes = {};

                if (filterCard.attributes.length > 0) {
                    addCardAttributesToContainer(filterCard,
                        container[idName].attributes, bePathString + "." +
                        idName + ".attributes");
                }
            };

            var meta = {
                configName: feConfig.configName,
                configId: feConfig.configId,
                configVersion: feConfig.configVersion
            };

            beConfig.patient.interactions = {};
            beConfig.patient.conditions = {};
            beConfig.patient.attributes = {};
            beConfig.censor = {};

            var allConds = {};
            for (var i = 0; i < feConfig.conditionTypes.length; ++i) {
                allConds[feConfig.conditionTypes[i].key] = feConfig.conditionTypes[i];
            }

            beConfig.advancedSettings = this.convertFrontendConfigAdvancedSettings(feConfig);

            beConfig.censor = feConfig.censor;

            for (i = 0; i < feConfig.generalSettingsFilterCards.length; ++i) {
                addCardAttributesToContainer(
                    feConfig.generalSettingsFilterCards[i],
                    beConfig.patient.attributes, "patient.attributes");
            }

            for (i = 0; i < feConfig.filterCards.length; ++i) {

                var filterCard = feConfig.filterCards[i];
                var container = null;
                var bePathString = "patient";

                if (filterCard.conditionType && filterCard.conditionType.key !== "") {
                    var condKey = filterCard.conditionType.key;
                    bePathString = bePathString + ".conditions." + condKey;
                    if (!beConfig.patient.conditions.hasOwnProperty(condKey)) {
                        beConfig.patient.conditions[condKey] = {
                            interactions: {}
                        };
                        for (var prop in skeletons.conditionSkeleton) {
                            // copy all conditions properties
                            if (allConds[condKey].hasOwnProperty(prop)) {
                                beConfig.patient.conditions[condKey][prop] = allConds[condKey][prop];
                            }
                        }

                    }
                    container = beConfig.patient.conditions[condKey];

                } else {
                    container = beConfig.patient;

                }
                bePathString = bePathString + ".interactions";
                addFilterCardToContainer(filterCard, container.interactions,
                    bePathString);

            }
            callBack("success", meta, beConfig, errors);

        } catch (e) {
            callBack("error", e);
        }

    };

    ConfigModelsManager.prototype._convertBeInteractionToFilterCard = function (
        key, interVal, conditionType) {

        var filterCard = this._configModelsData.getEmptyFilterCard(interVal.name,
            key);
        filterCard.isNew = false;

        if (conditionType) {
            filterCard.conditionType = conditionType;
        }
        var that = this;

        for (var prop in interVal) {

            if (interVal.hasOwnProperty(prop)) {
                // copy all properties
                if (prop !== "attributes") {

                    // convert the property if needed
                    if (BackendLinker._backToFrontPropertyConverter
                        .hasOwnProperty(prop)) {
                        BackendLinker._backToFrontPropertyConverter[prop](
                            interVal[prop], filterCard);
                    } else {
                        // just copy the property
                        filterCard[prop] = interVal[prop];
                    }
                } else {
                    $.each(interVal.attributes, function (attrId, attrVal) {

                        if (!attrVal.hasOwnProperty("isDefault") ||
                            attrVal.isDefault !== true) {
                            that._addOneAttributeToCard(attrId, attrVal,
                                filterCard, false);
                        }

                    });
                }
            }
        }

        var supportedLanguages = this._configModelsData._configModelsData.configGeneralModelData.supportedLanguages.map(function (langObj) { return langObj.key; });
        if (filterCard.langName) {
            for (var i = 0; i < filterCard.langName.length; i++) {
                if (supportedLanguages.indexOf(filterCard.langName.value[i].lang) >= 0) {
                    filterCard.langName.value[i].visible = true;
                } else {
                    filterCard.langName.value[i].visible = false;
                }
            }

        }

        if (!filterCard.langName) {
            filterCard.langName = { value: [] };
        }
        var languagesInAttribute = filterCard.langName.value.map(function (langObj) { return langObj.lang; });
        for (var i = 0; i < supportedLanguages.length; i++) {
            if (languagesInAttribute.indexOf(supportedLanguages[i]) < 0) {
                filterCard.langName.value.push({
                    lang: supportedLanguages[i],
                    value: "",
                    enabled: false,
                    visible: true
                });
            }
        }

        return filterCard;
    };

    // to do - write this functionality in a modular way so it can be accessed later
    // when adding a new interaction or suggestion
    ConfigModelsManager.prototype._convertBackendConfig = function (
        meta, beConfig) {

        var that = this;

        var patient = beConfig.patient || {};

        this.cleanConfigEditorModel(meta);

        var configForUi = this._configModelsData.getModelData();

        // if advancedSettings is null, this might be an old config. So we set default advanced settings
        beConfig.advancedSettings = beConfig.advancedSettings
            || JSON.parse(JSON.stringify(BackendLinker.getSkeletonConfig().advancedSettings));


        if (beConfig.censor) {
            configForUi.configEditorModelData.censor = beConfig.censor;
        }

        ["maxResultSize", "fuzziness", "dateFormat", "timeFormat"].forEach(function (settingItem) {
            configForUi.configEditorModelData.settings[settingItem] = {
                value: beConfig.advancedSettings.settings[settingItem]
            };
        });

        // Enrich the language description for the given ISO code based on the locale language settings.
        if (beConfig.advancedSettings.language) {
            var supportedLanguages = [];
            var languageItem;
            var allLanguageMap = sap.ui.core.LocaleData.getInstance(sap.ui.getCore().getConfiguration().getLocale()).getLanguages();
            beConfig.advancedSettings.language.forEach(function (key) {
                languageItem = { "key": key, "path": allLanguageMap[key] };
                supportedLanguages.push(languageItem);
            });

            configForUi.configGeneralModelData.supportedLanguages = supportedLanguages;
            configForUi.configEditorModelData.settings.languages = {
                value : supportedLanguages
            };
        }
        
        // map backend tableTypePlaceholderMap to frontend model
        var uiTableTypePlaceholderMap = configForUi.configEditorModelData.tableTypePlaceholderMap;

        // if tabletype placeholdermap is null from be config, load the default
        var beTableTypePlaceholderMap = beConfig.advancedSettings.tableTypePlaceholderMap
            || BackendLinker.getSkeletonConfig().advancedSettings.tableTypePlaceholderMap;
        var beTablemapping = beConfig.advancedSettings.tableMapping;
        var beGuardedTablemapping = beConfig.advancedSettings.guardedTableMapping;

        var skeletons = BackendLinker.getBEConfigSkeletons();

        // fact table
        var factTable = $.extend(beTableTypePlaceholderMap.factTable, this._convertToUIPlaceholder(
            beTablemapping,
            beTableTypePlaceholderMap.factTable.placeholder,
            skeletons.factTableColumnsSkeleton
        ));
        factTable.attributeTables = beTableTypePlaceholderMap
            .factTable.attributeTables.map((function (a) {
                return $.extend(a, this._convertToUIPlaceholder(
                    beTablemapping,
                    a.placeholder,
                    skeletons.factAttributeColumnsSkeleton
                ));
            }).bind(this));
        // a workaround to use binding context inside a list
        uiTableTypePlaceholderMap.factTables = [factTable];
        
        // dim tables
        uiTableTypePlaceholderMap.dimTables = beTableTypePlaceholderMap
            .dimTables.map((function (dim) {
                var dimUI = $.extend(dim, this._convertToUIPlaceholder(
                    beTablemapping,
                    dim.placeholder,
                    skeletons.dimTableColumnsSkeleton
                ));
                dimUI.attributeTables = dim.attributeTables.map((function (a) {
                    return $.extend(a, this._convertToUIPlaceholder(
                        beTablemapping,
                        a.placeholder,
                        skeletons.dimTableAttributeColumnsSkeleton
                    ));
                }).bind(this));                
                return dimUI;
            }).bind(this));
        

        // for hardcoded values (@REF, @TEXT, GUARDED, OTS)
        configForUi.configEditorModelData.otherPlaceholders = {
            guardedPlaceholder: [this._convertToUIPlaceholder(beGuardedTablemapping, beTableTypePlaceholderMap.factTable.placeholder)],
            refPlaceholder: [this._convertToUIPlaceholder(beTablemapping, "@REF", skeletons.refColumnsSkeleton)],
            textPlaceholder: [this._convertToUIPlaceholder(beTablemapping, "@TEXT", skeletons.textColumnsSkeleton)],
            otsPlaceholder: [this._convertToUIPlaceholder(beConfig.advancedSettings.settings.otsTableMap, "@CODE")]
        };

        var inter;
        if (patient.hasOwnProperty("interactions")) {
            for (inter in patient.interactions) {

                var uiCard = this._convertBeInteractionToFilterCard(inter,
                    patient.interactions[inter], this._configModelsData
                        .getEmptyConditionType());
                configForUi.configEditorModelData.filterCards.push(uiCard);
            }
        }
        if (patient.hasOwnProperty("conditions")) {
            $.each(patient.conditions, function (key, cond) {

                var condKey = key,
                    condName;
                if (typeof cond.name === "object") {
                    condName = cond.name[0].value;
                } else {
                    condName = condKey;
                }

                var condObject = that._configModelsData.getEmptyConditionType(
                    condName, condKey);

                configForUi.configEditorModelData.conditionTypes.push(condObject);

                if (cond.hasOwnProperty("interactions")) {
                    for (var inter in cond.interactions) {

                        condObject = that._configModelsData.getEmptyConditionType(
                            condName, condKey);
                        var uiCard = that._convertBeInteractionToFilterCard(inter,
                            cond.interactions[inter], condObject);
                        configForUi.configEditorModelData.filterCards.push(uiCard);
                    }
                }
            });
        }

        for (var card in configForUi.configEditorModelData.filterCards) {
            var currCard = configForUi.configEditorModelData.filterCards[card];
            var path = "patient";
            var name = "";

            if (currCard.conditionType.name) {
                path += ".conditions." + currCard.conditionType.name;
                name += currCard.conditionType.name + "." + currCard.name.value;
            } else {
                name += currCard.name.value;
            }

            path += ".interactions." + currCard.idName;
            var parObject = that._configModelsData.getEmptyParentInteractionType(name, path);
            configForUi.configEditorModelData.parentInteractions.push(parObject);
        }

        this._addGeneralSettingsCards(patient, configForUi.configEditorModelData,
            false);

        return configForUi;
    };

    /**
     * Create a placeholder object for frontend consumption
     * @param {JSON} placeholderMap - advanced settings tablemapping 
     * @param {string} placeholder - example: @PATIENT, @INTERACTION
     * @param {JSON} defaultColumnPlaceholders - default column placeholders
     * @returns - json object containing placeholder, placeholdervalues, column placeholders 
     * and values for the input placeholder
     */
    ConfigModelsManager.prototype._convertToUIPlaceholder = function (placeholderMap, placeholder, defaultColumnPlaceholders) {
        var keys = Object.keys(placeholderMap); 
        var output = {
            placeholder: "",
            placeholderValue: "",
            columnPlaceholders: JSON.parse(JSON.stringify(defaultColumnPlaceholders || {}))
        };

        if (keys.length === 0) {
            return output;
        }

        output.placeholder = placeholder;
        output.placeholderValue = placeholderMap[placeholder] || "";

        keys.forEach(function (key) {
            var parts = key.split(".");
            //@PATIENT.PATIENT_ID - @PATIENT - part 1, PATIENT_ID - part 2
            if (parts.length < 2)
                return;
            
            if (parts[0] === placeholder && output.columnPlaceholders.hasOwnProperty(parts[1])) {
                output.columnPlaceholders[parts[1]] = placeholderMap[key] || "";
            }
        });

        return output;
    };

    ConfigModelsManager.prototype._filterParentInteraction = function (
        CurrentFilterCardIndex) {

        var configForUi = this._configModelsData.getModelData();
        var filterCard = configForUi.configEditorModelData.filterCards[CurrentFilterCardIndex];

        if (filterCard) {
            var currCondition = configForUi.configEditorModelData.filterCards[CurrentFilterCardIndex].conditionType;

            configForUi.configEditorModelData.parentInteractions = [];
            //configForUi.configEditorModelData.parentInteractions.push(this._configModelsData.getEmptyParentInteractionType());

            for (var card in configForUi.configEditorModelData.filterCards) {
                var currCard = configForUi.configEditorModelData.filterCards[card];

                if (currCondition && currCard.conditionType && currCondition.key === currCard.conditionType.key) {
                    var path = "patient.interactions." + currCard.idName;
                    var name = currCard.name.value;

                    if (currCondition && currCondition.key) {
                        path = "patient.conditions." + currCard.conditionType.key + ".interactions." + currCard.idName;
                        name = currCard.conditionType.key + "." + name;
                    }

                    var parObject = this._configModelsData.getEmptyParentInteractionType(name, path);
                    configForUi.configEditorModelData.parentInteractions.push(parObject);
                }
            }
        }


    };

    ConfigModelsManager.prototype._updateParentInteraction = function (
        sChannelId, sEventId, oEventData) {
        var index = oEventData.CurrentFilterCardIndex;
        this._filterParentInteraction(index);
    };

    /**
     * Adds a new element to an array. The view must be bound to an array.
     */
    ConfigModelsManager.prototype._addNewElementToArray = function (
        sChannelId, sEventId, oEventData) {

        var result = "success";
        try {

            var allData = this._oJSONModels.configEditorJSONModel.getData();
            var newElement = oEventData.newElement;
            var path = oEventData.path;

            var currentData = allData;

            var pathArr = path.split("/");
            if (!pathArr[0]) {
                pathArr = pathArr.slice(1);
            }
            // traverse the data using the path
            for (var i = 0; i < pathArr.length; i++) {
                currentData = currentData[pathArr[i]];
            }

            currentData.push(newElement);

            this._oJSONModels.configEditorJSONModel.setData(allData);
        } catch (ex) {
            result = "error";
        }

        if (oEventData.callBack) {
            oEventData.callBack(result);
        }
    };

    /**
     * Removes an element to an array. The view must be bound to an array.
     */
    ConfigModelsManager.prototype._removeElementFromArrayEvt = function (
        sChannelId, sEventId, oEventData) {

        var modelName = oEventData.modelName ? oEventData.modelName :
            ConfigUtils.models.CONFIG_EDITOR;

        this._removeElementFromArray(oEventData.path, modelName);
    };

    /**
     * Removes an element to an array. The view must be bound to an array.
     */
    ConfigModelsManager.prototype._removeElementFromArray = function (
        path, modelName) {

        var allData = this._getDataOfModel(modelName);

        var currentData = allData;

        var pathArr = path.split("/");

        var index = parseInt(pathArr[pathArr.length - 1], 10);

        // remove the last element of the array, i.e. the index
        pathArr.splice(pathArr.length - 1, 1);

        // if the path starts with a slash, the first elem in the array will be
        // empty
        if (!pathArr[0]) {
            pathArr = pathArr.slice(1);
        }
        // traverse the data using the path
        for (var i = 0; i < pathArr.length; i++) {
            currentData = currentData[pathArr[i]];
        }

        var backendPath = "patient";
        var card = allData[pathArr[0]];
        if (pathArr[0] === "generalSettingsFilterCards") {
            card = card[pathArr[1]];
            backendPath += ".attributes.";
            backendPath += card[pathArr[2]][index].idName;
        } else {
            if (pathArr.length > 2) {
                card = card[pathArr[1]];
            } else {
                card = card[index];
            }
            if (card.conditionType && card.conditionType.name) {
                backendPath += ".conditions.";
                backendPath += card.conditionType.name;
            }

            backendPath += ".interactions.";
            backendPath += card.idName;

            if (pathArr.length > 2) {
                if (card[pathArr[2]].constructor === Array) {
                    var attribute = card[pathArr[2]][index];    
                } else {
                    var attribute = card[pathArr[2]].value[index];
                }
                
                backendPath += ".attributes.";
                backendPath += attribute.idName;
            }
        }

        if (currentData[index].hasOwnProperty("order")) {

            var deletedElemOrder = currentData[index].order;

            // reset the order property from 0 to length-1
            for (i = 0; i < currentData.length; i++) {
                if (currentData[i].order > deletedElemOrder) {
                    currentData[i].order -= 1;
                }
            }
        }

        currentData.splice(index, 1);
        allData.beValidation = allData.beValidation.filter(function (item) {
            if (item.path === backendPath) {
                return false;
            } else if (item.path.indexOf(backendPath + ".") >= 0) {
                return false;
            }
            return true;
        });
        allData.beWarning = allData.beWarning.filter(function (item) {
            if (item.path === backendPath) {
                return false;
            } else if (item.path.indexOf(backendPath + ".") >= 0) {
                return false;
            }
            return true;
        });
        allData.feValidation = allData.feValidation.filter(function (item) {
            if (item.path === backendPath) {
                return false;
            } else if (item.path.indexOf(backendPath + ".") >= 0) {
                return false;
            }
            return true;
        });
        allData.queryValidation = allData.queryValidation.filter(function (item) {
            if (item.path === backendPath) {
                return false;
            } else if (item.path.indexOf(backendPath + ".") >= 0) {
                return false;
            }
            return true;
        });

        this._setDataOfModel(allData, modelName);
    };

    ConfigModelsManager.prototype._duplicateElementFromArray = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var currentData = allData;

        var objToDuplicateInfo = this._findObjectByPath(currentData,
            oEventData.path);

        var objToDuplicate = objToDuplicateInfo[0];
        currentData = objToDuplicateInfo[1];

        // clone the object
        var newObject = JSON.parse(JSON.stringify(objToDuplicate));
        newObject.name.value = newObject.name.value + "_copy";
        newObject.idName = "";

        if (objToDuplicate.hasOwnProperty("order")) {

            var duplicatedObjOrder = objToDuplicate.order;

            // reset the order property for elements after the object to duplicate
            for (var i = 0; i < currentData.length; i++) {
                if (currentData[i].order > duplicatedObjOrder) {
                    currentData[i].order += 1;
                }
            }

            // the position of the new obj will be just after the duplicated one
            newObject.order = duplicatedObjOrder + 1;

        }

        if (newObject.hasOwnProperty("isNew")) {
            newObject.isNew = true;
        }

        currentData.push(newObject);

        this._oJSONModels.configEditorJSONModel.setData(allData);

    };


    ConfigModelsManager.prototype._duplicateElementFromOther = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var currentData = allData;

        var objToDuplicateInfo = this._findObjectByPath(currentData,
            oEventData.sourcePath);

        var objToDuplicate = objToDuplicateInfo[0];
        currentData = currentData[oEventData.targetPath];

        var newItemOrder = oEventData.itemOrder;
        // clone the object
        var newObject = JSON.parse(JSON.stringify(objToDuplicate));
        newObject.name.value = newObject.name.value;
        newObject.idName = "";

        var numCardToInsert = 1;

        if (newObject.hasOwnProperty("filterCards")) {
            numCardToInsert = newObject.filterCards.length;

            newObject = newObject.filterCards;
        } else {
            newObject = [newObject];
        }

        if (currentData.length > 0) {
            if (!currentData[0].hasOwnProperty("order")) {
                for (var i = 0; i < currentData.length; i++) {
                    currentData[i].order = i;
                }
            }

            for (var i = 0; i < currentData.length; i++) {
                if (currentData[i].order >= newItemOrder) {
                    currentData[i].order += numCardToInsert;
                }
            }
        }

        var newItemOrderOffset = 0;
        for (var newFilterCardObjectKey in newObject) {
            var newFilterCardObject = newObject[newFilterCardObjectKey];
            newFilterCardObject.order = newItemOrder + newItemOrderOffset;

            if (newFilterCardObject.hasOwnProperty("isNew")) {
                newFilterCardObject.isNew = true;
            }

            var conditionType = newFilterCardObject.conditionType;
            var conditionTypeName = conditionType.name;
            var conditionTypeKey = conditionType.key;

            conditionType = this._checkExistingConditionType(conditionTypeName, conditionTypeKey);
            newFilterCardObject.conditionType = conditionType;
            newFilterCardObject.editable = true;
            //alert(JSON.stringify(conditionType));

            currentData.push(newFilterCardObject);
            newItemOrderOffset++;
        }

        this._oJSONModels.configEditorJSONModel.setData(allData);

    };


    ConfigModelsManager.prototype._checkExistingConditionType = function (
        newName, newKey) {

        var configForUi = this._configModelsData.getModelData();
        var existionConditionType = configForUi.configEditorModelData.conditionTypes;

        for (var condKey in existionConditionType) {
            var conditionType = existionConditionType[condKey];
            if (conditionType.key == newKey) {
                //alert('Condition Type Exist');
                return conditionType;
            }
        }

        var newConditionType = this._configModelsData.getEmptyConditionType(newName, newKey);
        configForUi.configEditorModelData.conditionTypes.push(newConditionType);

        return newConditionType;
    };
    /**
     * Accept the suggested element (filter card or attribute - move it from the
     * suggested list to the regular list
     */
    ConfigModelsManager.prototype._acceptSuggestedElement = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var currentData = allData;

        var objToAcceptInfo = this._findObjectByPath(currentData, oEventData.path);
        var objToAccept = objToAcceptInfo[0];
        objToAccept.idName = ""; // Ensures that a uuid is created afterwards
        currentData = objToAcceptInfo[1];

        // clone the object
        var newObject = JSON.parse(JSON.stringify(objToAccept));
        if (newObject.hasOwnProperty("isNew")) {
            newObject.isNew = true;
        }

        if (newObject.hasOwnProperty("attributes")) {
            for (var attr in newObject.attributes) {
                newObject.attributes[attr].idName = (newObject.attributes[attr].idName + "_" + ConfigUtils.createGuid())
                    .match(/[a-zA-Z0-9_]+/g).join("_");
            }
        }

        var arrayToAddTo = null;

        if (oEventData.cardType === ConfigModelsManager.prototype.ConfigLevel.FILTER_CARD) {
            // add to the filter cards list
            arrayToAddTo = allData.filterCards;
        } else if (oEventData.cardType === ConfigModelsManager.prototype.ConfigLevel.ATTRIBUTE) {
            //add to attribute list
            arrayToAddTo = allData.generalSettingsFilterCards[0].attributes;
        }

        var arrayLength = arrayToAddTo.length;
        newObject.order = 0;
        newObject.editable = true;

        for (var i = 0; i < arrayToAddTo.length; i++) {
            if (arrayToAddTo[i].hasOwnProperty("order")) {
                arrayToAddTo[i].order = arrayToAddTo[i].order + 1;
            } else {
                arrayToAddTo[i].order = i + 1;
            }
        }

        arrayToAddTo.push(newObject);

        this._oJSONModels.configEditorJSONModel.setData(allData);

        if (oEventData.callBack) {
            oEventData.callBack();
        }

    };

    ConfigModelsManager.prototype._findObjectByPath = function (
        currentData, path) {

        var pathArr = path.split("/");

        var index = parseInt(pathArr[pathArr.length - 1]);

        // remove the last element of the array, i.e. the index
        pathArr.splice(pathArr.length - 1, 1);

        // if the path starts with a slash, the first elem in the array will be
        // empty
        if (!pathArr[0]) {
            pathArr = pathArr.slice(1);
        }
        // traverse the data using the path
        for (var i = 0; i < pathArr.length; i++) {
            currentData = currentData[pathArr[i]];
        }

        var arrayToReturn = [currentData[index], currentData];

        return arrayToReturn;
    };

    ConfigModelsManager.prototype._attributeEqual = function (attribute1, attribute2) {
        if (!(this._compareProperty(attribute1.defaultFilter, attribute2.defaultFilter))) return false;
        if (!(this._compareProperty(attribute1.expression, attribute2.expression))) return false;
        if (!(this._compareProperty(attribute1.from, attribute2.from))) return false;
        if (!(this._compareProperty(attribute1.extraData, attribute2.extraData))) return false;
        if (!(this._compareProperty(attribute1.langName, attribute2.langName))) return false;
        if (!(this._compareProperty(attribute1.measureExpression, attribute2.measureExpression))) return false;
        if (!(this._compareProperty(attribute1.type, attribute2.type))) return false;
        if (!(this._compareProperty(attribute1.name, attribute2.name))) return false;

        return true;
    };

    ConfigModelsManager.prototype._attributeExist = function (newAttribute, attributeArray) {
        for (var i = 0; i < attributeArray.length; i++)
            if (this._attributeEqual(newAttribute, attributeArray[i])) return true;
        return false;
    };

    ConfigModelsManager.prototype._filterCardEqual = function (filterCard1, filterCard2) {
        if (!(this._compareProperty(filterCard1.additionalInformation, filterCard2.additionalInformation))) return false;
        if (!(this._compareProperty(filterCard1.conditionType, filterCard2.conditionType))) return false;
        if (!(this._compareProperty(filterCard1.defaultFilter, filterCard2.defaultFilter))) return false;
        if (!(this._compareProperty(filterCard1.description, filterCard2.description))) return false;
        if (!(this._compareProperty(filterCard1.from, filterCard2.from))) return false;
        if (!(this._compareProperty(filterCard1.langName, filterCard2.langName))) return false;
        if (!(this._compareProperty(filterCard1.name, filterCard2.name))) return false;
        if (!(this._compareProperty(filterCard1.attributes.length, filterCard2.attributes.length))) return false;

        for (var i = 0; i < filterCard1.attributes.length; i++)
            if (!this._attributeExist(filterCard1.attributes[i], filterCard2.attributes)) return false;

        return true;
    };

    ConfigModelsManager.prototype._suggestedFilterCardExist = function (suggestedFilterCard) {
        var data = this._oJSONModels.configEditorJSONModel.getData();

        for (var i = 0; i < data.suggestedFilterCards.length; i++)
            if (this._filterCardEqual(suggestedFilterCard, data.suggestedFilterCards[i])) return true;

        for (var i = 0; i < data.filterCards.length; i++)
            if (this._filterCardEqual(suggestedFilterCard, data.filterCards[i])) return true;


        return false;
    };

    ConfigModelsManager.prototype._compareProperty = function (property1, property2) {
        if ((property1 instanceof Object) && (property2 instanceof Object))
            return JSON.stringify(property1) === JSON.stringify(property2);
        else return property1 === property2;
    };

    ConfigModelsManager.prototype.addToModelFromConfig = function (
        beConfig) {

        var data = this._oJSONModels.configEditorJSONModel.getData();

        this._addGeneralSettingsCards(beConfig.patient, data, true);

        if (beConfig.patient.hasOwnProperty("interactions")) {
            for (var inter in beConfig.patient.interactions) {

                var uiCard = this._convertBeInteractionToFilterCard(inter,
                    beConfig.patient.interactions[inter],
                    this._configModelsData.getEmptyConditionType());
                uiCard.editable = false;
                if (!this._suggestedFilterCardExist(uiCard)) {
                    data.suggestedFilterCards.push(uiCard);
                }
            }
        }

        this._oJSONModels.configEditorJSONModel.setData(data);
    };

    ConfigModelsManager.prototype._addGeneralSettingsCards = function (
        beConfig, configForUi, areNewCards) {

        var generalDataCard = null,
            defaultCard = null;

        for (var i = 0; i < configForUi.generalSettingsFilterCards.length; ++i) {
            if (configForUi.generalSettingsFilterCards[i].idName === "basicData") {
                generalDataCard = configForUi.generalSettingsFilterCards[i];
            } else if (configForUi.generalSettingsFilterCards[i].idName === "defaultAttributes") {
                defaultCard = configForUi.generalSettingsFilterCards[i];
            }
        }

        if (!generalDataCard) {

            // add general data and default attribute filter card - only if not
            // exist
            var basicDataName = ConfigUtils.getText("HPH_CDM_CFG_TITLE_BASIC_DATA");

            generalDataCard = this._configModelsData.getEmptyFilterCard(
                basicDataName, "basicData");

            generalDataCard["suggestedAttributes"] = [];

            // temp temp temp - this needs to be removed when the DB keeps
            // the data
            generalDataCard.changeable = false;
            generalDataCard.order = 0;

            generalDataCard.description = ConfigUtils
                .getText("HPH_CDM_CFG_TITLE_BASIC_DATA_DESC");
            generalDataCard.isNew = areNewCards;

            configForUi.generalSettingsFilterCards.push(generalDataCard);
        }
        if (!defaultCard) {
            var defAttributesName = ConfigUtils
                .getText("HPH_CDM_CFG_TITLE_DEFAULT_ATTRIBUTES");

            defaultCard = this._configModelsData.getEmptyFilterCard(defAttributesName, "defaultAttributes");
            defaultCard.order = 1;
            defaultCard.changeable = false;
            defaultCard.isNew = areNewCards;
            defaultCard.description = ConfigUtils
                .getText("HPH_CDM_CFG_DEFAULT_ATTRIBUTES_DESC");
            defaultCard.additionalInformation = ConfigUtils
                .getText("HPH_CDM_CFG_DEFAULT_ATTR_ADDITIONAL_DESC");
            defaultCard.langName.value.push({
                "lang": "",
                "value": defAttributesName
            });
            configForUi.generalSettingsFilterCards.push(defaultCard);
        }

        // adding the attributes
        if (beConfig.hasOwnProperty("attributes")) {

            var attributes = beConfig.attributes;

            for (var attrId in attributes) {

                if (attributes.hasOwnProperty(attrId)) {

                    var attr = attributes[attrId];

                    if (attr.hasOwnProperty("isSuggestion")) {
                        if (!this._isCardContainsSuggestedAttribute(generalDataCard, attrId)) {
                            this._addOneAttributeToCard(attrId, attr, generalDataCard, true);
                        }
                    } else if (!attr.hasOwnProperty("isDefault") ||
                        attr.isDefault === false) {
                        if (!this._isCardContainsAttribute(generalDataCard, attrId)) {
                            this._addOneAttributeToCard(attrId, attr,
                                generalDataCard, false);
                        }
                    } else {
                        if (!this._isCardContainsAttribute(defaultCard, attrId)) {
                            this._addOneAttributeToCard(attrId, attr, defaultCard, false);
                        }
                    }
                }
            }
        }
    };

    ConfigModelsManager.prototype._isCardContainsAttribute = function (
        card, attributeId) {

        for (var i = 0; i < card.attributes.length; ++i) {

            if (card.attributes[i].idName === attributeId) {
                return true;
            }
        }

        return false;
    };

    ConfigModelsManager.prototype._isCardContainsSuggestedAttribute = function (
        card, attributeId) {

        for (var i = 0; i < card.suggestedAttributes.length; ++i) {

            if (card.suggestedAttributes[i].idName === attributeId) {
                return true;
            }
        }

        return false;
    };

    ConfigModelsManager.prototype._reorderArrayModel = function (
        sChannelId, sEventId, oEventData) {

        var allData = this._oJSONModels.configEditorJSONModel.getData();

        var newOrderArray = oEventData.newOrderArray;
        var path = oEventData.path;

        var currentData = allData;

        var pathArr = path.split("/");

        // if the path starts with a slash, the first elem in the array will be
        // empty
        if (!pathArr[0]) {
            pathArr = pathArr.slice(1);
        }
        // traverse the data using the path
        for (var i = 0; i < pathArr.length; i++) {
            currentData = currentData[pathArr[i]];
        }

        // recompute the order property based on the new order received
        for (i = 0; i < newOrderArray.length; i++) {
            currentData[newOrderArray[i]].order = i;
        }

        this._oJSONModels.configEditorJSONModel.setData(allData);

    };

    ConfigModelsManager.prototype._addOneAttributeToCard = function (
        attributeId, attribute, card, isSuggestion) {
        var newAttribute = this._configModelsData.getEmptyAttribute();
        newAttribute.idName = attributeId; // placeHolder for the property
        // name
        newAttribute.isNew = false;
        // catalog attribute
        newAttribute.isCatalogAttribute = false;
        newAttribute.frontEndID.value = attributeId;

        var extraData = {};
        for (var prop in attribute) {

            if (attribute.hasOwnProperty(prop)) {

                // convert the property if needed
                if (BackendLinker._backToFrontPropertyConverter
                    .hasOwnProperty(prop)) {
                    BackendLinker._backToFrontPropertyConverter[prop](
                        attribute[prop], newAttribute);

                } else if (!newAttribute.hasOwnProperty(prop) && prop !== "id" &&
                    prop !== "order" && prop !== "isDefault" && prop !== "isSuggestion") {
                    extraData[prop] = attribute[prop];
                } else {
                    // just copy the property
                    newAttribute[prop] = attribute[prop];
                }
            }
        }

        var supportedLanguages = this._configModelsData._configModelsData.configGeneralModelData.supportedLanguages.map(function (langObj) { return langObj.key; });
        if (newAttribute.langName) {
            for (var i = 0; i < newAttribute.langName.length; i++) {
                if (supportedLanguages.indexOf(newAttribute.langName.value[i].lang) >= 0) {
                    newAttribute.langName.value[i].enabled = true;
                } else {
                    newAttribute.langName.value[i].enabled = false;
                }
            }

        }
        if (!newAttribute.langName) {
            newAttribute.langName = { value: [] };
        }
        var languagesInAttribute = newAttribute.langName.value.map(function (langObj) { return langObj.lang; });
        for (var i = 0; i < supportedLanguages.length; i++) {
            if (languagesInAttribute.indexOf(supportedLanguages[i]) < 0) {
                newAttribute.langName.value.push({
                    lang: supportedLanguages[i],
                    value: "",
                    enabled: false
                });
            }
        }

        if (!jQuery.isEmptyObject(extraData)) {
            newAttribute.extraData.value = JSON.stringify(extraData);
        }

        if (!isSuggestion) {
            // if the order was not copied from the be attribute, assign a new order
            if (!newAttribute.hasOwnProperty("order")) {
                newAttribute.order = card.attributes.length;
            }

            card.attributes.push(newAttribute);
        } else {
            // if the order was not copied from the be attribute, assign a new order
            if (!newAttribute.hasOwnProperty("order")) {
                newAttribute.order = card.suggestedAttributes.length;
            }

            card.suggestedAttributes.push(newAttribute);
        }

    };

    ConfigModelsManager.prototype._isEmptyProperty = function (
        property) {

        // null and undefined are "empty"
        if (property === null || property === "") {
            return true;
        }
        return false;

    };

    ConfigModelsManager.prototype._getDataOfModel = function (
        modelName) {

        var allData = null;

        switch (modelName) {

            case ConfigUtils.models.CONFIG_OVERVIEW:
                allData = this._oJSONModels.configOverviewJSONModel.getData();
                break;

            case ConfigUtils.models.CONFIG_EDITOR:
                allData = this._oJSONModels.configEditorJSONModel.getData();
                break;

            default:
                allData = this._oJSONModels.configEditorJSONModel.getData();
                break;
        }

        return allData;
    };

    ConfigModelsManager.prototype._setDataOfModel = function (
        allData, modelName) {

        switch (modelName) {

            case ConfigUtils.models.CONFIG_OVERVIEW:
                this._oJSONModels.configOverviewJSONModel.setData(allData);
                break;

            case ConfigUtils.models.CONFIG_EDITOR:
                this._oJSONModels.configEditorJSONModel.setData(allData);
                break;

            default:
                this._oJSONModels.configEditorJSONModel.setData(allData);
                break;
        }
    };
    ConfigModelsManager.prototype._getErrorMessage = function (
        error) {
        var errorMsg = 'MESSAGE_NOT_DEFINED';
        if (error.messageKey) {
            errorMsg = ConfigUtils.getText(error.messageKey, error.values);
        }
        return errorMsg;
    };

    ConfigModelsManager.prototype._propagateInvalidState = function (
        feConfig, bePath, status) {
        var beParentPath, parents, parentElement;
        parents = bePath
            .match(/(^settings\.[a-zA-Z]+)|(^(otsTableMap|tableMapping|guardedTableMapping)\.[a-zA-Z0-9@_]+)|(^((?:patient(?:\.conditions\.[a-zA-Z0-9_]+)?)(?:\.interactions\.[a-zA-Z0-9_]+)?)(?:\.attributes\.[a-zA-Z0-9_]+)?)/);
        
        if (parents === null) {
            console.error("Did not found parent %s of feElement %s",
                beParentPath, bePath);
            return;
        }
        
        for (var j = 0; j < parents.length; j++) {
            if (parents[j] && parents[j] !== "patient") {
                beParentPath = parents[j];
                parentElement = this._getfeConfigElementByBackendPath(feConfig,
                    beParentPath);
                if (parentElement) {
                    this._setValidStateOfConfigElement(parentElement, status);
                    this.invalidatedElements.push(parentElement);

                    // for patient attributes we have to check, which
                    // generalSettingsCard we need to invalidate
                    if (beParentPath
                        .match(/^(patient\.attributes)\.[a-zA-Z0-9_]+$/)) {
                        if (feConfig.generalSettingsFilterCards[0].attributes
                            .indexOf(parentElement) !== -1) {
                            this._setValidStateOfConfigElement(
                                feConfig.generalSettingsFilterCards[0], status);
                            this.invalidatedElements
                                .push(feConfig.generalSettingsFilterCards[0]);
                        } else {
                            this._setValidStateOfConfigElement(
                                feConfig.generalSettingsFilterCards[1], status);
                            this.invalidatedElements
                                .push(feConfig.generalSettingsFilterCards[1]);
                        }
                    }

                    var rootProperty = this._getfeConfigParentElementByBackendPath(feConfig,
                        beParentPath);
                    this._setValidStateOfConfigElement(rootProperty, status);
                    this.invalidatedElements.push(rootProperty);

                } else {
                    console.error("Did not found parent %s of feElement %s",
                        beParentPath, bePath);
                }
            }
        }
    };
    ConfigModelsManager.prototype._resetConfigValidStates = function () {
        if (this.invalidatedElements) {
            for (var i = 0; i < this.invalidatedElements.length; i++) {
                this._setValidStateOfConfigElement(this.invalidatedElements[i],
                    "valid");
            }
        }
        this.invalidatedElements = [];
        this._oJSONModels.configEditorJSONModel.setData(this._configModelsData
            .getModelData().configEditorModelData);
    };

    ConfigModelsManager.prototype._setValidStateOfConfigElement = function (
        element, validStatus) {
        if (element.validity) {
            element.validity.status = validStatus;
        } else {
            element.validity = {
                status: validStatus
            };
        }
    };
    
    ConfigModelsManager.prototype._getfeConfigParentElementByBackendPath = function (
        feConfig, bePath) {
        var parentElement = bePath.split(".")[0];

        var map = {
            "patient": "cdm",
            "tableMapping": "tableMappings",
            "otsTableMap": "tableMappings",
            "guardedTableMapping": "tableMappings",
            "settings": "settings"
        };

        return feConfig.configNavStatus[map[parentElement]];
    };

    ConfigModelsManager.prototype._getfeConfigElementByBackendPath = function (
        feConfig, bePath) {

        var match;
        for (var j = 0; j < this.transformationFunctions.length; j++) {
            match = this.transformationFunctions[j].regex.exec(bePath);
            if (match) {
                return this.transformationFunctions[j].getElement(match, feConfig);
            }
        }
    };

    ConfigModelsManager.prototype._loadTemplates = function (oData, configForUi) {

        var that = this;

        var allTemplateData = oData;
        var inter, inter2;
        var itemCount = 0;

        if (oData) {
            var emptyCondObject = that._configModelsData.getEmptyConditionType();
            configForUi.configEditorModelData.conditionTypesFromTemplate.push(emptyCondObject);

            for (inter2 in allTemplateData) {
                var system = allTemplateData[inter2];
                var systemCard = that._configModelsData.getEmptyFilterCardGroup(system.name, inter2);

                if (system.hasOwnProperty("configuration")) {
                    var systemTemplate = system.configuration;
                    if (systemTemplate.hasOwnProperty("patient")) {
                        var templateData = systemTemplate.patient;

                        if (templateData.hasOwnProperty("interactions")) {
                            for (inter in templateData.interactions) {
                                var uiCard = that._convertBeInteractionToFilterCard(inter,
                                    templateData.interactions[inter], that._configModelsData
                                        .getEmptyConditionType());
                                uiCard.editable = false;
                                systemCard.filterCards.push(uiCard);
                                configForUi.configEditorModelData.templateFilterCards.push(uiCard);
                                itemCount++;
                            }
                        }

                        if (templateData.hasOwnProperty("conditions")) {
                            $.each(templateData.conditions, function (key, cond) {

                                var condKey = key,
                                    condName;
                                if (typeof cond.name === "object") {
                                    condName = cond.name[0].value;
                                } else {
                                    condName = condKey;
                                }

                                var condObject = that._configModelsData.getEmptyConditionType(condName,
                                    condKey);

                                configForUi.configEditorModelData.conditionTypesFromTemplate.push(condObject);

                                if (cond.hasOwnProperty("interactions")) {
                                    for (var inter in cond.interactions) {
                                        condObject = that._configModelsData.getEmptyConditionType(condName,
                                            condKey);
                                        var uiCard = that._convertBeInteractionToFilterCard(inter,
                                            cond.interactions[inter], condObject);
                                        uiCard.editable = false;
                                        systemCard.filterCards.push(uiCard);
                                        configForUi.configEditorModelData.templateFilterCards.push(uiCard);
                                        itemCount++;
                                    }
                                }
                            });
                        }
                    }
                }

                if (systemCard.filterCards.length > 0) configForUi.configEditorModelData.templateFilterCardsGroup.push(systemCard);
            }
        }
        //Add Empty Condition Type
        sap.ui
            .getCore()
            .getEventBus()
            .publish(
            ConfigUtils.configEvents.EVENT_TEMPLATE_LOAD, {
                templateLoad: itemCount
            });

        return configForUi;
    };



    ConfigModelsManager.prototype._updateIDValidation = function (
        sChannelId, sEventId, oEventData) {

        var modelData = this._configModelsData.getModelData();
        var fevalidations = modelData.configEditorModelData.feValidation;

        var idValid = oEventData.valid;
        var errorPath = oEventData.path;
        var idType = oEventData.idType;
        var basePath = "patient";
        var bePath = "";

        var parsedPath = errorPath.split("/");
        var filterCard = modelData.configEditorModelData[parsedPath[1]][parsedPath[2]];

        if (idType === "ATTRIBUTE") {

            if ((filterCard.conditionType) && (!(filterCard.conditionType.key === ""))) {
                basePath = basePath + ".conditions." + filterCard.conditionType.key;
            }

            if (parsedPath[1] === "filterCards") {
                basePath = basePath + ".interactions." + filterCard.idName;
            }

            var attribute = filterCard[parsedPath[3]][parsedPath[4]];
            bePath = basePath + ".attributes." + attribute.idName;


        } else {

            if ((filterCard.conditionType) && (!(filterCard.conditionType.key === ""))) {
                basePath = basePath + ".conditions." + filterCard.conditionType.key;
            }

            bePath = basePath + ".interactions." + filterCard.idName;

        }

        if (!idValid) {
            var errorObj = {
                isError: true,
                path: bePath + ".frontEndID",
                messageKey: oEventData.errorType,
                errorPath: errorPath
            };
            fevalidations.push(errorObj);
        } else {
            /*
            var l = fevalidations.length
            while (l--) {
            	if(fevalidations[l].errorPath === errorPath){
            		fevalidations.splice(l,1);
            	}
            }*/
            fevalidations = [];
        }

        modelData.configEditorModelData.feValidation = fevalidations;
        this._configModelsData._configModelsData = modelData;

        this._redrawConfigValidStates();
    };

    ConfigModelsManager.prototype._redrawConfigValidStates = function () {
        this._resetConfigValidStates();

        var feConfig = this._configModelsData.getModelData().configEditorModelData;

        var messages = [];

        var beWarnings = feConfig.beWarning;
        if (beWarnings && beWarnings.length > 0) {
            var warnings = beWarnings.map(function (obj) {
                obj.isError = false;
                return obj;
            });
            messages = messages.concat(warnings);
        }

        var beErrors = feConfig.beValidation;
        if (beErrors && beErrors.length > 0) {
            var errors = beErrors.map(function (obj) {
                obj.isError = true;
                return obj;
            });
            messages = messages.concat(errors);
        }

        var queryvalidations = feConfig.queryValidation;
        if (queryvalidations && queryvalidations.length > 0) {
            var queryErrors = queryvalidations.map(function (obj) {
                obj.isError = true;
                obj.messageKey = "HPH_CDM_CONFIG_ERROR_INVALID_QUERY";
                if (obj.message) {
                    obj.messageKey = obj.message;
                } 
                obj.path = obj.source;
                return obj;
            });
            messages = messages.concat(queryErrors);
        }

        var fevalidations = feConfig.feValidation;
        if (fevalidations && fevalidations.length > 0) {
            var feErrors = fevalidations.map(function (obj) {
                obj.isError = true;
                return obj;
            });
            messages = messages.concat(feErrors);
        }

        var bePath, feConfigElement, status;
        for (var i = 0; i < messages.length; i++) {
            status = messages[i].isError ? "invalid" : "warning";
            bePath = messages[i].path;
            feConfigElement = this._getfeConfigElementByBackendPath(feConfig,
                bePath);
            if (feConfigElement) {

                feConfigElement.validity = {
                    status: status,
                    message: this._getErrorMessage(messages[i])
                };
                this.invalidatedElements.push(feConfigElement);

                // propagate the invalid state
                this._propagateInvalidState(feConfig, bePath, status);
            } else {
                console.error("Did not found element for %s", bePath);
            }

        }
        this._oJSONModels.configEditorJSONModel.setData(this._configModelsData
            .getModelData().configEditorModelData);
    };

    ConfigModelsManager.prototype._updateConfigValidStates = function (
        cdmConfigErrors, advanceConfigErrors, aWarnings) {
        var modelData = this._configModelsData.getModelData();

        var errors = cdmConfigErrors.map(function (obj) {
            obj.isError = true;
            return obj;
        }); // todo: forEach?
        var warnings = aWarnings.map(function (obj) {
            obj.isError = false;
            return obj;
        });

        modelData.configEditorModelData.beWarning = warnings;
        modelData.configEditorModelData.beValidation = errors;
        modelData.configEditorModelData.queryValidation = advanceConfigErrors;

        this._configModelsData._configModelsData = modelData;

        this._redrawConfigValidStates();

    };

    ConfigModelsManager.prototype._updateConfigEditFlag = function (editFlag) {
        // var modelData = this._configModelsData.getModelData();
        // modelData.configEditorModelData.editFlag = editFlag;
        // this._configModelsData._configModelsData = modelData;
    };

    //////////////////////////////////////////////////
    //				Static Variables				//
    //////////////////////////////////////////////////


    ConfigModelsManager.prototype.transformationFunctions = [


        // /////////////////
        // Documentation //
        // /////////////////
        /*
         * To find and element in the frontend configuration by a backend path,
         * we need to run specific functions depending on which part of the
         * backend config is queried. In this list we have different objects
         * containing a regex to match the backend path and a function to run,
         * to identify the respectiv frontend element.
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | v | |
         * -------------- | | | Conditions | | | -------------- v | |
         * ---------------- | --->| Interactions | | ---------------- v | |
         * ------------- | --->| Attributes | | ------------- | | ----------- |
         * ----> | Name | --------------------> -----------
         */

        // ////////////
        // Elements //
        // ////////////
        /*
         * --------------------------------------------------------- | Patient |
         * ---------------------------------------------------------
         */

        {
            regex: /^patient$/,
            getElement: function (arg, feConfig) {
                return feConfig;
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | --------------
         *
         */

        {
            regex: /^patient\.conditions$/,
            getElement: function (arg, feConfig) {
                return feConfig.conditionTypes;
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1];
                return feConfig.conditionTypes.filter(function (element) {
                    return element.key === conditionId;
                })[0];
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | -------------- | | | | | | |
         * ----------- | | Name | --------------------------------> -----------
         *
         */

        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1];
                var conditions = feConfig.conditionTypes.filter(function (cond) {
                    return cond.key === conditionId;
                });
                if (conditions.length === 1) {
                    return conditions[0];
                }
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | -------------- | ---------------- --->|
         * Interactions | ---------------- | | | | ----------- | | Name |
         * --------------------> -----------
         */

        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    interactions;
                interactions = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    });
                return interactions[0].name;

            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.name\.(\d)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    nameIndex = arg[3],
                    interactions; // ,
                // property
                // =
                // arg[4]
                interactions = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    });
                return (nameIndex === "0" ? interactions[0].name :
                    interactions[0].langName); // .value[parseInt(nameIndex)-1]);

            }
        },
        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | -------------- | ---------------- --->|
         * Interactions | ----------------
         */

        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions$/,
            getElement: function (arg, feConfig) {
                // var conditionId = arg[1];
                return feConfig.filterCards;
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    property = arg[3],
                    interactions;
                interactions = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    });
                if (property) {
                    return interactions[0][property];
                } else {
                    return interactions[0];
                }
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.from\.([@a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    interactions; // ,
                // property
                // =
                // arg[3]
                interactions = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    });
                return interactions[0].from; // .value.filter(function(element){element.placeholder
                // === property})[0];
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | -------------- | ---------------- --->|
         * Interactions | ---------------- | ------------- --->| Attributes |
         * ------------- | ----------- ----> | Name | -----------
         */

        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    attributeId = arg[3];
                return feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    })[0].attributes.filter(function (element) {
                        return (element.idName === attributeId);
                    })[0].name;
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.name\.(\d)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    attributeId = arg[3],
                    nameIndex = arg[4],
                    attributes; // ,
                // property
                // =
                // arg[5]
                attributes = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    })[0].attributes.filter(function (element) {
                        return (element.idName === attributeId);
                    });
                return (nameIndex === "0" ? attributes[0].name :
                    attributes[0].langName); // .value[parseInt(nameIndex)-1]);

            }
        },
        /*
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | v
         * -------------- | Conditions | -------------- | ---------------- --->|
         * Interactions | ---------------- | ------------- --->| Attributes |
         * -------------
         */

        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.attributes$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2];
                return feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    })[0].attributes;
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    attributeId = arg[3],
                    property = arg[4],
                    attributes;
                attributes = feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    })[0].attributes.filter(function (element) {
                        return (element.idName === attributeId);
                    });
                if (attributes.length === 0) {
                    return null;
                } else if (property) {
                    if (attributes[0].hasOwnProperty(property)) {
                        return attributes[0][property];
                    } else {
                        return attributes[0].extraData;
                    }
                } else {
                    return attributes[0];
                }
            }
        },
        {
            regex: /^patient\.conditions\.([a-zA-Z0-9_]+)\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.from\.([@a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var conditionId = arg[1],
                    interactionId = arg[2],
                    attributeId = arg[3]; // ,
                // property
                // =
                // arg[4]
                return feConfig.filterCards
                    .filter(function (element) {
                        return (element.conditionType.key === conditionId && element.idName === interactionId);
                    })[0].attributes.filter(function (element) {
                        return (element.idName === attributeId);
                    })[0].from; // .value.filter(function(element){element.placeholder
                // === property})[0];
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | v
         * ---------------- | Interactions | ---------------- | | | |
         * ----------- | | Name | --------------------> -----------
         */

        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1];
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                return interactions[0].name;
            }
        },
        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.name\.(\d)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    nameIndex = arg[2]; // , property =
                // arg[3]
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                return (nameIndex === "0" ? interactions[0].name :
                    interactions[0].langName); // .value[parseInt(nameIndex)-1]);
            }
        },
        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | v
         * ---------------- | Interactions | ----------------
         */

        {
            regex: /^patient\.interactions$/,
            getElement: function (arg, feConfig) {
                return feConfig.filterCards;
            }
        },
        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    property = arg[2];
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                if (property) {
                    return interactions[0][property];
                } else {
                    return interactions[0];
                }

            }
        },
        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.from\.([@a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1]; // , property = arg[2]
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                return interactions[0].from; // .value.filter(function(element){element.placeholder
                // === property})[0];
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | v
         * ---------------- | Interactions | ---------------- | -------------
         * --->| Attributes | ------------- | ----------- ----> | Name |
         * -----------
         */

        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    attributeId = arg[2];
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                var attributes = interactions[0].attributes.filter(function (
                    element) {
                    return element.idName === attributeId;
                });
                return attributes[0].name;
            }
        },
        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.name\.(\d)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    attributeId = arg[2],
                    nameIndex = arg[3]; // ,
                // property
                // =
                // arg[4]
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                var attributes = interactions[0].attributes.filter(function (
                    element) {
                    return element.idName === attributeId;
                });
                return (nameIndex === "0" ? attributes[0].name :
                    attributes[0].langName); // .value[parseInt(nameIndex)-1]);
            }
        },
        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | v
         * ---------------- | Interactions | ---------------- | -------------
         * --->| Attributes | -------------
         */

        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    attributeId = arg[2],
                    property = arg[3];
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                var attributes = interactions[0].attributes.filter(function (
                    element) {
                    return element.idName === attributeId;
                });
                if (attributes.length === 0) {
                    return null;
                } else if (property) {
                    if (attributes[0].hasOwnProperty(property)) {
                        return attributes[0][property];
                    } else {
                        return attributes[0].extraData;
                    }
                } else {
                    return attributes[0];
                }
            }
        },
        {
            regex: /^patient\.interactions\.([a-zA-Z0-9_]+)\.attributes\.([a-zA-Z0-9_]+)\.from\.([@a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var interactionId = arg[1],
                    attributeId = arg[2]; // ,
                // property
                // = arg[3]
                var interactions = feConfig.filterCards
                    .filter(function (element) {
                        return element.idName === interactionId;
                    });
                var attributes = interactions[0].attributes.filter(function (
                    element) {
                    return element.idName === attributeId;
                });
                return attributes[0].from; // .value.filter(function(element){element.placeholder
                // === property})[0];
            }
        },
        /*
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | | | |
         * v ------------- | Attributes | ------------- | ----------- ----> |
         * Name | -----------
         */

        {
            regex: /^patient\.attributes\.([a-zA-Z0-9_]+)\.name$/,
            getElement: function (arg, feConfig) {
                var attributeId = arg[1];
                var attributes = feConfig.generalSettingsFilterCards[0].attributes
                    .concat(feConfig.generalSettingsFilterCards[1].attributes);
                attributes = attributes.filter(function (element) {
                    return element.idName === attributeId;
                });
                return attributes[0].name;
            }
        },
        {
            regex: /^patient\.attributes\.([a-zA-Z0-9_]+)\.name\.(\d)(?:\.([a-zA-Z0-9_]+))?$/,
            getElement: function (arg, feConfig) {
                var attributeId = arg[1],
                    nameIndex = arg[2]; // , property =
                // arg[3]
                var attributes = feConfig.generalSettingsFilterCards[0].attributes
                    .concat(feConfig.generalSettingsFilterCards[1].attributes);
                attributes = attributes.filter(function (element) {
                    return element.idName === attributeId;
                });
                return (nameIndex === "0" ? attributes[0].name :
                    attributes[0].langName); // .value[parseInt(nameIndex)-1]);
            }
        },

        /*
         *
         * --------------------------------------------------------- | Patient |
         * --------------------------------------------------------- | | | | | | |
         * v ------------- | Attributes | -------------
         *
         */

        {
            regex: /^patient\.attributes$/,
            getElement: function (arg, feConfig) {
                return feConfig.generalSettingsFilterCards[0];
            }
        },
        {
            regex: /^patient\.attributes\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?/,
            getElement: function (arg, feConfig) {
                var attributeId = arg[1],
                    property = arg[2];
                var attributes = feConfig.generalSettingsFilterCards[0].attributes
                    .concat(feConfig.generalSettingsFilterCards[1].attributes);
                attributes = attributes.filter(function (element) {
                    return element.idName === attributeId;
                });
                if (property) {
                    if (attributes[0].hasOwnProperty(property)) {
                        return attributes[0][property];
                    } else {
                        return attributes[0].extraData;
                    }
                } else {
                    return attributes[0];
                }

            }
        },
        {
            regex: /^patient\.attributes\.([a-zA-Z0-9_]+)\.from\.([@a-zA-Z0-9_]+)$/,
            getElement: function (arg, feConfig) {
                var attributeId = arg[1]; // , property = arg[2]
                var attributes = feConfig.generalSettingsFilterCards[0].attributes
                    .concat(feConfig.generalSettingsFilterCards[1].attributes);
                attributes = attributes.filter(function (element) {
                    return element.idName === attributeId;
                });
                return attributes[0].from; // .value.filter(function(element){element.placeholder
                // === property})[0];
            }
        },
        {
            regex: /^(tableMapping)\.(.*)/,
            getElement: function (arg, feConfig) {                
                function find(t) {
                    // update tableTypeplaceholders with columns from db
                    var found;
                    ConfigUtils.JSONFindAndDo(t,
                        function (obj, key) {
                            return key === "placeholder" && obj[key] === arg[2];
                        },
                        function (obj, key) {
                            found = obj;
                        });
                    return found;
                }
                var result1 = find(feConfig.tableTypePlaceholderMap);

                if (result1) {
                    return result1;
                }
                return find(feConfig.otherPlaceholders);                
            }
        },
        {
            regex: /^(guardedTableMapping)\.(.*)/,
            getElement: function (arg, feConfig) {
                function find(t) {
                    // update tableTypeplaceholders with columns from db
                    var found;
                    ConfigUtils.JSONFindAndDo(t,
                        function (obj, key) {
                            return key === "placeholder" && obj[key] === arg[2];
                        },
                        function (obj, key) {
                            found = obj;
                        });
                    return found;
                }               
                return find(feConfig.otherPlaceholders.guardedPlaceholder);
            }
        },
        {
            regex: /(otsTableMap)\.(.*)/,
            getElement: function (arg, feConfig) {
                function find(t) {
                    // update tableTypeplaceholders with columns from db
                    var found;
                    ConfigUtils.JSONFindAndDo(t,
                        function (obj, key) {
                            return key === "placeholder" && obj[key] === arg[2];
                        },
                        function (obj, key) {
                            found = obj;
                        });
                    return found;
                }
                return find(feConfig.otherPlaceholders.otsPlaceholder);
            }
        },
        {
            regex: /^settings\.([a-zA-Z]*)/,
            getElement: function (arg, feConfig) {
                return feConfig.settings[arg[1]];
            }
        }

    ];

    return ConfigModelsManager;
});
