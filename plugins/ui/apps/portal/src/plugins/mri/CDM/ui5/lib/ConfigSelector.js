sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "sap/ui/core/Item",
    "sap/m/Page",
    "sap/m/Toolbar",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/List",
    "sap/m/Select"
], function (jQuery, Control, Item, Page, Toolbar, Button, Label, List, Select) {

    var ConfigSelection = Control.extend("hc.hph.cdw.config.ui.lib.ConfigSelector", {
        metadata: {
            properties: {
                selectedDMKey: { type: "string" },
                selectedConfigKey: { type: "string" },
                dataModelVisible: { type: "boolean", defaultValue: true },
                dataModelLabel: { type: "string" },
                leftButtonLabel: { type: "string" },
                rightButtonLabel: { type: "string" },
                leftButtonTooltip: { type: "string" },
                rightButtonTooltip: { type: "string" },
                leftButtonIcon: { type: "string" },
                rightButtonIcon: { type: "string" },
                noConfigText: { type: "string" }
            },
            aggregations: {
                controlPage: { type: "sap.m.Page", multiple: false, visibility: "hidden" },
                dataModelItems: { type: "sap.ui.core.Item", multiple: true, visibility: "public" },
                configItems: { type: "sap.m.ListItemBase", multiple: true, visibility: "public" }
            },
            events: {
                onSelectedConfigChanged: {},
                onLeftButtonPress: {},
                onRightButtonPress: {},
                onConfigPress: {}

            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div style='width:100%'");
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses(oControl);
            oRenderManager.write(">");
            oRenderManager.renderControl(oControl.getAggregation("controlPage"));
            oRenderManager.write("</div>");
        },
        init: function () {

            var that = this;
            this._controlPage = new Page({ showHeader: false, showSubHeader: true });

            this._dataModelToolbar = new Toolbar();
            this._dataModelLabel = new Label();
            this._dataModelToolbar.addContent(this._dataModelLabel);

            this.dataModelSelect = new Select({
                width: "200px",
                change: function (oEvent) { that._onSelectedConfigChanged(oEvent); }
            });

            this._dataModelToolbar.addContent(this.dataModelSelect);
            this._controlPage.setSubHeader(this._dataModelToolbar);

            this._buttonToolbar = new Toolbar();
            this._leftButton = new Button({
                width: "50%",
                press: function (oEvent) {
                    that.fireEvent("onLeftButtonPress");
                }
            });
            this._rightButton = new Button({
                width: "50%",
                press: function (oEvent) {
                    that.fireEvent("onRightButtonPress");
                }
            });
            this._buttonToolbar.addContent(this._leftButton);
            this._buttonToolbar.addContent(this._rightButton);
            this._controlPage.addContent(this._buttonToolbar);

            this.configList = new List({
                noDataText: "{i18n>HPH_PAT_CFG_NO_CONFIGS_FOUND_TEXT}",
                includeItemInSelection: true,
                mode: "SingleSelectMaster",
                itemPress: function (oEvent) {
                    that._configItemPressed(oEvent);
                    that.fireOnConfigPress({
                        srcControl: oEvent.getParameters().srcControl
                    });
                },
                updateFinished: function (oEvent) {
                    that._configListUpdateFinished();
                }
            });

            this.configList.addStyleClass("sapMxConfigSelectorList");

            this._controlPage.addContent(this.configList);

            this.setAggregation("controlPage", this._controlPage);
        },



        /*
        Bind Method Overrides
        */
        _callMethodInManagedObject: function (sFunctionName, sAggregationName) {
            var aArgs = Array.prototype.slice.call(arguments);

            if (sAggregationName === "dataModelItems") {
                var mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') return x.replace("dataModelItems", "items"); else return x; });

                // Find is there another way to obtain the model name
                this._dataModelItemsModelName = mArgs[2].model;

                return this.dataModelSelect[sFunctionName].apply(this.dataModelSelect, mArgs.slice(1));
            } else if (sAggregationName === "configItems") {
                var cArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') return x.replace("configItems", "items"); else return x; });

                // Find is there another way to obtain the model name
                this._configItemsModelName = cArgs[2].model;

                return this.configList[sFunctionName].apply(this.configList, cArgs.slice(1));
            } else {
                // apply to this control
                return sap.ui.base.ManagedObject.prototype[sFunctionName].apply(this, aArgs.slice(1));
            }
        },

        bindAggregation: function () {
            var args = Array.prototype.slice.call(arguments);
            // propagate the bind aggregation function to list
            this._callMethodInManagedObject.apply(this, ["bindAggregation"].concat(args));
            return this;
        },

        _callPropertiesInManagedObject: function (sFunctionName, sAggregationName) {
            var aArgs = Array.prototype.slice.call(arguments);
            var mArgs;
            if (sAggregationName === "dataModelLabel") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("dataModelLabel", "text"); } else { return x; } });
                return this._dataModelLabel[sFunctionName].apply(this._dataModelLabel, mArgs.slice(1));
            } else if (sAggregationName === "dataModelVisible") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("dataModelVisible", "visible"); } else { return x; } });
                return this._dataModelLabel[sFunctionName].apply(this._dataModelLabel, mArgs.slice(1));
            } else if (sAggregationName === "leftButtonLabel") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("leftButtonLabel", "text"); } else { return x; } });
                return this._leftButton[sFunctionName].apply(this._leftButton, mArgs.slice(1));
            } else if (sAggregationName === "rightButtonLabel") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("rightButtonLabel", "text"); } else { return x; } });
                return this._rightButton[sFunctionName].apply(this._rightButton, mArgs.slice(1));
            } else if (sAggregationName === "leftButtonTooltip") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("leftButtonTooltip", "tooltip"); } else { return x; } });
                return this._leftButton[sFunctionName].apply(this._leftButton, mArgs.slice(1));
            } else if (sAggregationName === "rightButtonTooltip") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("rightButtonTooltip", "tooltip"); } else { return x; } });
                return this._rightButton[sFunctionName].apply(this._rightButton, mArgs.slice(1));
            } else if (sAggregationName === "leftButtonIcon") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("leftButtonIcon", "icon"); } else { return x; } });
                return this._leftButton[sFunctionName].apply(this._leftButton, mArgs.slice(1));
            } else if (sAggregationName === "rightButtonIcon") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("rightButtonIcon", "icon"); } else { return x; } });
                return this._rightButton[sFunctionName].apply(this._rightButton, mArgs.slice(1));
            } else if (sAggregationName === "noConfigText") {
                mArgs = aArgs.map(function (x) { if (typeof x.replace === 'function') { return x.replace("noConfigText", "noDataText"); } else { return x; } });
                return this.configList[sFunctionName].apply(this.configList, mArgs.slice(1));
            } else {
                // apply to this control
                return sap.ui.base.ManagedObject.prototype[sFunctionName].apply(this, aArgs.slice(1));
            }
        },

        bindProperty: function () {
            var args = Array.prototype.slice.call(arguments);
            // propagate the bind aggregation function to list
            this._callPropertiesInManagedObject.apply(this, ["bindProperty"].concat(args));
            return this;
        },

        /*
        Set Property Overrides
        */

        setDataModelLabel: function (dataModelLabel) {
            this._dataModelLabel.setText(dataModelLabel);
            this.dataModelLabel = dataModelLabel;
        },

        setDataModelVisible: function (dataModelVisible) {
            this.getAggregation("controlPage").setShowSubHeader(dataModelVisible);
            this.dataModelVisible = dataModelVisible;
        },

        setLeftButtonLabel: function (leftButtonLabel) {
            this._leftButton.setText(leftButtonLabel);
            this.leftButtonLabel = leftButtonLabel;
        },

        setRightButtonLabel: function (rightButtonLabel) {
            this._rightButton.setText(rightButtonLabel);
            this.rightButtonLabel = rightButtonLabel;
        },

        setLeftButtonTooltip: function (leftButtonTooltip) {
            this._leftButton.setTooltip(leftButtonTooltip);
            this.leftButtonTooltip = leftButtonTooltip;
        },

        setRightButtonTooltip: function (rightButtonTooltip) {
            this._rightButton.setTooltip(rightButtonTooltip);
            this.rightButtonTooltip = rightButtonTooltip;
        },

        setLeftButtonIcon: function (leftButtonIcon) {
            this._leftButton.setIcon(leftButtonIcon);
            this.leftButtonIcon = leftButtonIcon;
        },

        setRightButtonIcon: function (rightButtonIcon) {
            this._rightButton.setIcon(rightButtonIcon);
            this.rightButtonIcon = rightButtonIcon;
        },

        //Binding instead of manual update?
        setSelectedDMKey: function (selectedDMKey) {
            this.dataModelSelect.setSelectedKey(selectedDMKey);
            this.selectedDMKey = selectedDMKey;

            if (selectedDMKey) {
                var modelName = this.dataModelSelect.getBindingInfo("items").model;
                var bindingPath = this.dataModelSelect.getBindingInfo("items").path;
                var bindingContext = modelName + ">" + bindingPath + "/" + selectedDMKey;
                this.configList.bindContext(bindingContext);
            }
        },

        _configListUpdateFinished: function (oEvent) {
            var that = this;
            var configKey = this.getProperty("selectedConfigKey");
            if (!configKey) {
                var firstItem = this.configList.getItems()[0];

                if (firstItem) {
                    this.setProperty("selectedConfigKey", firstItem.getBindingContext(this._configItemsModelName).getPath());
                    this.configList.setSelectedItem(firstItem, true);
                    this.fireOnConfigPress({
                        srcControl: firstItem
                    });
                }

            } else {
                var selectedItem;
                this.configList.getItems().forEach(function (listItem) {
                    if (listItem.getBindingContext(that._configItemsModelName).getPath() === configKey) {
                        selectedItem = listItem;
                    }
                });
                if (selectedItem) {
                    this.configList.setSelectedItem(selectedItem, true);
                }
            }
        },

        _configItemPressed: function (oEvent) {
            this.setProperty("selectedConfigKey", oEvent.getParameters().srcControl.getBindingContext(this._configItemsModelName).getPath());
        },

        _onSelectedConfigChanged: function (oEvent) {
            var sDmConfigId = oEvent.getParameter("selectedItem").getKey();
            this.setSelectedDMKey(sDmConfigId);
        }

    });

    return ConfigSelection;
});
