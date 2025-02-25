sap.ui.define([
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "hc/mri/pa/config/ui/lib/Formatter",
    "sap/m/MessageBox",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, ConfigUtils, Formatter, MessageBox, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the DetailsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the details tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.DetailsTab
     */
    var DetailsTabController = Controller.extend("hc.mri.pa.config.ui.views.DetailsTab");

    DetailsTabController.prototype.formatter = Formatter;

    DetailsTabController.prototype.onInit = function () {
        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED,
            this.onConfigWasImported,
            this
        );

        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED,
            this.onVersionListUpdated,
            this
        );

        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED,
            this.onNewConfigCreated,
            this
        );

        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED_VIA_IMPORT,
            this.onNewConfigImported,
            this
        );

        var versionSelectionModel = new JSONModel({
            hideInactive: false
        });
        this.getView().setModel(versionSelectionModel);
    };

    /**
     * Event handler for onExit event of controller
     */
    DetailsTabController.prototype.onExit = function () {
        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_WAS_IMPORTED,
            this.onConfigWasImported,
            this
        );

        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED,
            this.onVersionListUpdated,
            this
        );

        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED,
            this.onNewConfigCreated,
            this
        );

        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CREATED_VIA_IMPORT,
            this.onNewConfigImported,
            this
        );
    };

    DetailsTabController.prototype.onNewConfigImported = function (sChannelId, sEventId, oEventData) {
        var that = this;
        this._versionWasChanged(false, null, function () {
            that.onConfigWasImported(sChannelId, sEventId, oEventData);
        });
    };

    /**
     * Event handler when a new config is created
     */
    DetailsTabController.prototype.onNewConfigCreated = function () {
        this._versionWasChanged(false, null);
    };

    /**
     * Handler for the change of the selection event on the data model version combo.
     * validation...
     */
    DetailsTabController.prototype.onDataModelVersionChanged = function () {
        var comboControl = this.byId("dataModelVersionCombo");
        var lastValue = comboControl._lastValue;
        var separator = " - ";
        var idxActive = lastValue.search(separator.concat(ConfigUtils.getText("MRI_PA_CFG_TITLE_ACTIVE_VERSION")));

        if (idxActive !== -1) {
            lastValue = lastValue.substring(0, idxActive);
        }
        var tryToSolveConflicts = typeof lastValue !== "undefined" && lastValue !== "";

        this._versionWasChanged(tryToSolveConflicts, lastValue);
    };

    DetailsTabController.prototype._versionWasChanged = function (tryToSolveConflicts, valueToRestore, callback) {
        var dependentConfig = this._getDependentConfigObject();

        var that = this;
        var comboControl = this.byId("dataModelVersionCombo");
        var bindingContext = this.getView().getBindingContext("analyticsModel");
        var oAnalyticsModel = bindingContext.getModel();
        var configPath = bindingContext.getPath() + "/config";
        var currentConfig = oAnalyticsModel.getProperty(configPath);

        ConfigUtils.ajax({
            url: "/pa-config-svc/services/config.xsjs",
            type: "POST",
            dataType: "json",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                action: "suggest",
                dependentConfig: dependentConfig
            })
        }).done(function (mData) {
            if (typeof currentConfig === "undefined") {
                // a new created configuration
                that._updateConfigModel(configPath, mData);
            } else if (!tryToSolveConflicts) {
                that._replaceCDWElementsInModel(mData);
            } else {
                // if there was a previous config - try to solve the conflicts
                var unchangedNewConfig = ConfigUtils.cloneJson(mData);
                var aRemovedElements = that._mergeCDWSettingsFromOldConfig(currentConfig, mData);

                var sClearSettings = ConfigUtils.getText("MRI_PA_CFG_CHANGE_DM_VERSION_CLEAR");
                var sMergeSettings = ConfigUtils.getText("MRI_PA_CFG_CHANGE_DM_VERSION_MERGE");
                var sMessage;

                if (aRemovedElements.length > 0) {
                    sMessage = ConfigUtils.getText("MRI_PA_CFG_CHANGE_DM_VERSION_WITH_CONFLICTS");
                } else {
                    sMessage = ConfigUtils.getText("MRI_PA_CFG_CHANGE_DM_VERSION_NO_CONFLICTS");
                }

                MessageBox.show(sMessage, {
                    icon: MessageBox.Icon.QUESTION,
                    title: ConfigUtils.getText("MRI_PA_CFG_CHANGE_DM_VERSION_TITLE"),
                    actions: [sMergeSettings, sClearSettings, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.CANCEL) {
                            // restore to previous value
                            comboControl.setSelectedKey(valueToRestore);
                        } else {
                            if (oAction === sMergeSettings) {
                                that._replaceCDWElementsInModel(mData);
                            } else if (oAction === sClearSettings) {
                                that._replaceCDWElementsInModel(unchangedNewConfig);
                            }

                            if (aRemovedElements.length > 0) {
                                // TODO consider giving a message to the user with the removed elements
                            }
                        }
                    }
                });
            }

            if (typeof callback === "function") {
                callback();
            }

            //
        }).fail(function () {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
            // restore to previous value
            comboControl.setSelectedKey(valueToRestore);
        });
    };

    /**
     * changes the CDW elements in the current config and set it on the model
     * @private
     * @param {object} sourceConfig configuration object
     */
    DetailsTabController.prototype._replaceCDWElementsInModel = function (sourceConfig) {
        var bindingContext = this.getView().getBindingContext("analyticsModel");
        var oAnalyticsModel = bindingContext.getModel();
        var configPath = bindingContext.getPath() + "/config";

        var currentConfig = oAnalyticsModel.getProperty(configPath);

        this._replaceCDWElementsInConfigFromOther(currentConfig, sourceConfig);

        this._updateConfigModel(configPath, currentConfig);
    };

    DetailsTabController.prototype._updateConfigModel = function (configPath, config) {
        var bindingContext = this.getView().getBindingContext("analyticsModel");
        var oAnalyticsModel = bindingContext.getModel();

        oAnalyticsModel.setProperty(configPath, config);

        sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
    };

    /**
     * changes the CDW elements in the given config
     * @private
     * @param {object} targetConfig Target configuration
     * @param {object} sourceConfig Source configuration
     */
    DetailsTabController.prototype._replaceCDWElementsInConfigFromOther = function (targetConfig, sourceConfig) {
        var sourceFilterCardSources = sourceConfig.filtercards.map(function (fCard) {
            return fCard.source;
        });
        var targetFilterCardSources = targetConfig.filtercards.map(function (fCard) {
            return fCard.source;
        });
        var addedFilterCardSources = sourceFilterCardSources.filter(function (fCardSource) {
            return targetFilterCardSources.indexOf(fCardSource) < 0;
        });
        var removedFilterCardSources = targetFilterCardSources.filter(function (fCardSource) {
            return sourceFilterCardSources.indexOf(fCardSource) < 0;
        });
        removedFilterCardSources.push("patient");

        targetConfig.filtercards = sourceConfig.filtercards;

        targetConfig.chartOptions.initialAttributes = sourceConfig.chartOptions.initialAttributes;
        targetConfig.panelOptions = sourceConfig.panelOptions;

        var genomicVariantInteraction = sourceConfig.filtercards.filter(function (fCard) {
            return (fCard.attributes.filter(function (attribute) {
                return attribute.annotations && attribute.annotations.indexOf("genomics_variant_location") >= 0;
            })).length > 0;
        }).map(function (fCard) {
            return fCard.source;
        });

        if (targetConfig.chartOptions.hasOwnProperty("km")) {
            targetConfig.chartOptions.km.filters = (targetConfig.chartOptions.km.filters) ? targetConfig.chartOptions.km.filters : [];
            targetConfig.chartOptions.km.selectedInteractions = (targetConfig.chartOptions.km.selectedInteractions) ? targetConfig.chartOptions.km.selectedInteractions : [];
            targetConfig.chartOptions.km.selectedEndInteractions = (targetConfig.chartOptions.km.selectedEndInteractions) ? targetConfig.chartOptions.km.selectedEndInteractions : [];

            if (targetConfig.chartOptions.km.hasOwnProperty("filters")) {
                targetConfig.chartOptions.km.filters = targetConfig.chartOptions.km.filters.filter(function (fCardSource) {
                    return sourceFilterCardSources.indexOf(fCardSource) < 0;
                });
            }
            if (targetConfig.chartOptions.km.hasOwnProperty("selectedInteractions")) {
                targetConfig.chartOptions.km.selectedInteractions = targetConfig.chartOptions.km.selectedInteractions.filter(function (fCardSource) {
                    return removedFilterCardSources.indexOf(fCardSource) < 0;
                });

                targetConfig.chartOptions.km.selectedInteractions = targetConfig.chartOptions.km.selectedInteractions.filter(function (fCardSource) {
                    return genomicVariantInteraction.indexOf(fCardSource) < 0;
                });
            }

            if (!targetConfig.chartOptions.km.hasOwnProperty("selectedEndInteractions")) {
                targetConfig.chartOptions.km.selectedEndInteractions = [];
            }
            targetConfig.chartOptions.km.selectedEndInteractions = targetConfig.chartOptions.km.selectedEndInteractions.filter(function (fCardSource) {
                return removedFilterCardSources.indexOf(fCardSource) < 0;
            });
            targetConfig.chartOptions.km.selectedEndInteractions = targetConfig.chartOptions.km.selectedEndInteractions.filter(function (fCardSource) {
                return genomicVariantInteraction.indexOf(fCardSource) < 0;
            });
        }
    };


    /**
     * Apply the settings in the imported config to the current one when possible (i.e. attribute/interaction exists)
     * @param {string} sChannelId Channel id
     * @param {string} sEventId   Event id
     * @param {object} oEventData Event data with
     *                            importedConfig - the config which was imported and needs to apply its data to the existing one
     *                            dependentConfig - details of the CDW config in order to fetch from the BE
     */
    DetailsTabController.prototype.onConfigWasImported = function (sChannelId, sEventId, oEventData) {
        var that = this;
        var importedConfig = oEventData.importedConfig;
        var dependentConfig = oEventData.dependentConfig;
        var bindingContext = this.getView().getBindingContext("analyticsModel");
        var oAnalyticsModel = bindingContext.getModel();
        var configPath = bindingContext.getPath() + "/config";

        ConfigUtils.ajax({
            url: "/pa-config-svc/services/config.xsjs",
            type: "POST",
            dataType: "json",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                action: "suggest",
                dependentConfig: dependentConfig
            })
        }).done(function (mData) {
            oAnalyticsModel.setProperty(bindingContext.getPath() + "/meta/dependentConfig", dependentConfig);

            // first copy the importedConfig in order to have it as a base
            var newConfig = ConfigUtils.cloneJson(importedConfig);

            // change the CDW parts to be as the current one
            // that is for having these parts consistent with the version which was chosen
            that._replaceCDWElementsInConfigFromOther(newConfig, mData);

            // now apply (when possible) the imported config CDW settings
            that._mergeCDWSettingsFromOldConfig(importedConfig, newConfig);

            that._updateConfigModel(configPath, newConfig);
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Success, "MRI_PA_CFG_IMPORT_SUCCESSFUL");
        }).fail(function () {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
        });
    };

    /**
     * Iterate through the new suggested config and keep all CDW related elements properties in order to keep the
     * previous configuration as much as possible
     * @private
     * @param   {object}   oldConfig Old configuration
     * @param   {object}   newConfig NEw configuration
     * @returns {object[]} an array with all removed elements
     */
    DetailsTabController.prototype._mergeCDWSettingsFromOldConfig = function (oldConfig, newConfig) {
        // first map all source paths for easier search
        var oOldConfigPath2Element = {};
        var oNewConfigPath2Element = {};

        var addElementsToMap = function (map, config) {
            config.filtercards.forEach(function (filterCard) {
                map[filterCard.source] = filterCard;
                filterCard.attributes.forEach(function (attribute) {
                    map[attribute.source] = attribute;
                });
            });
        };

        addElementsToMap(oOldConfigPath2Element, oldConfig);
        addElementsToMap(oNewConfigPath2Element, newConfig);

        var newFilterCardOrderingStart = oldConfig.filtercards.length;

        // Iterate through the new config elements and check if they were already in the previous config.
        // If so, take their properties' values in order to keep the settings
        newConfig.filtercards.forEach(function (filterCard) {
            var oldFilterCard = oOldConfigPath2Element[filterCard.source];
            if (oldFilterCard) {
                // the filter card was also in the previous config version
                filterCard.visible = oldFilterCard.visible;
                filterCard.initial = oldFilterCard.initial;
                filterCard.order = oldFilterCard.order;
                filterCard.initialPatientlistColumn = oldFilterCard.initialPatientlistColumn;
                var newAttributesOrderingStart = oldFilterCard.attributes.length;

                // now do the same for all relevant attributes
                filterCard.attributes.forEach(function (attribute) {
                    var oldAttribute = oOldConfigPath2Element[attribute.source];
                    if (oldAttribute) {
                        // the attribute was also in the previous config version
                        attribute.filtercard.initial = oldAttribute.filtercard.initial;
                        attribute.filtercard.visible = oldAttribute.filtercard.visible;
                        attribute.filtercard.order = oldAttribute.filtercard.order;
                        attribute.cached = oldAttribute.cached;
                        attribute.category = oldAttribute.category;
                        attribute.measure = oldAttribute.measure;
                        attribute.ordered = oldAttribute.ordered;
                        attribute.useRefText = oldAttribute.useRefText;
                        attribute.useRefValue = oldAttribute.useRefValue;
                        if (oldAttribute.hasOwnProperty("defaultBinSize")) {
                            attribute.defaultBinSize = oldAttribute.defaultBinSize;
                        }
                        attribute.patientlist.initial = oldAttribute.patientlist.initial;
                        attribute.patientlist.visible = oldAttribute.patientlist.visible;
                        attribute.patientlist.linkColumn = oldAttribute.patientlist.linkColumn;
                        if (oldAttribute.patientlist.hasOwnProperty("order")) {
                            attribute.patientlist.order = oldAttribute.patientlist.order;
                        }
                    } else {
                        // the attribute was not in the previous config version
                        newAttributesOrderingStart++;
                        attribute.filtercard.order = newAttributesOrderingStart;
                    }
                });

                filterCard.attributes.sort(function (a, b) {
                    return a.filtercard.order - b.filtercard.order;
                });

                for (var i = 0; i < filterCard.attributes.length; i++) {
                    filterCard.attributes[i].filtercard.order = i + 1;
                }
            } else {
                // the filter card was not in the previous config version
                newFilterCardOrderingStart++;
                filterCard.order = newFilterCardOrderingStart;
                filterCard.visible = false;
            }
        });

        newConfig.filtercards.sort(function (a, b) {
            return a.order - b.order;
        });
        for (var i = 0; i < newConfig.filtercards.length; i++) {
            newConfig.filtercards[i].order = i + 1;
        }

        // iterate through all old elements to check if something was deleted (Filtercard/Attribute)
        var aRemovedElements = [];
        for (var element in oOldConfigPath2Element) {
            var obj = oOldConfigPath2Element[element];
            var newElement = oNewConfigPath2Element[obj.source];
            if (!newElement) {
                // the element was deleted
                aRemovedElements.push(obj);
            }
        }

        // handle the initial attributes - if the previous ones still exist - copy them
        var newMesures = [];
        var newCategories = [];
        var addInitialAttributesToArray = function (origInititalArray, newArray) {
            origInititalArray.forEach(function (initialElement) {
                if (oNewConfigPath2Element[initialElement]) {
                    newArray.push(initialElement);
                }
            });
        };
        addInitialAttributesToArray(oldConfig.chartOptions.initialAttributes.measures, newMesures);
        addInitialAttributesToArray(oldConfig.chartOptions.initialAttributes.categories, newCategories);

        if (newMesures.length > 0) {
            newConfig.chartOptions.initialAttributes.measures = newMesures;
        }
        if (newCategories.length > 0) {
            newConfig.chartOptions.initialAttributes.categories = newCategories;
        }

        if (oldConfig.chartOptions.stacked) {
            newConfig.chartOptions.stacked = oldConfig.chartOptions.stacked;
        }
        if (oldConfig.chartOptions.boxplot) {
            newConfig.chartOptions.boxplot = oldConfig.chartOptions.boxplot;
        }
        if (oldConfig.chartOptions.km) {
            newConfig.chartOptions.km = oldConfig.chartOptions.km;
        }
        if (oldConfig.chartOptions.list) {
            newConfig.chartOptions.list = oldConfig.chartOptions.list;
        }

        if (oldConfig.chartOptions.initialChart) {
            newConfig.chartOptions.initialChart = oldConfig.chartOptions.initialChart;
        }
        if (oldConfig.chartOptions.hasOwnProperty("minCohortSize")) {
            newConfig.chartOptions.minCohortSize = oldConfig.chartOptions.minCohortSize;
        }

        if (oldConfig.panelOptions) {
            if (oldConfig.panelOptions.hasOwnProperty("addToCohorts")) {
                newConfig.panelOptions.addToCohorts = oldConfig.panelOptions.addToCohorts;
            }
            if (oldConfig.panelOptions.hasOwnProperty("calcViewAccessPoint")) {
                newConfig.panelOptions.calcViewAccessPoint = oldConfig.panelOptions.calcViewAccessPoint;
            }
            if (oldConfig.panelOptions.hasOwnProperty("domainValuesLimit")) {
                newConfig.panelOptions.domainValuesLimit = oldConfig.panelOptions.domainValuesLimit;
            }
            if (oldConfig.panelOptions.hasOwnProperty("maxFiltercardCount")) {
                newConfig.panelOptions.maxFiltercardCount = oldConfig.panelOptions.maxFiltercardCount;
            }
            if (oldConfig.panelOptions.hasOwnProperty("externalAccessPoints")) {
                newConfig.panelOptions.externalAccessPoints = oldConfig.panelOptions.externalAccessPoints;
            }
        }

        return aRemovedElements;
    };

    DetailsTabController.prototype._getDependentConfigObject = function () {
        var bindingContext = this.getView().getBindingContext("analyticsModel");
        return bindingContext.getModel().getProperty(bindingContext.getPath() + "/meta/dependentConfig");
    };

    DetailsTabController.prototype.onVersionListUpdated = function () {
        var inactiveControl = this.byId("disableInactiveCheckBox");
        inactiveControl.setSelected(false);

        var oSorter = new sap.ui.model.Sorter("version", null, null);
        oSorter.fnCompare = function (a, b) {
            return parseInt(b, 10) - parseInt(a, 10);
        };

        var comboControl = this.byId("dataModelVersionCombo");
        comboControl.getBinding("items").filter([]);
        comboControl.getBinding("items").sort(oSorter);
        comboControl.bindProperty("selectedKey", "analyticsModel>meta/dependentConfig/configVersion");
    };

    DetailsTabController.prototype.onFilterInactive = function (oEvent) {
        var filterInactive = oEvent.getParameter("selected");
        var inactiveFilter = [];
        if (filterInactive) {
            var oFilter1 = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "A");
            inactiveFilter.push(oFilter1);
        }
        var comboControl = this.byId("dataModelVersionCombo");
        comboControl.getBinding("items").filter(inactiveFilter);
    };

    return DetailsTabController;
});
