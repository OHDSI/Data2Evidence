sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Select",
    "sap/m/ComboBox",
    "sap/m/SegmentedButton",
    "sap/m/SegmentedButtonItem",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "hc/hph/cdw/config/ui/lib/ConfigModelsData",
], function (jQuery, Control, Label, Input, Select, ComboBox, SegmentedButton, SegmentedButtonItem, BackendLinker, Filter, FilterOperator, ConfigModelsData) {
    "use strict";

    var modes = {
        BASIC: "BASIC",
        ADVANCE: "ADVANCE",
        NONE: "NONE"
    };

    /**
     * Constructor for a new SmartFilter
     * @extends sap.ui.core.Control
     */
    return Control.extend("hc.hph.cdw.config.ui.lib.SmartFilter", {
        metadata: {
            properties: {
                mode: { type: "string", defaultValue: modes.ADVANCE },
                enabled: { type: "boolean", defaultValue: true }
            },
            aggregations: {
                placeholderLabel: {
                    type: "sap.m.Label",
                    multiple: false
                },
                filterLabel: {
                    type: "sap.m.Label",
                    multiple: false
                },
                advanceInput: {
                    type: "sap.m.Input",
                    multiple: false
                },
                basicSelect: {
                    type: "sap.m.ComboBox",
                    multiple: false
                },
                placeholderSelect: {
                    type: "sap.m.ComboBox",
                    multiple: false
                },
                toggleButton: {
                    type: "sap.m.SegmentedButton",
                    multiple: false
                }
            },
            events: {
                "onToggle": {},
                "onPlaceholderChange": {}
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses(oControl);
            oRenderManager.write(">");
            oRenderManager.write("<div>");
            oRenderManager.renderControl(oControl.getPlaceholderLabel());
            oRenderManager.renderControl(oControl.getPlaceholderSelect());
            oRenderManager.renderControl(oControl.getFilterLabel());
            oRenderManager.renderControl(oControl.getToggleButton());
            oRenderManager.write("</div>");
            oRenderManager.write("<div>");
            oRenderManager.renderControl(oControl.getAdvanceInput());
            oRenderManager.renderControl(oControl.getBasicSelect());
            oRenderManager.write("</div>");
            oRenderManager.write("</div>");
        },
        init: function () {
            var that = this;
        
            this.setAggregation("placeholderLabel", new Label({
                text: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_PHOLDER_CHOOSE_PLACEHOLDER_LABEL}",
                tooltip: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_PHOLDER_CHOOSE_PLACEHOLDER_LABEL}"
            }).addStyleClass("sapMXSmartFilterLabel"));
            this.setAggregation("filterLabel", new Label({
                text: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_FILTER_EXPRESSION}",
                tooltip: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_FILTER_EXPRESSION}"
            }).addStyleClass("sapMXSmartFilterLabel"));

            this._advanceInput = new Input({
                visible: false,
                value: "{configEditorModel>defaultFilter/value}",
                tooltip: "{configEditorModel>defaultFilter/value}",
                width: "100%",
                change: function (oControlEvent) {
                    that._basicSelect.setSelectedKey("");
                }
            });
            this._advanceInput.addStyleClass("sapMxConfigProp");
            this.setAggregation("advanceInput", this._advanceInput);

            this._basicSelect = new ComboBox({
                selectedKey: "{configEditorModel>defaultFilterKey/value}",
                visible: true,
                width: "100%",
                change: function (oControlEvent) {
                    var tableMapping = ConfigModelsData.prototype.getFETableMapping(
                        oControlEvent.getSource().getModel("configEditorModel").getData());
                    var listItem = this.getSelectedItem();
                    var selectedKey = listItem.getKey();
                    var table = listItem.data().table;
                    var filter = listItem.data().filter;
                    var text = BackendLinker.buildFilter(table, filter, selectedKey, tableMapping);
                    that._advanceInput.setValue(text);
                }
            });
            this.setAggregation("basicSelect", this._basicSelect);

            this.getBasicSelect()
                .bindItems(
                    'configEditorModel>/preloadedSuggestions/filterCardFilter', function (sId, oContext) {

                        var listItem = new sap.ui.core.ListItem(sId, {
                            key: '{configEditorModel>value}',
                            text: '{configEditorModel>value}'
                        });
                        listItem.addCustomData(new sap.ui.core.CustomData({
                            key: 'filter',
                            value: '{configEditorModel>pholder/filterOn}'
                        })).addCustomData(new sap.ui.core.CustomData({
                            key: 'table',
                            value: '{configEditorModel>pholder/table}'
                        }));

                        return listItem;
                    });
        
            this._placeholderSelect = new ComboBox({
                selectedKey: "{configEditorModel>defaultPlaceholder/value}",
                visible: true,
                width: "100%",
                change: function (oControlEvent) {
                    var placeholder = oControlEvent.getSource().getSelectedKey();
                    that.getBasicSelect()
                        .getBinding("items")
                        .filter(new Filter({
                            path: 'pholder/table',
                            operator: FilterOperator.EQ,
                            value1: placeholder
                        }));
                    that.fireOnPlaceholderChange();
                }
            }).bindItems(
                'configEditorModel>/tableTypePlaceholderMap/dimTables', function (sId, oContext) {
                    var listItem = new sap.ui.core.ListItem(sId, {
                        key: '{configEditorModel>placeholder}',
                        text: '{configEditorModel>placeholder}'
                    });
                    return listItem;
                });
            this.setAggregation("placeholderSelect", this._placeholderSelect);

            var _basicButton = new SegmentedButtonItem({
                key: modes.BASIC,
                text: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_SMARTFILTER_BASIC}",
                press: function (oEvent) {
                    that.setMode(modes.BASIC);
                }
            });
            var _advanceButton = new SegmentedButtonItem({
                key: modes.ADVANCE,
                text: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_SMARTFILTER_ADVANCE}",
                press: function (oEvent) {
                    that.setMode(modes.ADVANCE);
                }
            });

            this._toggleButton = new SegmentedButton({
                items: [_basicButton, _advanceButton],
                selectedKey: that.getProperty("mode")
            }).addStyleClass("sapMXSmartFilterButton");
            /*
             if(that.getProperty("mode") === modes.ADVANCE)
                _advanceButton.firePress();
               else
                _basicButton.firePress();*/

            this.setAggregation("toggleButton", this._toggleButton);

            this._basicCtrls = [this._basicSelect];
            this._advancedCtrls = [this._advanceInput];
            this._otherCtrls = [this.getFilterLabel(), this._toggleButton];

            this.reset();
        },
        reset: function () {

            var basicKey = this.getBasicSelect().getSelectedKey();
            var advancedText = this.getAdvanceInput().getValue();

            if (basicKey === "" && advancedText === "") {
                this.setProperty("mode", modes.BASIC);
            } else if (basicKey === "") {
                this.setProperty("mode", modes.ADVANCE);
            } else {
                this.setProperty("mode", modes.BASIC);
                this.getBasicSelect().fireChange();
            }

            var _mode = this.getProperty("mode");
            var _toggleButton = this.getToggleButton();

            _toggleButton.setSelectedKey(this.getProperty("mode"));
            _toggleButton.getItems().map(function (listItem) {
                if (listItem.getKey() === _mode)
                    listItem.firePress();
            });

        },
        setMode: function (mode) {
            this._toggleControls(mode);
            this._toggleButton.setSelectedKey(mode);
        },
        _toggleControls: function (mode) {
            this._basicCtrls.forEach(function (ctrl) {
                ctrl.setVisible(modes.BASIC === mode);
            });
            this._advancedCtrls.forEach(function (ctrl) {
                ctrl.setVisible(modes.ADVANCE === mode);
            });
            this._otherCtrls.forEach(function (ctrl) {
                ctrl.setVisible(modes.ADVANCE === mode || modes.BASIC === mode);
            });
            this.fireOnToggle({ selectedMode: mode });
        },
        firePlaceholderChange: function() {
            this._placeholderSelect.fireChange();
        }
    });

});
