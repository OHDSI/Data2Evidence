sap.ui.define([
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/type/Float",
    "sap/ui/model/type/Integer",
    "sap/ui/unified/MenuItem",
    "sap/ui/model/json/JSONModel",
    "hc/mri/pa/config/ui/lib/Formatter"
], function (jQuery, ConfigUtils, Controller, Filter, Float, Integer, MenuItem, JSONModel, Formatter) {
    "use strict";

    /**
     * Constructor for the ChartsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the charts tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.ChartsTab
     */
    var ChartsTabController = Controller.extend("hc.mri.pa.config.ui.views.ChartsTab");

    ChartsTabController.prototype.formatter = Formatter;

    ChartsTabController.prototype.onInit = function () {
        this._chartsList = this.byId("chartsListId");
        this._initialChartSelect = this.byId("initialChartId");
        var that = this;

        // somehow that didn't work in the xml binding
        [
            {
                id: "pageSizeId",
                path: "analyticsModel>config/chartOptions/list/pageSize"
            }, {
                id: "generalCohortSizeId",
                path: "analyticsModel>config/chartOptions/minCohortSize"
            }
        ].forEach(function (obj) {
            this.byId(obj.id).bindProperty("value", {
                path: obj.path,
                type: new Integer()
            }).attachParseError(function (oEvent) {
                var oldValue = oEvent.getParameter("oldValue");
                ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_PLEASE_INSERT_INTEGER_VALUE");
                that.byId(obj.id).setValue(oldValue);
            });
        }, this);


        [
            {
                id: "subMenu1",
                buttonId: "mnuButton1Id",
                source: "/config/chartOptions/initialAttributes/categories/0",
                filter: "category"
            }, {
                id: "subMenu2",
                buttonId: "mnuButton2Id",
                source: "/config/chartOptions/initialAttributes/categories/1",
                filter: "category"
            }, {
                id: "subMenu3",
                buttonId: "mnuButton3Id",
                source: "/config/chartOptions/initialAttributes/categories/2",
                filter: "category"
            }, {
                id: "subMenu4",
                buttonId: "mnuButton4Id",
                source: "/config/chartOptions/initialAttributes/measures/0",
                filter: "measure"
            }
        ].forEach(function (obj) {
            that.byId(obj.id).bindAggregation("items", {
                path: "analyticsModel>attributes",
                filters: [
                    new Filter(obj.filter, sap.ui.model.FilterOperator.EQ, true)
                ],
                factory: function () {
                    var menu = new MenuItem({
                        text: "{analyticsModel>modelName}",
                        select: function (oEvent) {
                            that.handleMenuButtonSelect(oEvent);
                        }
                    });
                    menu.data("mySource", "{analyticsModel>source}");
                    menu.data("myButton", obj.buttonId);
                    menu.data("myInitialAttributeSource", obj.source);
                    return menu;
                }
            });
        });

        [
            {
                id: "mnuButton1Id",
                location: "categories",
                index: 0
            }, {
                id: "mnuButton2Id",
                location: "categories",
                index: 1
            }, {
                id: "mnuButton3Id",
                location: "categories",
                index: 2
            }, {
                id: "mnuButton4Id",
                location: "measures",
                index: 0
            }
        ].forEach(function (obj) {
            this.byId(obj.id).bindProperty("text", {
                parts: ["analyticsModel>config/chartOptions/initialAttributes"],
                formatter: function (element) {
                    if (element) {
                        var initialAttribute = element[obj.location][obj.index];
                        return that._formatTextAttributeForBinding(initialAttribute);
                    }
                }
            });
        }, this);

        this._initialChartSelect.bindItems("chartModel>/chartModelList", function (sId) {
            return new sap.ui.core.ListItem(sId, {
                key: "{chartModel>key}",
                text: "{chartModel>text}"
            });
        });
        
        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED,
            this._updateInitialChartList,
            this
        );
    };

    ChartsTabController.prototype._updateInitialChartList = function () {
        if (!this.getView().getBindingContext("analyticsModel")) {
            return;
        }
        var initialChartList = this.getView().getBindingContext("analyticsModel").getProperty("config/chartOptions");
        var initialChartModel = [];
        if (initialChartList) {
            for (var chart in initialChartList) {
                if (initialChartList.hasOwnProperty(chart) && initialChartList[chart].visible) {
                    var decode;

                    switch (chart) {
                        case "stacked":
                            decode = "MRI_PA_CFG_TITLE_CHART_TYPES_BAR_CHART";
                            break;
                        case "list":
                            decode = "MRI_PA_CFG_TITLE_CHART_TYPES_PATIENT_LIST";
                            break;
                        default:
                            decode = "";
                            break;
                    }
                    if (decode !== "") {
                        initialChartModel.push({
                            key: chart,
                            text: ConfigUtils.getText(decode)
                        });
                    }
                }
            }

            var oChartsModel = new JSONModel({
                chartModelList: initialChartModel
            });
            this.getView().setModel(oChartsModel, "chartModel");
        }
    };

    ChartsTabController.prototype._formatTextAttributeForBinding = function (initialAttribute) {
        var text = ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE");
        if (initialAttribute) {
            text = this._getNameFromSource(initialAttribute);
        }
        return text;
    };

    ChartsTabController.prototype._getNameFromSource = function (attributeSource) {
        var mriConfig = this.getView().getBindingContext("analyticsModel").getProperty("config");

        var oJsonWalk = ConfigUtils.getJsonWalkFunction(mriConfig.filtercards);
        var aAttributes = oJsonWalk("*.attributes");

        var name = "";
        aAttributes.forEach(function (attrbiuteGroupArray) {
            attrbiuteGroupArray.obj.forEach(function (attribute) {
                if (attribute.source === attributeSource) {
                    name = attribute.modelName;
                }
            });
        });
        return name;
    };


    ChartsTabController.prototype._getSelectedKey = function () {
        var key = null;
        var selectedItem = this._chartsList.getSelectedItem();
        if (selectedItem) {
            var selectedId = selectedItem.getId();
            key = this._getKeyFromId(selectedId);
        }
        return key;
    };

    ChartsTabController.prototype._getKeyFromId = function (elementId) {
        var key = null;
        if (elementId.indexOf("stackedId") > -1) {
            key = "stacked";
        } else if (elementId.indexOf("patientListId") > -1) {
            key = "list";
        }
        return key;
    };


    ChartsTabController.prototype.handleMenuButtonSelect = function (oEvent) {
        var path = this.getView().getBindingContext("analyticsModel").getPath() + oEvent.getSource().data("myInitialAttributeSource");

        this._handleMenuButtonSelect(oEvent.getSource(), path);
    };

    /**
     * Handles the initial attributes menu select - verifies that the x-axis are correctly chosen
     * @param {sap.ui.unified.MenuItem} selectedItem the menu item selected
     * @param {string}                  path         the path to the relevant attribute
     */
    ChartsTabController.prototype._handleMenuButtonSelect = function (selectedItem, path) {
        var buttonId = selectedItem.data("myButton");

        var valid = true;
        if (buttonId === "mnuButton3Id") {
            if (this.byId("mnuButton2Id").getText() === ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE")) {
                valid = false;
            }
        } else if (buttonId === "mnuButton2Id") {
            if (this.byId("mnuButton1Id").getText() === ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE")) {
                valid = false;
            }
        }

        if (!valid) {
            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_INITIAL_ATTRIBUTE_NOT_VALID_SELECTION");
            return;
        }
        var source = selectedItem.data("mySource");

        this.getView().getModel("analyticsModel").setProperty(path, source);

        this.byId(buttonId).setText(selectedItem.getText());

        var initAttribute = selectedItem.data("myInitialAttributeSource");
        this.byId(buttonId).data("myData", initAttribute);
    };

    /**
     * Handles the clearing of the initial attributes - from the x3 -> x1
     */
    ChartsTabController.prototype.onClearInitialXAxisAttributeSelection = function () {
        var model = this.getView().getModel("analyticsModel");
        ["mnuButton3Id", "mnuButton2Id", "mnuButton1Id"].some(function (id) {
            var menuButton = this.byId(id);
            if (menuButton.getText() !== ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE")) {
                menuButton.setText(ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE"));
                var path = this.getView().getBindingContext("analyticsModel").getPath() + "/config/chartOptions/initialAttributes/categories";

                var data = model.getProperty(path);
                data.splice(data.length - 1, 1);
                model.setProperty(path, data);

                return true;
            }
            return false;
        }, this);
    };

    ChartsTabController.prototype.onClearInitialYAxisAttributeSelection = function () {
        var model = this.getView().getModel("analyticsModel");
        ["mnuButton4Id"].some(function (id) {
            var menuButton = this.byId(id);
            if (menuButton.getText() !== ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE")) {
                menuButton.setText(ConfigUtils.getText("MRI_PA_CFG_BUTTON_CHOOSE_ATTRIBUTE"));
                var path = this.getView().getBindingContext("analyticsModel").getPath() + "/config/chartOptions/initialAttributes/measures";

                var data = model.getProperty(path);
                data.splice(data.length - 1, 1);
                model.setProperty(path, data);

                return true;
            }
            return false;
        }, this);
    };

    /**
     * Handler for the press event on the whole Toolbar inside the Panel header.
     * We listen to this event to make the panel expand when any part of the toolbar (that is not the Switch control)
     * is pressed, not only the expand arrow to the left.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ChartsTabController.prototype.onHeaderToolbarPress = function (oEvent) {
        if (oEvent.getParameter("srcControl").getMetadata().getName() !== "sap.m.Switch") {
            var oPanel = oEvent.getSource().getParent();
            oPanel.setExpanded(!oPanel.getExpanded());
        }
    };

    return ChartsTabController;
});
