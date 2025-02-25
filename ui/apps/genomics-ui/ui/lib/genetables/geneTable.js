jQuery.sap.declare("hc.hph.genomics.ui.lib.genetables.geneTable");
sap.ui.define([
    "jquery.sap.global",
    "sap/m/MessageToast",
    "sap/ui/commons/Button",
    "sap/ui/commons/Label",
    "sap/ui/table/Table",
    "hc/hph/core/ui/AjaxUtils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem",
    "hc/mri/pa/ui/lib/MenuButton",
    "hc/hph/genomics/ui/lib/genetables/alterationMatrixControlHeader"
], function (jQuery, MessageToast, Button, Label, Table, AjaxUtils, JSONModel, Menu, MenuItem, MenuButton, AltMatrixHeader) {
    "use strict";

    /**
     * Constructor for a new VbChart.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Variant Browser chart.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.VbChart
     */
    var GATable = sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.genetables.geneTable', {
        metadata: {
            properties: {
                sessionId: {
                    type: "string"
                },
                columnSelector: {
                    type: "boolean",
                    defaultValue: false
                },

                parameters: {
                    type: 'object',
                    defaultValue: {}
                },
                variantConfiguration: {
                    type: 'object',
                    defaultValue: {}
                }
            },
            aggregations: {
                _table: {
                    type: "sap.ui.table.Table",
                    multiple: false
                }
            }
        },
        renderer: function (oRm, oControl) {
            oRm.write("<div");
            oRm.writeControlData(oControl);
            oRm.writeClasses(oControl);
            oRm.write(">");
            oRm.renderControl(oControl.getAggregation("_table"));
            oRm.write("</div>");
        }
    });
    GATable.prototype.getTemplate = function (oColumn, oController) {
        var oTemplate;
        var bindingKey = "{" + oColumn.key + "}";
        switch (oColumn.control) {
            case "sap.m.Label":
                oTemplate = new sap.m.Label({ "text": bindingKey });
                break;
            case "sap.m.Text":
                oTemplate = new sap.m.Text({ "text": bindingKey });
                break;
            case "sap.m.Link":
                oTemplate = new sap.m.Link({
                    "text": bindingKey, press: function (oEvent) {
                        oController[oColumn.press](oEvent);
                    }
                });
                break;
            case "custom":
                oTemplate = oController[oColumn.controlName](oColumn, oController);
                break;
            default:
                oTemplate = new sap.m.Label({ "text": bindingKey });

        }
        return oTemplate;
    };

    GATable.prototype.getLabel = function (oColumnData, oColumn, oController) {
        var oLabel;
        switch (oColumnData.label.type) {
            case "custom":
                oLabel = oController[oColumnData.label.controlName](oColumnData, oColumn);
                break;
            case "multilabel":
                //add it to column
                var aNameList = [];
                if (oColumnData.prefixData.trim() !== "") {
                    aNameList = oColumnData.prefixData.trim().split(",");
                }
                var oLabelText = oController.getI18nModel().getResourceBundle().getText(oColumnData.display_name);
                aNameList.unshift(oLabelText);
                for (var i = 0; i < aNameList.length; i++) {
                    oColumn.addMultiLabel(new sap.m.Label({ text: aNameList[i] }));
                }
                break;
            case "altMatrix":
                var oAlt = new AltMatrixHeader({
                    height: "80px",
                    groupAttr: "name",
                    showSample: false,
                    showGroup: true,
                    matrixData: "{/cohorts}"
                });
                var oLabelText1 = oController.getI18nModel().getResourceBundle().getText(oColumnData.display_name);
                oColumn.addMultiLabel(new sap.m.Label({ text: oLabelText1 }));
                oColumn.addMultiLabel(oAlt);
        }
        return oLabel;
    };

    GATable.prototype.getTable = function () {
        return this._table;
    };

    GATable.prototype.getTableModel = function () {
        return this._table.getModel();
    };

    GATable.prototype.init = function () {
        var that = this;
        var gTable = new Table({ "selectionMode": "None" });
        this.setAggregation("_table", gTable);
        this._table = gTable;
        this.oTableModel = new JSONModel();
        this.setModel(this.oTableModel);
        //add toolbar with column button    
        if (this.getColumnSelector()) {
            if (!this._oColButton && !this.columnSelector) {
                this._oMenu = new Menu(this.getTable().getId() + "_Menu");//,{title:"{i18n>ADD_COLUMNS}"});
                this._oMenu.addItem(new MenuItem({
                    text: "{i18n>MRI_PA_PATIENT_LIST_RESTORE_DEFAULT}",
                    select: function (oEvent) {
                        that.onAddColumnSelectorPress(oEvent);
                    }
                }));

                var oMenuButton = new MenuButton({
                    text: "{i18n>MRI_PA_PATIENT_LIST_EDIT_COLUMNS}",
                    tooltip: "{i18n>MRI_PA_TOOLTIP_PATIENT_LIST_EDIT_COLUMNS}",
                    press: [function (oEvent) {
                        var oButton = oEvent.getSource();
                        this._oMenu.open(true, oButton, sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
                    }, this]
                });
                oMenuButton.addDependent(this._oMenu);
                // this.oColBtn=new sap.m.Button(this._table.getId()+"oColBtn",{text:"Choose Columns"});
                this.addToolBarItem(this.oColBtn);
                this.addToolBarItem(oMenuButton);
            }
        }
    };
    GATable.prototype.onAddColumnSelectorPress = function (oEvent) {
        //toggle check mark 
        var oSource = oEvent.getSource();
        if (oSource.getIcon() === "") {
            oSource.setIcon("sap-icon://accept");
            //call construct gene table again with new attributes 
        } else {
            oSource.setIcon("");
        }
    };

    GATable.prototype.setSessionId = function (sNewSessionId) {
        this.setProperty("sessionId", sNewSessionId, true);
    };

    GATable.prototype.addToolBarItem = function (oToolBarItem) {
        if (!this._table.getToolbar()) {
            this._table.setToolbar(new sap.m.Toolbar(this._table.getId() + "_tableToolbar"));
            this._table.getToolbar().addContent(new sap.m.ToolbarSpacer());
        }
        this._table.getToolbar().addContent(oToolBarItem);

    };
    GATable.prototype._generateSessionId = function () {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === "x" ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    };


    GATable.prototype.onAfterRendering = function (aArguments) {
        if (sap.ui.core.Control.prototype.onAfterRendering) {
            sap.ui.core.Control.prototype.onAfterRendering.apply(this, aArguments);
        }
    };
    /*
        
        VbChart.prototype._handleSearch = function (oEvent){};
        VbChart.prototype._updateSessionId = function () {};
        GATable.prototype._addToolbarButton = function () {
            var indexInToolbar = this._getIndexOfButtonsInToolbar();
            sap.ui.getCore().byId(this.getMriToolbar()).insertContent(this._searchVbBtn, indexInToolbar);
            sap.ui.getCore().byId(this.getMriToolbar()).insertContent(this._toolbarSeparator, indexInToolbar);
        };
    
        GATable.prototype._removeToolbarButton = function () {
            sap.ui.getCore().byId(this.getMriToolbar()).removeContent(this._searchVbBtn);
            sap.ui.getCore().byId(this.getMriToolbar()).removeContent(this._toolbarSeparator);
        };
    
        GATable.prototype.onAfterRendering = function () {
            var $this = this.getDomRef();
            var that = this;
    
            sap.ui.core.ResizeHandler.register($this, jQuery.proxy(function () {
                // relocate attribute selection buttons after resize
                that._updateLocationsModel();
                that._resizeChart();
            }, this));
        };
        VbChart.prototype.exit = function () {};
    */


    return GATable;
});